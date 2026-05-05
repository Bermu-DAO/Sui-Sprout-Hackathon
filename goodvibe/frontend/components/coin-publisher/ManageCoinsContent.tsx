'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { useManageableCoins, type ManageableCoin } from '@/hooks/coin-publisher/useManageableCoins';
import { useStableLayerClient } from '@/hooks/stablelayer/useStableLayerClient';
import {
  extractSignAndExecuteDigest,
  isFailedSignAndExecuteResult,
} from '@/lib/coin-publisher/suiTransactionResult';
import { waitForWalletNetwork } from '@/lib/coin-publisher/waitForWalletNetwork';
import {
  STABLE_REGISTRY_MAINNET,
  STABLE_REGISTRY_TESTNET,
} from '@/lib/coin-publisher/constants';
import { txLoading, txSuccess, txError } from '@/utils/txToast';

interface StableLayerClientApi {
  getClaimRewardUsdbAmount(params: {
    stableCoinType: string;
    sender: string;
  }): Promise<bigint>;
  buildSetMaxSupplyTx(params: {
    tx: Transaction;
    registry: string;
    factoryCapId: string;
    maxSupply: bigint;
    stableCoinType: string;
    usdCoinType: string;
    sender: string;
  }): void;
  buildClaimTx(params: { tx: Transaction; stableCoinType: string; sender: string }): Promise<unknown>;
}

function truncateId(id: string, head = 6, tail = 4): string {
  if (!id || id.length <= head + tail) return id;
  return `${id.slice(0, head)}...${id.slice(-tail)}`;
}

function getSuiscanTxUrl(digest: string, network: 'mainnet' | 'testnet'): string {
  return `https://suiscan.xyz/${network}/tx/${digest}`;
}

const DECIMALS = 6;

function formatSupply(raw: string, decimals = DECIMALS): string {
  const n = BigInt(raw || '0');
  if (n === 0n) return '0';
  const scale = 10n ** BigInt(decimals);
  const whole = n / scale;
  const frac = n % scale;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  const s = fracStr ? `${whole}.${fracStr}` : whole.toString();
  const num = Number(s);
  if (!Number.isFinite(num)) return s;
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 });
}

function rawToDecimalString(raw: string, decimals = DECIMALS): string {
  const n = BigInt(raw || '0');
  if (n === 0n) return '0';
  const scale = 10n ** BigInt(decimals);
  const whole = n / scale;
  const frac = n % scale;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

function decimalStringToRaw(input: string, decimals = DECIMALS): bigint {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '0') return 0n;
  const [wholePart, fracPart = ''] = trimmed.split('.');
  const paddedFrac = fracPart.slice(0, decimals).padEnd(decimals, '0');
  return BigInt(wholePart || '0') * 10n ** BigInt(decimals) + BigInt(paddedFrac);
}

function formatUsdbAmount(baseUnits: bigint, decimals = DECIMALS): string {
  if (baseUnits === 0n) return '0.00';
  const neg = baseUnits < 0n;
  const n = neg ? -baseUnits : baseUnits;
  const scale = 10n ** BigInt(decimals);
  const whole = n / scale;
  const frac = n % scale;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  const s = fracStr ? `${whole}.${fracStr}` : whole.toString();
  const num = Number(s);
  if (!Number.isFinite(num)) return s;
  return (neg ? -num : num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function normalizeError(msg: string): string {
  if (/reject|rejected|cancelled|canceled|denied/i.test(msg)) return 'Transaction was cancelled.';
  if (/vec_map/.test(msg) && /get_idx/.test(msg)) return 'Nothing to claim yet.';
  return msg;
}

function CoinCard({
  coin,
  deployNetwork,
  sender,
}: {
  coin: ManageableCoin;
  deployNetwork: 'mainnet' | 'testnet';
  sender: string;
}) {
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const { getClient, initError, isInitializing } = useStableLayerClient(sender, deployNetwork);
  const rewardLabel = deployNetwork === 'testnet' ? 'Mock USDB' : 'USDB';
  const [maxSupplyInput, setMaxSupplyInput] = useState(() => rawToDecimalString(coin.maxSupply));
  const [isUpdating, setIsUpdating] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const claimPreviewEnabled = coin.totalSupply !== '0' && !!sender;

  const { data: claimableUsdb, isFetching: claimableLoading, isError: claimablePreviewError } = useQuery({
    queryKey: ['claim-reward-usdb', deployNetwork, sender, coin.stableType],
    queryFn: async () => {
      const client = await getClient();
      if (!client) throw new Error('SDK unavailable');
      return (client as unknown as StableLayerClientApi).getClaimRewardUsdbAmount({
        stableCoinType: coin.stableType,
        sender,
      });
    },
    enabled: claimPreviewEnabled,
    staleTime: 20_000,
    retry: 1,
  });

  const handleUpdateSupply = async () => {
    if (!/^\d*\.?\d*$/.test(maxSupplyInput)) { txError('Invalid number format'); return; }
    const newSupplyRaw = decimalStringToRaw(maxSupplyInput);
    if (newSupplyRaw < BigInt(coin.totalSupply)) { txError(`Max supply must be >= current supply (${formatSupply(coin.totalSupply)})`); return; }
    if (newSupplyRaw === BigInt(coin.maxSupply)) { txError('No change to max supply'); return; }
    setIsUpdating(true);
    txLoading();
    try {
      dAppKit.switchNetwork(deployNetwork);
      const netOk = await waitForWalletNetwork(dAppKit, deployNetwork);
      if (!netOk) throw new Error(`Switch wallet to ${deployNetwork} and try again.`);
      const client = await getClient();
      if (!client) throw new Error('Failed to initialize SDK');
      const tx = new Transaction();
      (client as unknown as StableLayerClientApi).buildSetMaxSupplyTx({
        tx, registry: coin.registry, factoryCapId: coin.factoryCapId,
        maxSupply: newSupplyRaw, stableCoinType: coin.stableType, usdCoinType: coin.usdType, sender,
      });
      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (isFailedSignAndExecuteResult(result)) throw new Error('Transaction failed on-chain');
      const digest = extractSignAndExecuteDigest(result);
      if (digest) {
        setMaxSupplyInput(rawToDecimalString(String(newSupplyRaw)));
        txSuccess(digest, 'Max supply updated');
        await queryClient.invalidateQueries({ queryKey: ['manageable-coins', sender, deployNetwork] });
      }
    } catch (e) {
      txError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClaimRewards = async () => {
    setIsClaiming(true);
    txLoading();
    try {
      dAppKit.switchNetwork(deployNetwork);
      const netOk = await waitForWalletNetwork(dAppKit, deployNetwork);
      if (!netOk) throw new Error(`Switch wallet to ${deployNetwork} and try again.`);
      const client = await getClient();
      if (!client) throw new Error('Failed to initialize SDK');
      const tx = new Transaction();
      await (client as unknown as StableLayerClientApi).buildClaimTx({ tx, stableCoinType: coin.stableType, sender });
      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (isFailedSignAndExecuteResult(result)) throw new Error('Transaction failed on-chain');
      const digest = extractSignAndExecuteDigest(result);
      if (digest) {
        txSuccess(digest, 'Yield claimed');
        await queryClient.invalidateQueries({ queryKey: ['manageable-coins', sender, deployNetwork] });
        await queryClient.invalidateQueries({ queryKey: ['claim-reward-usdb', deployNetwork, sender, coin.stableType] });
      }
    } catch (e) {
      txError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="bg-white/40 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {coin.iconUrl ? (
          <Image
            src={coin.iconUrl}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="h-12 w-12 shrink-0 rounded-full object-cover border border-ink-300/20"
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-full bg-ink-900 flex items-center justify-center text-white text-xl font-serif font-bold">
            {coin.symbol[0] ?? '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif font-bold text-xl text-ink-900 truncate">{coin.name}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              coin.network === 'mainnet'
                ? 'bg-ink-900 text-white'
                : 'bg-canvas-sage text-ink-900'
            }`}>
              {coin.network}
            </span>
          </div>
          <p className="text-sm text-ink-500 mt-0.5">
            {coin.symbol} &middot; <span className="font-mono text-xs">{truncateId(coin.factoryCapId)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Supply Management */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Supply</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-bold text-ink-900">{formatSupply(coin.totalSupply)}</span>
              <span className="text-ink-300">/</span>
              <span className="text-lg text-ink-500">
                {coin.maxSupply === '0' ? 'Unlimited' : formatSupply(coin.maxSupply)}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-500 uppercase tracking-widest mb-2">Update Max Supply</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={maxSupplyInput}
                onChange={(e) => {
                  if (/^\d*\.?\d*$/.test(e.target.value)) setMaxSupplyInput(e.target.value);
                }}
                className="flex-1 rounded-lg border border-ink-300/40 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink-900 focus:ring-offset-1"
                placeholder="e.g. 1000000"
              />
              <Button variant="secondary" size="sm" onClick={handleUpdateSupply} disabled={isUpdating}>
                {isUpdating ? '...' : 'Update'}
              </Button>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Claimable Yield</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-serif font-bold text-ink-900">
                {claimableLoading || (claimPreviewEnabled && isInitializing)
                  ? '...'
                  : claimablePreviewError || claimableUsdb === undefined
                    ? '--'
                    : formatUsdbAmount(claimableUsdb)}
              </span>
              <span className="text-sm font-medium text-ink-500">{rewardLabel}</span>
            </div>
            {initError && claimPreviewEnabled && (
              <p className="text-xs text-red-600 mt-1">{initError.message}</p>
            )}
          </div>
          <div>
            <Button
              variant="primary"
              size="md"
              onClick={handleClaimRewards}
              disabled={isClaiming || coin.totalSupply === '0'}
            >
              {isClaiming ? 'Claiming...' : 'Claim Yield'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManageCoinsContent({
  deployNetwork,
}: {
  deployNetwork: 'mainnet' | 'testnet';
}) {
  const account = useCurrentAccount();
  const { data: coins = [], isLoading, error } = useManageableCoins(account?.address ?? null, deployNetwork);
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);

  const activeCoin = coins.find((c) => c.id === selectedCoinId) || coins[0];
  const registryConfigured =
    deployNetwork === 'mainnet'
      ? Boolean(STABLE_REGISTRY_MAINNET.trim())
      : Boolean(STABLE_REGISTRY_TESTNET.trim());

  if (!account) {
    return (
      <div className="bg-canvas-subtle rounded-3xl p-8 lg:p-12 text-center">
        <h2 className="mb-2 text-2xl font-serif font-bold text-ink-900">Connect Wallet</h2>
        <p className="text-ink-500 max-w-sm mx-auto">
          Connect your Sui wallet to manage your brand stablecoins.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-canvas-subtle rounded-3xl p-8 text-center text-ink-500">
        Loading your brand stablecoins...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-canvas-rose rounded-3xl p-8 text-center text-red-600">
        Failed to load coins: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {coins.length === 0 && (
        <div className="bg-canvas-subtle rounded-3xl p-8 text-center text-ink-500">
          <p>No brand stablecoins found on {deployNetwork}.</p>
          {!registryConfigured && (
            <p className="mt-3 text-sm text-ink-700">
              Stable registry is not configured for this network.
            </p>
          )}
        </div>
      )}

      {coins.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-2">
            Select Coin
          </label>
          <select
            value={activeCoin?.id || ''}
            onChange={(e) => setSelectedCoinId(e.target.value)}
            className="w-full rounded-lg border border-ink-300/40 bg-white px-4 py-3 text-sm font-serif focus:outline-none focus:ring-2 focus:ring-ink-900"
          >
            {coins.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
      )}

      {activeCoin && (
        <CoinCard
          key={activeCoin.id}
          coin={activeCoin}
          deployNetwork={deployNetwork}
          sender={account.address}
        />
      )}
    </div>
  );
}
