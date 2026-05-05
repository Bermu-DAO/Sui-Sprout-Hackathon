/**
 * useInvoice.ts
 * On-chain transaction hooks for the onchain_invoice protocol.
 * Uses the dAppKit `signAndExecuteTransaction` method via `useDAppKit()`.
 */

import { useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import {
  INVOICE_PACKAGE_ID,
  SYSTEM_OBJECT_ID,
  TREASURY_OBJECT_ID,
  USDC_TREASURY_CAP_ID,
  TAX_TREASURY_CAP_ID,
  ADMIN_OBJECT_ID,
  COC_PROTOCOL_NAME,
  DEFAULT_USDC_MINT_AMOUNT,
  DEFAULT_TAX_AMOUNT,
} from '../contracts/invoice';

export type TxStatus = 'idle' | 'pending' | 'success' | 'error';

/** 1. Mint USDC (testnet faucet) */
export function useMintUsdc() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const [status, setStatus] = useState<TxStatus>('idle');

  const mintUsdc = async (amount: number = DEFAULT_USDC_MINT_AMOUNT) => {
    if (!account) return;
    setStatus('pending');
    try {
      const tx = new Transaction();
      // onchain_invoice::usdc::faucet(treasury_cap, amount, recipient, ctx)
      tx.moveCall({
        target: `${INVOICE_PACKAGE_ID}::usdc::faucet`,
        arguments: [
          tx.object(USDC_TREASURY_CAP_ID),
          tx.pure.u64(amount),
          tx.pure.address(account.address),
        ],
      });
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      setStatus('success');
    } catch (e) {
      console.error('mintUsdc error:', e);
      setStatus('error');
    }
  };

  return { mintUsdc, status };
}

/** 2. Buy TAX_COIN with USDC */
export function useBuyTaxCoin() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const [status, setStatus] = useState<TxStatus>('idle');

  /**
   * @param primaryUsdcCoinId  主要的 USDC Coin Object ID（必填）
   * @param allUsdcCoinIds     錢包內所有 USDC Coin Object IDs（含主要那顆）
   * @param usdcAmount         要兌換的 raw USDC 金額（已乘過 decimals）
   */
  const buyTax = async (primaryUsdcCoinId: string, allUsdcCoinIds: string[], usdcAmount: number) => {
    if (!account) return;
    setStatus('pending');
    try {
      const tx = new Transaction();
      const primaryCoin = tx.object(primaryUsdcCoinId);

      // ① 先把錢包內其他 USDC Coin Object 合併進主要那顆
      //    避免 splitCoins 時因單一 Object 餘額不足而失敗
      const others = allUsdcCoinIds.filter(id => id !== primaryUsdcCoinId);
      if (others.length > 0) {
        tx.mergeCoins(primaryCoin, others.map(id => tx.object(id)));
      }

      // ② 從合併後的 Coin 拆出所需金額
      const [usdcSplit] = tx.splitCoins(primaryCoin, [usdcAmount]);

      // onchain_invoice::tax_coin::buy_quota(in_coin, treasury_cap, treasury, ctx)
      tx.moveCall({
        target: `${INVOICE_PACKAGE_ID}::tax_coin::buy_quota`,
        arguments: [
          usdcSplit,
          tx.object(TAX_TREASURY_CAP_ID),
          tx.object(TREASURY_OBJECT_ID),
        ],
      });
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      setStatus('success');
    } catch (e) {
      console.error('buyTax error:', e);
      setStatus('error');
    }
  };

  return { buyTax, status };
}

/** 3. Purchase item + get Invoice lottery ticket (via coc_invoice_bridge) */
export function useBuyItemWithLottery(cocPackageId: string) {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const [status, setStatus] = useState<TxStatus>('idle');

  const buyItem = async (taxCoinId: string, clockId: string = '0x6') => {
    if (!account) return;
    setStatus('pending');
    try {
      const tx = new Transaction();
      const [taxSplit] = tx.splitCoins(tx.object(taxCoinId), [DEFAULT_TAX_AMOUNT]);
      // coc::invoice_bridge::buy_item_and_get_lottery_ticket(tax_payment, invoice_system, protocol_name, clock, ctx)
      tx.moveCall({
        target: `${cocPackageId}::invoice_bridge::buy_item_and_get_lottery_ticket`,
        arguments: [
          taxSplit,
          tx.object(SYSTEM_OBJECT_ID),
          tx.pure.string(COC_PROTOCOL_NAME),
          tx.object(clockId),
        ],
      });
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      setStatus('success');
    } catch (e) {
      console.error('buyItem error:', e);
      setStatus('error');
    }
  };

  return { buyItem, status };
}

/** 4. Claim lottery prize */
export function useClaimLottery() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const [status, setStatus] = useState<TxStatus>('idle');

  const claim = async (invoiceObjectId: string, clockId: string = '0x6') => {
    if (!account) return;
    setStatus('pending');
    try {
      const tx = new Transaction();
      // onchain_invoice::invoice::claim_lottery(system, invoice, treasury, clock, ctx)
      tx.moveCall({
        target: `${INVOICE_PACKAGE_ID}::invoice::claim_lottery`,
        arguments: [
          tx.object(SYSTEM_OBJECT_ID),
          tx.object(invoiceObjectId),
          tx.object(TREASURY_OBJECT_ID),
          tx.object(clockId),
        ],
      });
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      setStatus('success');
    } catch (e) {
      console.error('claim error:', e);
      setStatus('error');
    }
  };

  return { claim, status };
}

/**
 * 5. 執行抽獎 (僅限持有 Admin 物件的帳號)
 * lottery(admin, system, random, clock, ctx)
 */
export function useLotteryDraw() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const [status, setStatus] = useState<TxStatus>('idle');

  const draw = async (clockId: string = '0x6', randomId: string = '0x8') => {
    if (!account) return;
    setStatus('pending');
    try {
      const tx = new Transaction();
      // onchain_invoice::invoice::lottery(admin, system, random, clock, ctx)
      tx.moveCall({
        target: `${INVOICE_PACKAGE_ID}::invoice::lottery`,
        arguments: [
          tx.object(ADMIN_OBJECT_ID),   // &Admin — 持有者才能傳入
          tx.object(SYSTEM_OBJECT_ID),  // &mut System
          tx.object(randomId),          // &Random (0x8)
          tx.object(clockId),           // &Clock (0x6)
        ],
      });
      await dAppKit.signAndExecuteTransaction({ transaction: tx });
      setStatus('success');
    } catch (e) {
      console.error('lotteryDraw error:', e);
      setStatus('error');
    }
  };

  return { draw, status };
}
