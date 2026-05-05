'use client';

import React from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Transaction } from '@mysten/sui/transactions';
import { Button } from '@/components/ui/Button';
import { useManageableCoins, type ManageableCoin } from '@/hooks/coin-publisher/useManageableCoins';
import { useStableLayerClient } from '@/hooks/stablelayer/useStableLayerClient';
import { extractSignAndExecuteDigest, isFailedSignAndExecuteResult } from '@/lib/coin-publisher/suiTransactionResult';
import { txLoading, txSuccess, txError } from '@/utils/txToast';
import { SUI_NETWORK } from '@/config/sui';

interface StableLayerClientApi {
  buildClaimTx(params: { tx: Transaction; stableCoinType: string; sender: string }): Promise<unknown>;
  getClaimRewardUsdbAmount(params: { stableCoinType: string; sender: string }): Promise<bigint>;
}

const DECIMALS = 6;

function formatYield(raw: bigint): string {
  if (raw === 0n) return '0';
  const scale = 10n ** 6n;
  const whole = raw / scale;
  const frac = raw % scale;
  const fracStr = frac.toString().padStart(6, '0').replace(/0+$/, '');
  const s = fracStr ? `${whole}.${fracStr}` : whole.toString();
  const num = Number(s);
  if (!Number.isFinite(num)) return s;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

interface WithdrawPanelProps { className?: string }

export const WithdrawPanel: React.FC<WithdrawPanelProps> = ({ className = '' }) => {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const deployNetwork = SUI_NETWORK as 'mainnet' | 'testnet';
  const { getClient } = useStableLayerClient(account?.address ?? null, deployNetwork);
  const { data: coins = [], isLoading } = useManageableCoins(account?.address ?? null, deployNetwork);

  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [isBusy, setIsBusy] = React.useState(false);
  const activeCoin = coins[selectedIdx] ?? coins[0] ?? null;
  const rewardLabel = deployNetwork === 'testnet' ? 'Mock USDB' : 'USDB';

  // Fetch claimable yield for ALL coins (for total display)
  const { data: allClaimable = [] } = useQuery({
    queryKey: ['claim-preview-all', deployNetwork, account?.address, coins.map(c => c.stableType).join(',')],
    queryFn: async () => {
      const client = await getClient();
      if (!client || !account?.address || coins.length === 0) return [];
      const results: { stableType: string; amount: bigint }[] = [];
      for (const coin of coins) {
        try {
          const amount = await (client as unknown as StableLayerClientApi).getClaimRewardUsdbAmount({
            stableCoinType: coin.stableType, sender: account.address,
          });
          results.push({ stableType: coin.stableType, amount });
        } catch {
          results.push({ stableType: coin.stableType, amount: 0n });
        }
      }
      return results;
    },
    enabled: !!account?.address && coins.length > 0,
    staleTime: 15_000,
    retry: 1,
  });

  const totalClaimable = allClaimable.reduce((sum, c) => sum + c.amount, 0n);
  const activeClaimable = allClaimable.find(c => c.stableType === activeCoin?.stableType)?.amount ?? 0n;
  const hasYield = activeClaimable > 0n;

  const handleClaimYield = async (coin: ManageableCoin) => {
    if (!account?.address) return;
    setIsBusy(true);
    txLoading('Claiming yield...');
    try {
      const client = await getClient();
      if (!client) throw new Error('Failed to initialize SDK');
      const tx = new Transaction();
      await (client as unknown as StableLayerClientApi).buildClaimTx({ tx, stableCoinType: coin.stableType, sender: account.address });
      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (isFailedSignAndExecuteResult(result)) throw new Error('Transaction failed');
      const digest = extractSignAndExecuteDigest(result);
      if (digest) {
        txSuccess(digest, 'Yield claimed');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['manageable-coins'] }),
          queryClient.invalidateQueries({ queryKey: ['claim-preview-all'] }),
          queryClient.invalidateQueries({ queryKey: ['claim-reward-preview'] }),
          queryClient.invalidateQueries({ queryKey: ['usdcBalance'] }),
          queryClient.invalidateQueries({ queryKey: ['project'] }),
          queryClient.invalidateQueries({ queryKey: ['ownedProjects'] }),
        ]);
      } else { txError('No transaction digest returned'); }
    } catch (e) { txError(e instanceof Error ? e.message : String(e)); }
    finally { setIsBusy(false); }
  };

  const handleClaimAll = async () => {
    if (!account?.address) return;
    setIsBusy(true);
    txLoading('Claiming all yield...');
    try {
      const client = await getClient();
      if (!client) throw new Error('Failed to initialize SDK');
      const api = client as unknown as StableLayerClientApi;

      const withYield = allClaimable.filter(c => c.amount > 0n);
      if (withYield.length === 0) { txError('No yield available to claim.'); return; }

      const tx = new Transaction();
      for (const c of withYield) {
        await api.buildClaimTx({ tx, stableCoinType: c.stableType, sender: account.address });
      }
      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (isFailedSignAndExecuteResult(result)) throw new Error('Transaction failed');
      const digest = extractSignAndExecuteDigest(result);
      if (digest) {
        txSuccess(digest, `Yield claimed for ${withYield.length} coin${withYield.length > 1 ? 's' : ''}`);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['manageable-coins'] }),
          queryClient.invalidateQueries({ queryKey: ['claim-preview-all'] }),
          queryClient.invalidateQueries({ queryKey: ['claim-reward-preview'] }),
          queryClient.invalidateQueries({ queryKey: ['usdcBalance'] }),
          queryClient.invalidateQueries({ queryKey: ['project'] }),
          queryClient.invalidateQueries({ queryKey: ['ownedProjects'] }),
        ]);
      } else { txError('No transaction digest returned'); }
    } catch (e) { txError(e instanceof Error ? e.message : String(e)); }
    finally { setIsBusy(false); }
  };

  return (
    <div className={`rounded-3xl p-8 flex flex-col ${className}`}>
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-2xl font-serif font-medium text-ink-900 leading-tight">
          Claim Yield
        </h2>
        {coins.length > 0 && totalClaimable > 0n && (
          <div className="text-right">
            <span className="text-xl font-serif font-bold text-ink-900">{formatYield(totalClaimable)}</span>
            <span className="text-xs text-ink-400 ml-1">{rewardLabel}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="h-20 bg-white/20 rounded-xl animate-pulse" />
      ) : !account ? (
        <p className="text-sm text-ink-500 py-4">Connect wallet to view</p>
      ) : coins.length === 0 ? (
        <div className="bg-white/40 rounded-xl p-5 text-center">
          <p className="text-sm text-ink-500">No branded stablecoins yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="w-full appearance-none bg-white/40 hover:bg-white/70 border border-ink-300/10 rounded-xl px-4 py-2.5 pr-10 text-sm font-serif text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900/10 transition-colors cursor-pointer"
            >
              {coins.map((c, i) => (
                <option key={c.id} value={i}>{c.name} ({c.symbol})</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {activeCoin && (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" className="flex-1"
                onClick={() => handleClaimYield(activeCoin)}
                disabled={isBusy || !hasYield}
                isLoading={isBusy}>
                Claim Yield
              </Button>
              {coins.length > 1 && (
                <Button variant="outline" size="sm" className="flex-1"
                  onClick={() => handleClaimAll()}
                  disabled={isBusy || totalClaimable <= 0n}>
                  Claim All
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
