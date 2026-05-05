import { Transaction } from "@mysten/sui/transactions";

export interface BuyScratchCardParams {
  lotteryObjectId: string;
  randomObjectId: string;
  paymentCoinObjectId: string;
  ticketTier: number; // 0, 1, 2
  playerTier: number; // 0, 1, 2, 3
  packageId: string;
}

export interface SettleScratchParams {
  lotteryObjectId: string;
  scratchCardObjectId: string;
  packageId: string;
}

export interface TopUpParams {
  lotteryObjectId: string;
  paymentCoinObjectId: string;
  amount: bigint;
  packageId: string;
}

export interface ClaimTestTwdParams {
  bankObjectId: string;
  amount: bigint;
  recipient: string;
  packageId: string;
}

/**
 * 根據票券等級返回價格 (TWD cent, 2 decimals)
 */
function getPriceByTier(tier: number): bigint {
  switch (tier) {
    case 0:
      return BigInt(20_000); // NT$200.00
    case 1:
      return BigInt(50_000); // NT$500.00
    case 2:
      return BigInt(200_000); // NT$2000.00
    default:
      return BigInt(50_000);
  }
}

export function getTwdCoinType(packageId: string): string {
  return `${packageId}::scratch::SCRATCH`;
}

export type SuiChainId = 'sui:testnet' | 'sui:mainnet' | 'sui:devnet' | 'sui:localnet';

export function getSuiChainId(): SuiChainId {
  const cleaned = (import.meta.env.VITE_SUI_NETWORK ?? 'testnet').trim().toLowerCase();

  if (cleaned === 'sui:testnet' || cleaned === 'sui:mainnet' || cleaned === 'sui:devnet' || cleaned === 'sui:localnet') {
    return cleaned;
  }

  if (cleaned === 'testnet' || cleaned === 'mainnet' || cleaned === 'devnet' || cleaned === 'localnet') {
    return `sui:${cleaned}` as SuiChainId;
  }

  return 'sui:testnet';
}

/**
 * 將 TicketId 轉為鏈上 tier 數字
 */
export function ticketIdToTier(id: string): number {
  if (id === 't200') return 0;
  if (id === 't500') return 1;
  if (id === 't1000') return 2;
  return 0;
}

/**
 * 構建購買刮卡交易 (使用 TWD 代幣支付)
 */
export function buildBuyScratchCardTx(
  params: BuyScratchCardParams
): Transaction {
  const tx = new Transaction();

  const [coin] = tx.splitCoins(tx.object(params.paymentCoinObjectId), [getPriceByTier(params.ticketTier)]);

  // 調用 Move 合約 buy_scratch_card
  tx.moveCall({
    target: `${params.packageId}::scratch::buy_scratch_card`,
    arguments: [
      tx.object(params.lotteryObjectId),
      tx.object(params.randomObjectId),
      coin,
      tx.pure.u64(params.ticketTier),
      tx.pure.u64(params.playerTier),
    ],
  });

  return tx;
}

/**
 * 構建結算刮卡交易
 */
export function buildSettleScratchTx(
  params: SettleScratchParams
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${params.packageId}::scratch::settle_scratch`,
    arguments: [
      tx.object(params.lotteryObjectId),
      tx.object(params.scratchCardObjectId),
    ],
  });

  return tx;
}

/**
 * 構建充值交易 (Admin Only, TWD)
 */
export function buildTopUpTx(
  params: TopUpParams
): Transaction {
  const tx = new Transaction();

  const [coin] = tx.splitCoins(tx.object(params.paymentCoinObjectId), [params.amount]);

  tx.moveCall({
    target: `${params.packageId}::scratch::top_up`,
    arguments: [
      tx.object(params.lotteryObjectId),
      coin,
    ],
  });

  return tx;
}

export interface WithdrawParams {
  lotteryObjectId: string;
  amount: bigint;
  packageId: string;
}

/**
 * 領取測試 TWD
 */
export function buildClaimTestTwdTx(params: ClaimTestTwdParams): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${params.packageId}::scratch::claim_test_twd`,
    arguments: [
      tx.object(params.bankObjectId),
      tx.pure.u64(params.amount),
      tx.pure.address(params.recipient),
    ],
  });
  return tx;
}

/**
 * 構建提取交易 (Admin Only)
 */
export function buildWithdrawTx(
  params: WithdrawParams
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${params.packageId}::scratch::withdraw`,
    arguments: [
      tx.object(params.lotteryObjectId),
      tx.pure.u64(params.amount),
    ],
  });

  return tx;
}

/**
 * 從環境變數取得部署的合約 ID
 */
export function getContractIds() {
  const clean = (value?: string) => value?.trim();

  return {
    framework: clean(import.meta.env.VITE_SUI_FRAMEWORK_PACKAGE_ID) || "0x2",
    randomness: clean(import.meta.env.VITE_SUI_RANDOM_PACKAGE_ID) || "0x8",
    lottery: clean(import.meta.env.VITE_LOTTERY_PACKAGE_ID),
    lotteryObject: clean(import.meta.env.VITE_LOTTERY_OBJECT_ID),
    twdBankObject: clean(import.meta.env.VITE_TWD_BANK_OBJECT_ID),
    // onchain_invoice
    invoicePackage: clean(import.meta.env.VITE_INVOICE_PACKAGE_ID),
    invoiceSystem: clean(import.meta.env.VITE_INVOICE_SYSTEM_ID),
    invoiceTreasury: clean(import.meta.env.VITE_INVOICE_TREASURY_ID),
    invoiceUsdcTreasuryCap: clean(import.meta.env.VITE_INVOICE_USDC_TREASURY_CAP_ID),
    invoiceTaxTreasuryCap: clean(import.meta.env.VITE_INVOICE_TAX_TREASURY_CAP_ID),
    invoiceAdmin: clean(import.meta.env.VITE_INVOICE_ADMIN_ID),
  };
}

// ============ onchain_invoice 串接 ============

/**
 * 領取測試用 USDC (faucet)
 */
export function buildFaucetUsdcTx(params: {
  usdcTreasuryCapId: string;
  amount: bigint;
  recipient: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${params.packageId}::usdc::faucet`,
    arguments: [
      tx.object(params.usdcTreasuryCapId),
      tx.pure.u64(params.amount),
      tx.pure.address(params.recipient),
    ],
  });
  return tx;
}

/**
 * 用 USDC 購買 TAX_COIN 額度
 * 1 USDC -> 10 TAX_COIN
 */
export function buildBuyQuotaTx(params: {
  usdcCoinObjectId: string;
  taxTreasuryCapId: string;
  treasuryId: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${params.packageId}::tax_coin::buy_quota`,
    arguments: [
      tx.object(params.usdcCoinObjectId),
      tx.object(params.taxTreasuryCapId),
      tx.object(params.treasuryId),
    ],
  });
  return tx;
}

/**
 * 用 TAX_COIN 開立鏈上發票
 */
export function buildInitInvoiceTx(params: {
  taxCoinObjectId: string;
  systemId: string;
  protocol: string;
  clockId?: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${params.packageId}::invoice::init_invoice`,
    arguments: [
      tx.object(params.taxCoinObjectId),
      tx.object(params.systemId),
      tx.pure.string(params.protocol),
      tx.object(params.clockId || "0x6"), // sui::clock 的 shared object
    ],
  });
  return tx;
}

/**
 * 一站式：faucet USDC → buy_quota → init_invoice (PTB)
 * 將三個步驟合併成一個 Programmable Transaction Block
 */
export function buildOneStopInvoiceTx(params: {
  usdcTreasuryCapId: string;
  taxTreasuryCapId: string;
  treasuryId: string;
  systemId: string;
  recipient: string;
  usdcAmount: bigint;
  protocol: string;
  packageId: string;
}): Transaction {
  const tx = new Transaction();

  // Step 1: Faucet USDC
  const [usdcCoin] = tx.moveCall({
    target: `${params.packageId}::usdc::faucet`,
    arguments: [
      tx.object(params.usdcTreasuryCapId),
      tx.pure.u64(params.usdcAmount),
      tx.pure.address(params.recipient),
    ],
  });

  // Step 2: Buy TAX_COIN quota with USDC
  const [taxCoin] = tx.moveCall({
    target: `${params.packageId}::tax_coin::buy_quota`,
    arguments: [
      usdcCoin,
      tx.object(params.taxTreasuryCapId),
      tx.object(params.treasuryId),
    ],
  });

  // Step 3: Init Invoice with TAX_COIN
  tx.moveCall({
    target: `${params.packageId}::invoice::init_invoice`,
    arguments: [
      taxCoin,
      tx.object(params.systemId),
      tx.pure.string(params.protocol),
      tx.object("0x6"), // Clock
    ],
  });

  return tx;
}

