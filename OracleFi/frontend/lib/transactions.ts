import { Transaction } from "@mysten/sui/transactions";
import {
  PACKAGE_ID,
  POOL_ID,
  REGISTRY_ID,
  FAUCET_STATE_ID,
} from "./constants";

export const buildStake = (allCoins: any[], amount: number): Transaction => {
  const tx = new Transaction();
  
  let baseCoin: any;
  if (allCoins.length > 1) {
    // Merge all coins into the first one
    const [first, ...rest] = allCoins.map(c => tx.object(c.coinObjectId));
    baseCoin = first;
    tx.mergeCoins(baseCoin, rest);
  } else if (allCoins.length === 1) {
    baseCoin = tx.object(allCoins[0].coinObjectId);
  } else {
    throw new Error("No OC coins available to stake");
  }
  
  // Split the exact amount of coins from the chosen base coin object
  const splitCoin = tx.splitCoins(baseCoin, [tx.pure.u64(amount)]);
  
  // Call the stake function
  tx.moveCall({
    target: `${PACKAGE_ID}::staking_pool::stake`,
    arguments: [
      tx.object(POOL_ID),
      tx.object(REGISTRY_ID),
      splitCoin,
    ],
  });

  return tx;
};

export const buildWithdraw = (amount: number): Transaction => {
  const tx = new Transaction();
  
  // Call the withdraw function
  tx.moveCall({
    target: `${PACKAGE_ID}::staking_pool::withdraw`,
    arguments: [
      tx.object(POOL_ID),
      tx.object(REGISTRY_ID),
      tx.pure.u64(amount),
    ],
  });

  return tx;
};

export const buildClaimReward = (): Transaction => {
  const tx = new Transaction();
  
  // Call the claim_reward function
  tx.moveCall({
    target: `${PACKAGE_ID}::staking_pool::claim_reward`,
    arguments: [
      tx.object(POOL_ID),
      tx.object(REGISTRY_ID),
    ],
  });

  return tx;
};

/**
 * Build a transaction to admin-mint OC tokens from FaucetState.
 * Admin only — requires PoolAdminCap.
 * Calls staking_pool::admin_mint which delegates to oracle_coin::mint_from_faucet.
 *
 * @param adminCapId - Object ID of the caller's PoolAdminCap
 * @param amount     - Amount to mint in raw units (already scaled by 1e9)
 * @param recipient  - Recipient address
 */
export const buildAdminMint = (adminCapId: string, amount: number, recipient: string): Transaction => {
  const tx = new Transaction();

  // admin_mint(admin_cap, pool, faucet_state, amount, recipient)
  tx.moveCall({
    target: `${PACKAGE_ID}::staking_pool::admin_mint`,
    arguments: [
      tx.object(adminCapId),
      tx.object(POOL_ID),
      tx.object(FAUCET_STATE_ID),
      tx.pure.u64(amount),
      tx.pure.address(recipient),
    ],
  });

  return tx;
};

// ============================================
// Admin Functions
// ============================================

/**
 * Build a transaction to fund the staking pool's reward balance.
 * Admin only — requires PoolAdminCap.
 *
 * @param adminCapId   - Object ID of the caller's PoolAdminCap
 * @param userOCCoinId - Object ID of the caller's OC Coin to split from
 * @param amount       - Reward amount in raw units (already scaled by 1e9)
 */
export const buildFundReward = (adminCapId: string, userOCCoinId: string, amount: string): Transaction => {
  const tx = new Transaction();

  // Split exact amount from the user's OC coin object
  const rewardCoin = tx.splitCoins(tx.object(userOCCoinId), [tx.pure.u64(amount)]);

  // fund_reward(admin_cap, pool, coin)
  tx.moveCall({
    target: `${PACKAGE_ID}::staking_pool::fund_reward`,
    arguments: [
      tx.object(adminCapId),
      tx.object(POOL_ID),
      rewardCoin,
    ],
  });

  return tx;
};

/**
 * Build a transaction to update the OC/USD oracle price.
 * Admin only — requires Oracle AdminCap.
 *
 * @param adminCapId - Object ID of the caller's Oracle AdminCap
 * @param newPrice   - New price in USD as a float (e.g. 1.5 = $1.50).
 *                     Internally converted to 8-decimal integer (1.5 → 150_000_000).
 */
export const buildUpdateOraclePrice = (adminCapId: string, newPrice: number): Transaction => {
  const tx = new Transaction();

  // Oracle uses 8 decimals: $1.50 → 150_000_000
  const priceScaled = Math.round(newPrice * 1e8);

  // update_oracle_price(registry, admin_cap, base, quote, new_price)
  tx.moveCall({
    target: `${PACKAGE_ID}::multi_oracle_registry::update_oracle_price`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.object(adminCapId),
      tx.pure.string("OC"),
      tx.pure.string("USD"),
      tx.pure.u64(priceScaled),
    ],
  });

  return tx;
};

export const buildFaucet = (faucetStateId: string): Transaction => {
  const tx = new Transaction();

  // Call the public faucet function
  tx.moveCall({
    target: `${PACKAGE_ID}::oracle_coin::faucet`,
    arguments: [
      tx.object(faucetStateId),
      tx.object("0x6"), // standard Sui Clock object
    ],
  });

  return tx;
};
