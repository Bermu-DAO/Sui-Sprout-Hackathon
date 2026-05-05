// frontend/lib/constants.ts

// === Package IDs ===
// ORIGINAL_PACKAGE_ID: Used ONLY for type identifiers (e.g. Coin<...::ORACLE_COIN>)
// In Sui, types always reference the original package where they were first defined.
export const ORIGINAL_PACKAGE_ID = "0x81f67b5daa91e9f49c24753d6423b87a02b449aa0ce1125cba194afd10397b15";
// PACKAGE_ID: Used for all moveCall targets. Must point to the LATEST published version.
export const PACKAGE_ID = "0xe7673dda5fed10f5d52a8f960a8f8d48a762685228dbf1e74c7c81ee92668eb7";

// === Core Object IDs ===
export const POOL_ID = "0xda1b01ce2583ba48c59621135e7784ca2fa53ec51f581f7967c3760e7037f7a6";
export const ORACLE_ID = "0x0f5ea00e7b73ef14b5ae344c28e64777cf8fe66892238a59d56b823ba38551e3";
export const REGISTRY_ID = "0x359ec6fb71edfa7bdf3fcfe348633f823753b722e03a4fa2d6df758bf246c0f4";

// === Caps (Admin Authorization) ===
// NOTE: TREASURY_CAP_ID was consumed by init_faucet and no longer exists as a standalone object.
// It now lives inside FaucetState. Use buildMintOC is no longer possible.
// Pool Admin Caps
export const POOL_ADMIN_CAP_ID = "0x8b953590f3e487a8d452a92bea64b686f039f4af307b5a8abbeb5ee6538fbd3a";
export const POOL_SUPER_ADMIN_CAP_ID = "0x2148eb7665d583a0eee540ac1bd2a217a9d4f05209598cbad2058284086a4d84";
// Oracle Admin Caps
export const ORACLE_ADMIN_CAP_ID = "0xfe70900675818e6ef9d1f1c4543c60f46eb17afec47e8f9a0a2d520220cef4e9";
export const ORACLE_SUPER_ADMIN_CAP_ID = "0x0342c3a588080a316a8ffbd6a040ac103378ef48dc752ff78657edfc502d3bbb";

// === Token Config ===
// COIN_TYPE uses ORIGINAL_PACKAGE_ID because Sui types are permanently bound to original package
export const COIN_TYPE = `${ORIGINAL_PACKAGE_ID}::oracle_coin::ORACLE_COIN`;
export const SCALING_FACTOR = 1e9; // 9 decimals

// === APY Config (from contract) ===
export const MIN_APY_RATE = 500;   // 5%
export const MAX_APY_RATE = 2000;  // 20%
export const MIN_PRICE = 5000;     // $0.50 (8 decimals)
export const MAX_PRICE = 50000;    // $5.00 (8 decimals)

// === Faucet ===
export const FAUCET_STATE_ID = "0xbd1c5cf27b4b2f40ec3743d567a6f428eb09e186a0eadfd87fdb24f32c8995f3";