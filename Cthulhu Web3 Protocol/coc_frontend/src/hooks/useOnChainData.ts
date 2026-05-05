/**
 * useOnChainData.ts
 * 從鏈上查詢當前錢包持有的 Investigator 角色卡與 CoreProfile
 * 使用 useCurrentClient() + useEffect 手動查詢（dapp-kit-react v2 API）
 */

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { COC_PACKAGE_ID } from '../contracts/protocol';

// ─── 型別定義 ───────────────────────────────────────────────────────────────

export interface InvestigatorFields {
  name: string;
  str: number;
  con: number;
  siz: number;
  dex: number;
  app: number;
  int: number;
  pow: number;
  edu: number;
  luck: number;
}

export interface InvestigatorObject {
  objectId: string;
  fields: InvestigatorFields;
}

export interface CoreProfileData {
  objectId: string;
  owner: string;
  playerGamesPlayed: number;
  playerReputation: number;
  kpGamesHosted: number;
  kpReputation: number;
  escapeCount: number;
  history: Array<{
    investigator_name: string;
    status: string;
    obituary: string;
    timestamp: string;
  }>;
}

// ─── useMyInvestigators ────────────────────────────────────────────────────

/** 查詢當前帳號擁有的全部 Investigator 角色卡 */
export function useMyInvestigators() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [investigators, setInvestigators] = useState<InvestigatorObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetch = useCallback(async () => {
    if (!account?.address) {
      setInvestigators([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${COC_PACKAGE_ID}::investigator::Investigator`,
        },
        options: { showContent: true },
      });

      const parsed: InvestigatorObject[] = res.data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => {
          const content = item.data?.content;
          if (!content || content.dataType !== 'moveObject') return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const f = content.fields as any;
          return {
            objectId: item.data?.objectId ?? '',
            fields: {
              name: f.name as string,
              str: Number(f.str),
              con: Number(f.con),
              siz: Number(f.siz),
              dex: Number(f.dex),
              app: Number(f.app),
              int: Number(f.int),
              pow: Number(f.pow),
              edu: Number(f.edu),
              luck: Number(f.luck),
            },
          };
        })
        .filter(Boolean) as InvestigatorObject[];

      setInvestigators(parsed);
    } catch (e) {
      console.error('useMyInvestigators error:', e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [account?.address, client]);

  useEffect(() => { fetch(); }, [fetch]);

  return { investigators, isLoading, isError, refetch: fetch };
}

// ─── useCoreProfile ────────────────────────────────────────────────────────

/** 查詢當前帳號擁有的 CoreProfile */
export function useCoreProfile() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [profile, setProfile] = useState<CoreProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const fetch = useCallback(async () => {
    if (!account?.address) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${COC_PACKAGE_ID}::profile::CoreProfile`,
        },
        options: { showContent: true },
      });

      const item = res.data[0];
      const content = item?.data?.content;
      if (!content || content.dataType !== 'moveObject') {
        setProfile(null);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = content.fields as any;
      setProfile({
        objectId: item?.data?.objectId ?? '',
        owner: f.owner as string,
        playerGamesPlayed: Number(f.player_games_played ?? 0),
        playerReputation: Number(f.player_reputation ?? 100),
        kpGamesHosted: Number(f.kp_games_hosted ?? 0),
        kpReputation: Number(f.kp_reputation ?? 100),
        escapeCount: Number(f.escape_count ?? 0),
        history: Array.isArray(f.history) ? f.history : [],
      });
    } catch (e) {
      console.error('useCoreProfile error:', e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [account?.address, client]);

  useEffect(() => { fetch(); }, [fetch]);

  return { profile, isLoading, isError, refetch: fetch };
}

// ─── useSettleSessionWithDApp ───────────────────────────────────────────────

export type SettleStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * 劇本結算 Hook
 * 呼叫 profile::record_escape 將逃脫結果（角色名、結局、墓誌銘）寫回鏈上 CoreProfile
 *
 * Move 函式簽名（預計）：
 *   profile::record_escape(&mut CoreProfile, investigator_name: String, status: String, obituary: String, ctx)
 */
export function useSettleSessionWithDApp() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const [settleStatus, setSettleStatus] = useState<SettleStatus>('idle');
  const [settleError, setSettleError] = useState('');

  const settle = async (params: {
    profileObjectId: string;   // CoreProfile 的 objectId（必填）
    investigatorName: string;  // 角色名字
    outcomeStatus: string;     // "escaped" | "died_inside" | "boss_defeated" 等
    obituary: string;          // 一句話墓誌銘
  }) => {
    if (!account?.address || !params.profileObjectId) return;
    setSettleStatus('pending');
    setSettleError('');

    try {
      const tx = new Transaction();
      // profile::record_escape(&mut CoreProfile, ctx)
      tx.moveCall({
        target: `${COC_PACKAGE_ID}::profile::record_escape`,
        arguments: [
          tx.object(params.profileObjectId),        // &mut CoreProfile
        ],
      });
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      setSettleStatus('success');
    } catch (e: unknown) {
      console.error('useSettleSessionWithDApp error:', e);
      setSettleError(e instanceof Error ? e.message : String(e));
      setSettleStatus('error');
    }
  };

  return { settle, settleStatus, settleError };
}
