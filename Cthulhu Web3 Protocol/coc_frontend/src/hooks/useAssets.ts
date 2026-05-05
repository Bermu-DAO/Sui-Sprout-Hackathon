/**
 * useAssets.ts
 * 從鏈上查詢 USDC / TAX_COIN 餘額，以及持有的 Invoice 彩券物件
 */
import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import {
  USDC_TYPE,
  TAX_COIN_TYPE,
  INVOICE_TYPE,
} from '../contracts/invoice';

export interface InvoiceFields {
  id: { id: string };
  invoice_number: number;
  protocol: string;
  amount: number;
  timestamp: string;
}

export interface InvoiceObject {
  objectId: string;
  fields: InvoiceFields;
}

/** 查詢 USDC 餘額（合計所有持有的 USDC coin 物件） */
export function useUsdcBalance() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [balance, setBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!account?.address) { setBalance(0n); return; }
    setIsLoading(true);
    try {
      const res = await client.getBalance({
        owner: account.address,
        coinType: USDC_TYPE,
      });
      setBalance(BigInt(res.totalBalance ?? 0));
    } catch (e) {
      console.error('useUsdcBalance error:', e);
      // getBalance may fail if coin type not found → treat as 0
      setBalance(0n);
    } finally {
      setIsLoading(false);
    }
  }, [account, client]);

  useEffect(() => { fetch(); }, [fetch]);
  return { balance, isLoading, refetch: fetch };
}

/** 查詢 TAX_COIN 餘額 */
export function useTaxBalance() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [balance, setBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!account?.address) { setBalance(0n); return; }
    setIsLoading(true);
    try {
      const res = await client.getBalance({
        owner: account.address,
        coinType: TAX_COIN_TYPE,
      });
      setBalance(BigInt(res.totalBalance ?? 0));
    } catch {
      setBalance(0n);
    } finally {
      setIsLoading(false);
    }
  }, [account, client]);

  useEffect(() => { fetch(); }, [fetch]);
  return { balance, isLoading, refetch: fetch };
}

/** 查詢持有的 Invoice 彩券物件 */
export function useMyInvoices() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [invoices, setInvoices] = useState<InvoiceObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!account?.address) { setInvoices([]); return; }
    setIsLoading(true);
    try {
      const res = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: INVOICE_TYPE },
        options: { showContent: true },
      });

      const parsed: InvoiceObject[] = (res.data ?? [])
        .map((item) => {
          const content = item.data?.content;
          if (!content || content.dataType !== 'moveObject') return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const f = content.fields as Record<string, any>;
          return {
            objectId: item.data?.objectId ?? '',
            fields: {
              id: f.id,
              invoice_number: Number(f.invoice_number ?? 0),
              protocol: f.protocol as string,
              amount: Number(f.amount ?? 0),
              timestamp: f.timestamp?.toString() ?? '',
            },
          };
        })
        .filter(Boolean) as InvoiceObject[];

      setInvoices(parsed);
    } catch (e) {
      console.error('useMyInvoices error:', e);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [account, client]);

  useEffect(() => { fetch(); }, [fetch]);
  return { invoices, isLoading, refetch: fetch };
}

/** 查詢 Invoice System 的抽獎池資訊 */
export function useLotteryPool(systemObjectId: string) {
  const client = useCurrentClient();
  const [pool, setPool] = useState<{ poolSize: bigint; winnerIndex: number | null } | null>(null);

  const fetch = useCallback(async () => {
    if (!systemObjectId || systemObjectId.includes('TODO')) return;
    try {
      const res = await client.getObject({
        id: systemObjectId,
        options: { showContent: true },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const f = res.data?.content?.dataType === 'moveObject' ? (res.data.content.fields as Record<string, any>) : null;
      if (!f) return;
      setPool({
        poolSize: BigInt(f.count ?? 0),
        winnerIndex: f.winner != null ? Number(f.winner) : null,
      });
    } catch (e) {
      console.error('useLotteryPool error:', e);
    }
  }, [systemObjectId, client]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetch(); }, [fetch]);
  return { pool, refetch: fetch };
}

/** 取出目前錢包持有的第一顆 USDC Coin Object ID（交易用） */
export function useFirstUsdcCoin() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [coinId, setCoinId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!account?.address) { setCoinId(null); return; }
    try {
      const res = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `0x2::coin::Coin<${USDC_TYPE}>` },
        options: { showContent: false },
      });
      const first = res.data?.[0]?.data?.objectId;
      setCoinId(first ?? null);
    } catch {
      setCoinId(null);
    }
  }, [account, client]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetch(); }, [fetch]);
  return { coinId, refetch: fetch };
}

/** 取出目前錢包持有的第一顆 TAX_COIN Object ID（交易用） */
export function useFirstTaxCoin() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [coinId, setCoinId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!account?.address) { setCoinId(null); return; }
    try {
      const res = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `0x2::coin::Coin<${TAX_COIN_TYPE}>` },
        options: { showContent: false },
      });
      const first = res.data?.[0]?.data?.objectId;
      setCoinId(first ?? null);
    } catch {
      setCoinId(null);
    }
  }, [account, client]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetch(); }, [fetch]);
  return { coinId, refetch: fetch };
}

/**
 * 取出目前錢包持有的「所有」USDC Coin Object ID 列表。
 * 用於 buyTax 交易前先做 mergeCoins，避免單一 Coin Object 餘額不足問題。
 */
export function useAllUsdcCoins() {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [coinIds, setCoinIds] = useState<string[]>([]);

  const fetch = useCallback(async () => {
    if (!account?.address) { setCoinIds([]); return; }
    try {
      const res = await client.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `0x2::coin::Coin<${USDC_TYPE}>` },
        options: { showContent: false },
      });
      setCoinIds((res.data ?? []).map(d => d.data?.objectId ?? '').filter(Boolean));
    } catch {
      setCoinIds([]);
    }
  }, [account, client]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetch(); }, [fetch]);
  return { coinIds, refetch: fetch };
}

/** 查詢 SUI 實時幣價 (SupraOracles Testnet) */
export function useSuiPrice() {
  const client = useCurrentClient();
  const [price, setPrice] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    try {
      // Supra Oracle Holder: 0x87ef65b543ecb192e89d1e6afeaf38feeb13c3a20c20ce413b29a9cbfbebd570
      // Feeds Table ID: 0x9b7deae1f9bb636bd83624f9f16e6b01e91ede3f9c88c07c695717c43ebac92a
      // Asset Index 90: SUI/USD
      const res = await client.getDynamicFieldObject({
        parentId: '0x9b7deae1f9bb636bd83624f9f16e6b01e91ede3f9c88c07c695717c43ebac92a',
        name: { type: 'u32', value: 90 },
      });

      const content = res.data?.content;
      if (content?.dataType === 'moveObject') {
        const f = content.fields as Record<string, unknown>;
        // Supra 的 Table Entry 結構通常是在 value 欄位裡
        const valueField = f.value as { fields: { value: string; decimal: string } } | undefined;
        if (valueField && valueField.fields) {
          const val = BigInt(valueField.fields.value);
          const dec = Number(valueField.fields.decimal);
          // Supra Testnet SUI/USD decimals 通常為 18
          setPrice(Number(val) / Math.pow(10, dec));
        }
      }
    } catch (e) {
      console.error('useSuiPrice error:', e);
    }
  }, [client]);

  useEffect(() => {
    // 異步且非同步執行初次獲取，徹底避免同步觸發 setState 造成的 lint 警告
    const initFetch = setTimeout(() => {
      void fetch();
    }, 0);

    const timer = setInterval(() => {
      void fetch();
    }, 60000); // 1分鐘更新一次

    return () => {
      clearTimeout(initFetch);
      clearInterval(timer);
    };
  }, [fetch]);

  return { price, refetch: fetch };
}
