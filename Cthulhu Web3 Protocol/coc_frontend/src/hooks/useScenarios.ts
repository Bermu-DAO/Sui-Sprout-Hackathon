/**
 * useScenarios.ts
 * 從鏈上查詢所有公開的 Scenario Session 物件
 * StructType: coc::session::GameSession
 *
 * 如果鏈上還沒有任何 Scenario，自動 fallback 到 demo 清單（含一個「逃離實驗室」示範劇本）
 */
import { useState, useEffect, useCallback } from 'react';
import { useCurrentClient } from '@mysten/dapp-kit-react';
import { COC_PACKAGE_ID, COC_MARKETPLACE_ID } from '../contracts/protocol';

export interface Scenario {
  id: string;
  title: string;
  kp: string;
  maxPlayers: number;
  currentPlayers: number;
  entryFee: string;
  deposit: string;
  status: 'Open' | 'Active' | 'Settled' | 'Locked';
}

// ─── Demo fallback（鏈上尚無資料時顯示） ───────────────────────────────────

const DEMO_SCENARIOS: Scenario[] = [
  {
    id: '0xESCAPE_LAB',
    title: 'Escape the Lab',
    kp: '0xSystem_Overseer',
    maxPlayers: 4,
    currentPlayers: 1,
    entryFee: '0.5 SUI',
    deposit: '1 SUI',
    status: 'Open',
  },
  {
    id: '0x123_MISKATONIC',
    title: 'Miskatonic Incident',
    kp: '0xArkham_Keeper',
    maxPlayers: 4,
    currentPlayers: 4,
    entryFee: '0.5 SUI',
    deposit: '1 SUI',
    status: 'Locked',
  },
  {
    id: '0x456_DUNWICH',
    title: 'The Dunwich Horror',
    kp: '0xMiskatonic_U',
    maxPlayers: 6,
    currentPlayers: 6,
    entryFee: '2 SUI',
    deposit: '5 SUI',
    status: 'Locked',
  },
];

// ─── SuiClient 輕量包裝型別（避免漢寫 any） ───────────────────────────────────────

interface SuiObjectResponse {
  data?: {
    objectId?: string;
    content?: {
      dataType?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fields?: Record<string, any>;
    };
  };
}

interface SuiClientCompat {
  getObject(params: { id: string; options: { showContent: boolean } }): Promise<SuiObjectResponse>;
  queryEvents(params: {
    query: { MoveEventType: string };
    limit: number;
    order: string;
  }): Promise<{ data: SuiEventCompat[] }>;
}

interface SuiEventCompat {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedJson?: Record<string, any>;
  id?: { txDigest?: string };
}

// ─── useScenarios Hook ────────────────────────────────────────────────────────

export function useScenarios() {
  const client = useCurrentClient();
  const [scenarios, setScenarios] = useState<Scenario[]>(DEMO_SCENARIOS);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromChain, setIsFromChain] = useState(false);

  const fetch = useCallback(async () => {
    // 如果 Marketplace 物件 ID 未設定，直接用 demo 資料
    if (!COC_MARKETPLACE_ID || COC_MARKETPLACE_ID.includes('TODO')) {
      setScenarios(DEMO_SCENARIOS);
      return;
    }

    setIsLoading(true);
    try {
      const suiClient = client as unknown as SuiClientCompat;
      const marketRes = await suiClient.getObject({
        id: COC_MARKETPLACE_ID,
        options: { showContent: true },
      });

      const f = marketRes?.data?.content?.fields;
      if (!f) {
        setScenarios(DEMO_SCENARIOS);
        return;
      }

      // sessions 欄位是一個 vector<GameSession> 或 Table 的 id 列表
      const rawSessions: Record<string, unknown>[] = Array.isArray(f['sessions'])
        ? (f['sessions'] as Record<string, unknown>[])
        : Array.isArray(f['open_sessions'])
          ? (f['open_sessions'] as Record<string, unknown>[])
          : [];

      if (rawSessions.length === 0) {
        // 鏈上暫無劇本，維持 demo 資料
        setScenarios(DEMO_SCENARIOS);
        return;
      }

      // 如果有真實資料，逐一解析
      const parsed: Scenario[] = rawSessions
        .map((item) => {
          const sf = (item as Record<string, unknown> & { fields?: Record<string, unknown> })?.fields ?? item as Record<string, unknown>;
          const getNum = (key: string, def: number) => Number((sf[key] as unknown) ?? def);
          const getStr = (key: string, def: string) => String((sf[key] as unknown) ?? def);
          return {
            id: getStr('id', '0x???'),
            title: getStr('title', getStr('name', 'Unknown Scenario')),
            kp: getStr('kp', getStr('creator', '0x???')),
            maxPlayers: getNum('max_players', 4),
            currentPlayers: getNum('current_players', 0),
            entryFee: `${getNum('entry_fee', 0) / 1e9} SUI`,
            deposit: `${getNum('deposit', 0) / 1e9} SUI`,
            status: (['Open', 'Active', 'Settled', 'Locked'].includes(getStr('status', ''))
              ? getStr('status', 'Open')
              : getNum('current_players', 0) >= getNum('max_players', 4) ? 'Locked' : 'Open') as Scenario['status'],
          };
        })
        .filter(Boolean);

      if (parsed.length > 0) {
        setScenarios(parsed);
        setIsFromChain(true);
      } else {
        setScenarios(DEMO_SCENARIOS);
      }
    } catch (e) {
      console.warn('useScenarios: failed to fetch from chain, using demo data.', e);
      setScenarios(DEMO_SCENARIOS);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  // ── 同時用 StructType 掃描全域公開的 GameSession（作為備援） ──────────────
  const fetchByStructType = useCallback(async () => {
    if (isFromChain) return; // 已從 Marketplace 拿到資料就不重複查
    try {
      const suiClient = client as unknown as SuiClientCompat;
      const res = await suiClient.queryEvents({
        query: { MoveEventType: `${COC_PACKAGE_ID}::session::SessionCreated` },
        limit: 20,
        order: 'descending',
      });
      const events: SuiEventCompat[] = res?.data ?? [];
      if (events.length === 0) return;

      const fromEvents: Scenario[] = events.map((ev) => ({
        id: ev.parsedJson?.['session_id'] ?? ev.id?.txDigest ?? '0x???',
        title: ev.parsedJson?.['title'] ?? 'Mystery Scenario',
        kp: ev.parsedJson?.['kp'] ?? '0x???',
        maxPlayers: Number(ev.parsedJson?.['max_players'] ?? 4),
        currentPlayers: 0,
        entryFee: `${Number(ev.parsedJson?.['entry_fee'] ?? 0) / 1e9} SUI`,
        deposit: `${Number(ev.parsedJson?.['deposit'] ?? 0) / 1e9} SUI`,
        status: 'Open' as const,
      }));

      if (fromEvents.length > 0) {
        setScenarios(fromEvents);
        setIsFromChain(true);
      }
    } catch {
      // 靜默失敗
    }
  }, [client, isFromChain]);

  useEffect(() => {
    fetch()
      .then(() => fetchByStructType())
      .catch(() => {});
  }, [fetch, fetchByStructType]);

  return { scenarios, isLoading, isFromChain, refetch: fetch };
}
