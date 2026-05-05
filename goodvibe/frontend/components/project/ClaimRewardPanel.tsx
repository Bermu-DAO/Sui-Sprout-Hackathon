'use client';

import React, { useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';
import { Button } from '../ui/Button';
import { useStableLayerClient } from '@/hooks/stablelayer/useStableLayerClient';
import { extractSignAndExecuteDigest, isFailedSignAndExecuteResult } from '@/lib/coin-publisher/suiTransactionResult';
import { txLoading, txSuccess, txError } from '@/utils/txToast';
import { SUI_NETWORK, STABLE_COIN_TYPE } from '@/config/sui';

const DECIMALS = 6;

function formatAmount(raw: bigint, decimals = DECIMALS): string {
  if (raw === 0n) return '0';
  const scale = 10n ** BigInt(decimals);
  const whole = raw / scale;
  const frac = raw % scale;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  const s = fracStr ? `${whole}.${fracStr}` : whole.toString();
  const num = Number(s);
  if (!Number.isFinite(num)) return s;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function coinLabel(coinType: string): string {
  const parts = coinType.split('::');
  return parts[parts.length - 1] ?? coinType;
}

interface StableLayerClientApi {
  getClaimRewardUsdbAmount(params: { stableCoinType: string; sender: string }): Promise<bigint>;
  buildClaimTx(params: { tx: Transaction; stableCoinType: string; sender: string }): Promise<unknown>;
}

interface ClaimRewardPanelProps {
  projectId?: string;
  projectCapId?: string;
  coinType?: string;
}

export const ClaimRewardPanel: React.FC<ClaimRewardPanelProps> = ({ coinType }) => {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const deployNetwork = SUI_NETWORK as 'mainnet' | 'testnet';
  const { getClient, isInitializing } = useStableLayerClient(account?.address ?? null, deployNetwork);
  const [isClaiming, setIsClaiming] = useState(false);

  const stableCoinType = coinType || STABLE_COIN_TYPE;
  const rewardLabel = deployNetwork === 'testnet' ? 'Mock USDB' : 'USDB';

  const { data: claimableAmount, isFetching: previewLoading } = useQuery({
    queryKey: ['claim-reward-preview', deployNetwork, account?.address, stableCoinType],
    queryFn: async () => {
      const client = await getClient();
      if (!client || !account?.address) return 0n;
      return (client as unknown as StableLayerClientApi).getClaimRewardUsdbAmount({
        stableCoinType, sender: account.address,
      });
    },
    enabled: !!account?.address && !!stableCoinType,
    staleTime: 20_000,
    retry: 1,
  });

  const handleClaim = async () => {
    if (!account?.address) return;
    setIsClaiming(true);
    txLoading('Claiming yield...');
    try {
      const client = await getClient();
      if (!client) throw new Error('Failed to initialize SDK');
      const tx = new Transaction();
      await (client as unknown as StableLayerClientApi).buildClaimTx({ tx, stableCoinType, sender: account.address });
      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (isFailedSignAndExecuteResult(result)) throw new Error('Transaction failed on-chain');
      const digest = extractSignAndExecuteDigest(result);
      if (digest) {
        txSuccess(digest, 'Yield claimed');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['claim-reward-preview'] }),
          queryClient.invalidateQueries({ queryKey: ['usdcBalance'] }),
          queryClient.invalidateQueries({ queryKey: ['project'] }),
          queryClient.invalidateQueries({ queryKey: ['projectDetail'] }),
          queryClient.invalidateQueries({ queryKey: ['manageable-coins'] }),
        ]);
      } else {
        txError('No transaction digest');
      }
    } catch (e) {
      txError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-serif font-bold text-ink-900">Claim Yield</h4>
        <span className="text-[10px] font-mono text-ink-400 bg-canvas-subtle rounded-full px-2.5 py-0.5">
          {coinLabel(stableCoinType)}
        </span>
      </div>

      <div className="bg-canvas-subtle rounded-2xl px-5 py-4 flex items-baseline justify-between">
        <span className="text-xs text-ink-500 uppercase tracking-widest">Claimable</span>
        <div className="text-right">
          <span className="text-2xl font-serif font-bold text-ink-900">
            {!account?.address ? '--' : previewLoading || isInitializing ? '...'
              : claimableAmount !== undefined ? formatAmount(claimableAmount) : '--'}
          </span>
          <span className="text-xs text-ink-500 ml-1.5">{rewardLabel}</span>
        </div>
      </div>

      <Button onClick={handleClaim}
        disabled={isClaiming || !account?.address || !claimableAmount || claimableAmount <= 0n}
        isLoading={isClaiming} fullWidth
        className="rounded-xl py-3 font-bold shadow-lg shadow-ink-900/10 hover:shadow-ink-900/20 transition-all">
        {isClaiming ? 'Claiming...' : 'Claim Yield'}
      </Button>

      <p className="text-xs text-ink-400 text-center">
        Yield is generated by {coinLabel(stableCoinType)} holders who support this project.
      </p>
    </div>
  );
};
