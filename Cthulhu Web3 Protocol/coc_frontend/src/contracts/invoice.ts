/**
 * On-Chain Invoice Protocol Constants
 *
 * Deployment TX: Fd2SfbzurohV5dFeo9KvUjm6mNNFBUKDqML8meE8Amrr
 * PackageID:     0x2ce854bbaabb8ea2569e7357c41831e9fba5a835afa7ed6a34d9424d7a2bd96c
 */

export const INVOICE_PACKAGE_ID =
  '0x2ce854bbaabb8ea2569e7357c41831e9fba5a835afa7ed6a34d9424d7a2bd96c';

// ── Shared Objects (來自部署 TX ObjectChanges) ─────────────────────────────

/** invoice::System — Shared */
export const SYSTEM_OBJECT_ID =
  '0xde56a0626b89eb0354794550cd5c7a618e7ac38b90be6e0e365067a8510b02d0';

/**
 * invoice::Admin — 部署者持有
 * 執行 lottery() 抽獎需要此物件，只有持有者才能呼叫
 */
export const ADMIN_OBJECT_ID =
  '0x8feb1628b6108f09115dcebdbf4cadb2892a87dd1cbbaaeb40d8c867225d366d';


/** treasury::Treasury — Shared */
export const TREASURY_OBJECT_ID =
  '0x4ae4fbb2fbb9f79654426eb57c3b49214852d074c124aa76ec9e34b538040d4d';

/**
 * TreasuryCap<USDC> — Shared
 * 任何人都可以呼叫 usdc::faucet（測試網水龍頭）
 */
export const USDC_TREASURY_CAP_ID =
  '0xba422cf5ff847ded5c505d3ceaf2ef13155c03538585b9340eb67666135cc454';

/**
 * TreasuryCap<TAX_COIN> — 部署者持有（非 Shared）
 * 注意：buy_tax_coin 目前只有部署者帳號才能呼叫。
 * 需要部署者執行 transfer::public_share_object 才能讓所有人呼叫。
 */
export const TAX_TREASURY_CAP_ID =
  '0x7b5bd849764ba039d29f5f030bd8715f4baf84aca47d8c404b9b67226c2608fc';

// ── Type Tags（用於餘額查詢 & Object 過濾）─────────────────────────────────
export const USDC_TYPE    = `${INVOICE_PACKAGE_ID}::usdc::USDC`;
export const TAX_COIN_TYPE = `${INVOICE_PACKAGE_ID}::tax_coin::TAX_COIN`;
export const INVOICE_TYPE  = `${INVOICE_PACKAGE_ID}::invoice::Invoice`;

// ── CoC-W3P 協議名稱（建立彩券票時使用）──────────────────────────────────
export const COC_PROTOCOL_NAME = 'Cthulhu-Survival-Lottery';

// ── 預設金額 ────────────────────────────────────────────────────────────────
export const DEFAULT_USDC_MINT_AMOUNT = 1_000_000_000; // 1000 USDC (6 decimals)
export const DEFAULT_TAX_AMOUNT       = 100;           // 100 TAX per lottery ticket
