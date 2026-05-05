'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import type { CreateBrandFormData } from '@/lib/coin-publisher/validateCreateBrandForm';
import CreateBrandForm from './CreateBrandForm';
import {
  COIN_REGISTRY,
  MAINNET_PUBLISH_DEPS,
  MAINNET_USDC_TYPE,
  STABLE_REGISTRY_MAINNET,
  STABLE_REGISTRY_TESTNET,
  STABLE_VAULT_FARM_ENTITY_TYPE,
  TESTNET_PUBLISH_DEPS,
  TESTNET_FARM_ENTITY_TYPE,
  TESTNET_USDC_TYPE,
} from '@/lib/coin-publisher/constants';
import { deriveBrandIdentifiersFromSymbol } from '@/lib/coin-publisher/brandIdentifiers';
import {
  BRAND_USDC_BYTECODE_MAINNET,
  BRAND_USDC_BYTECODE_TESTNET,
  TEMPLATE_CONSTANTS,
} from '@/lib/coin-publisher/bytecode';
import { findBrandProofObjectId } from '@/lib/coin-publisher/findBrandProofObject';
import {
  extractSignAndExecuteDigest,
  isFailedSignAndExecuteResult,
  unwrapCoreTransaction,
} from '@/lib/coin-publisher/suiTransactionResult';
import { waitForWalletNetwork } from '@/lib/coin-publisher/waitForWalletNetwork';
import type { SuiClientTypes } from '@mysten/sui/client';
import { Button } from '@/components/ui/Button';
import { TxResult } from '@/components/ui/TxResult';
import { bcs, fromBase64 } from '@mysten/bcs';

type BytecodeTemplate = {
  update_constants: (
    bytecode: Uint8Array,
    newValue: Uint8Array,
    expectedValue: Uint8Array,
    expectedType: string,
  ) => Uint8Array;
};

async function loadBytecodeTemplate(): Promise<BytecodeTemplate> {
  const mod = await import('@mysten/move-bytecode-template');
  await mod.default({ module_or_path: '/wasm/move_bytecode_template_bg.wasm' });
  return { update_constants: mod.update_constants };
}

const GRPC_URLS: Record<string, string> = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
};

function decimalToRawSupply(input: string, decimals = TEMPLATE_CONSTANTS.DECIMALS): bigint {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '0') return 0n;
  const [wholePart, fracPart = ''] = trimmed.split('.');
  const paddedFrac = fracPart.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(wholePart || '0') * 10n ** BigInt(decimals) + BigInt(paddedFrac);
}

interface CreateBrandFlowProps {
  deployNetwork: 'mainnet' | 'testnet';
  /** Called when coin is successfully created — parent can navigate back to form */
  onSuccess?: () => void;
}

export default function CreateBrandFlow({ deployNetwork, onSuccess }: CreateBrandFlowProps) {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const [step, setStep] = useState<'form' | 'tx1' | 'tx2' | 'done' | 'error'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coinType, setCoinType] = useState<string | null>(null);
  const [txDigests, setTxDigests] = useState<{ purpose: string; digest: string }[]>([]);
  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [template, setTemplate] = useState<BytecodeTemplate | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadBytecodeTemplate()
      .then(setTemplate)
      .then(() => setIsWasmLoaded(true))
      .catch((err) => {
        console.error(err);
        setError('Compiler failed to load. Please refresh and try again.');
      });
  }, []);

  const compileContract = (data: CreateBrandFormData) => {
    if (!isWasmLoaded || !template) throw new Error('WASM not loaded');

    const baseBytecode =
      deployNetwork === 'mainnet' ? BRAND_USDC_BYTECODE_MAINNET : BRAND_USDC_BYTECODE_TESTNET;
    const publishDeps =
      deployNetwork === 'mainnet' ? MAINNET_PUBLISH_DEPS : TESTNET_PUBLISH_DEPS;
    let bytecode: Uint8Array = fromBase64(baseBytecode);
    const derived = deriveBrandIdentifiersFromSymbol(data.symbol);
    if (!derived.ok) throw new Error(derived.error);
    const { moduleName, structName } = derived;

    const { update_constants } = template;
    bytecode = update_constants(
      bytecode,
      bcs.string().serialize(data.symbol).toBytes(),
      bcs.string().serialize(TEMPLATE_CONSTANTS.SYMBOL).toBytes(),
      'Vector(U8)',
    );
    bytecode = update_constants(
      bytecode,
      bcs.string().serialize(data.name).toBytes(),
      bcs.string().serialize(TEMPLATE_CONSTANTS.NAME).toBytes(),
      'Vector(U8)',
    );
    bytecode = update_constants(
      bytecode,
      bcs.string().serialize(data.description).toBytes(),
      bcs.string().serialize(TEMPLATE_CONSTANTS.DESCRIPTION).toBytes(),
      'Vector(U8)',
    );
    bytecode = update_constants(
      bytecode,
      bcs.string().serialize(data.iconUrl).toBytes(),
      bcs.string().serialize(TEMPLATE_CONSTANTS.ICON_URL).toBytes(),
      'Vector(U8)',
    );

    return { modules: [Array.from(bytecode)], dependencies: publishDeps, moduleName, structName };
  };

  const handleSubmit = async (data: CreateBrandFormData) => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }
    const stableRegistry =
      deployNetwork === 'testnet' ? STABLE_REGISTRY_TESTNET : STABLE_REGISTRY_MAINNET;
    if (!stableRegistry) {
      setError('Stable registry is not configured for this network');
      return;
    }
    if (!isWasmLoaded) {
      setError('Compiler is initializing... please wait');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      dAppKit.switchNetwork(deployNetwork);
      const networkOk = await waitForWalletNetwork(dAppKit, deployNetwork);
      if (!networkOk) {
        const w = dAppKit.stores.$currentNetwork.get();
        throw new Error(
          `Wallet network (${w}) does not match (${deployNetwork}). Switch to ${deployNetwork} in your wallet.`,
        );
      }

      const txClient = new SuiGrpcClient({
        network: deployNetwork,
        baseUrl: GRPC_URLS[deployNetwork] ?? GRPC_URLS.mainnet,
      });

      setStep('tx1');
      const { modules, dependencies, moduleName, structName } = compileContract(data);

      const tx = new Transaction();
      const [upgradeCap] = tx.publish({ modules, dependencies });
      tx.transferObjects([upgradeCap], account.address);
      tx.setSender(account.address);
      tx.setGasBudget(deployNetwork === 'mainnet' ? 500_000_000 : 200_000_000);

      const sim = await txClient.simulateTransaction({
        transaction: tx,
        include: { effects: true },
      });
      if (sim.$kind === 'FailedTransaction') {
        throw new Error(`Publish simulation failed: ${JSON.stringify(sim.FailedTransaction.status)}`);
      }
      if (!sim.Transaction.status.success) {
        throw new Error(`Publish simulation failed: ${JSON.stringify(sim.Transaction.status)}`);
      }

      await new Promise((r) => setTimeout(r, 0));
      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      const digest1 = extractSignAndExecuteDigest(result);
      if (!digest1) throw new Error('Could not get digest from Tx1');

      await txClient.waitForTransaction({ digest: digest1 });
      const txResult = await txClient.getTransaction({
        digest: digest1,
        include: { effects: true, objectTypes: true },
      });
      const txData = unwrapCoreTransaction(txResult);
      if (!txData || !txData.status.success) {
        throw new Error('Publish transaction failed');
      }

      const published = txData.effects?.changedObjects?.find(
        (o) => o.outputState === 'PackageWrite',
      );
      const pkgId = published?.objectId;
      if (!pkgId) throw new Error('Could not get package ID from Tx1');

      if (!txData.effects || !txData.objectTypes) {
        throw new Error('Could not load publish transaction effects');
      }

      const proofObjectId = findBrandProofObjectId(
        txData as SuiClientTypes.Transaction<{ effects: true; objectTypes: true }>,
        pkgId,
        moduleName,
        structName,
        account.address,
      );
      if (!proofObjectId) throw new Error('Could not find brand proof object after publish');

      setCoinType(`${pkgId}::${moduleName}::${structName}`);
      setStep('tx2');

      const [usdType, farmEntityType] =
        deployNetwork === 'mainnet'
          ? [MAINNET_USDC_TYPE, STABLE_VAULT_FARM_ENTITY_TYPE]
          : [TESTNET_USDC_TYPE, TESTNET_FARM_ENTITY_TYPE];

      const tx2 = new Transaction();
      tx2.setSender(account.address);
      tx2.setGasBudget(200_000_000);
      tx2.moveCall({
        target: `${pkgId}::${moduleName}::create_stable`,
        arguments: [
          tx2.object(COIN_REGISTRY),
          tx2.object(stableRegistry),
          tx2.object(proofObjectId),
          tx2.pure.u64(decimalToRawSupply(data.maxSupply)),
        ],
        typeArguments: [usdType, farmEntityType],
      });

      await new Promise((r) => setTimeout(r, 0));
      const result2 = await dAppKit.signAndExecuteTransaction({ transaction: tx2 });
      if (isFailedSignAndExecuteResult(result2)) {
        throw new Error('Register transaction failed on-chain');
      }
      const digest2 = extractSignAndExecuteDigest(result2);
      if (!digest2) throw new Error('Could not get digest from Tx2');

      await txClient.waitForTransaction({ digest: digest2 });
      setTxDigests([
        { purpose: 'Publish contract', digest: digest1 },
        { purpose: 'Register coin + enable mint', digest: digest2 },
      ]);
      setStep('done');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[CreateBrandFlow] error:', e);
      const isRejection = /reject|rejected|cancelled|canceled|denied/i.test(message);
      setError(
        isRejection
          ? 'Transaction was cancelled. Please try again when ready.'
          : message,
      );
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="bg-canvas-subtle rounded-3xl p-8 lg:p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-canvas-sand">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-700">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-serif font-bold text-ink-900">Connect Wallet</h2>
        <p className="text-ink-500 max-w-sm mx-auto">
          Connect your Sui wallet to start creating your own brand stablecoin.
        </p>
      </div>
    );
  }

  if (step === 'done') {
    const resetForm = () => { setStep('form'); setCoinType(null); setTxDigests([]); };
    return (
      <TxResult
        status="success"
        title="Coin Published"
        description="Your brand stablecoin is live and ready to be used by projects."
        details={coinType ? [{ label: 'Coin Name', value: coinType!.split('::').pop()! }] : []}
        digests={txDigests.map(({ purpose, digest }) => ({ label: purpose, digest }))}
        primaryAction={{
          label: onSuccess ? 'Continue to Project' : 'Done',
          onClick: onSuccess ? () => onSuccess() : resetForm,
        }}
      />
    );
  }

  if (step === 'error') {
    return (
      <TxResult
        status="error"
        title="Something Went Wrong"
        errorMessage={error ?? undefined}
        primaryAction={{
          label: 'Try Again',
          onClick: () => { setStep('form'); setError(null); },
        }}
      />
    );
  }

  return (
    <div>
      {(step === 'tx1' || step === 'tx2') && (
        <div className="mb-8 rounded-xl border border-ink-300/20 bg-canvas-sage/50 p-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-ink-900" />
            <p className="text-sm font-serif font-medium text-ink-900">
              {step === 'tx1' && 'Step 1/2: Publishing contract...'}
              {step === 'tx2' && 'Step 2/2: Registering coin + enabling mint...'}
            </p>
          </div>
          <p className="mt-1 pl-5 text-xs text-ink-500">Approve in your wallet.</p>
        </div>
      )}
      <CreateBrandForm onSubmit={handleSubmit} isLoading={isLoading} disabled={isLoading || !isWasmLoaded} />
    </div>
  );
}
