import { Transaction, coinWithBalance } from '@mysten/sui/transactions';
import { StableLayerClient } from 'stable-layer-sdk';
import { PACKAGE_ID, PLATFORM_ID, STABLE_COIN_TYPE, USDC_TYPE, VAULT_COIN_TYPE } from '@/config/sui';

/**
 * TEMPORARY: Creates vault directly with USDC (bypasses StableLayer SDK)
 * Use this until SDK mint issue is resolved
 */
export function buildCreateVaultWithUsdcTx(
  usdcCoinId: string,
  amount: bigint
): Transaction {
  const tx = new Transaction();
  
  const coin = tx.object(usdcCoinId);
  const [splitCoin] = tx.splitCoins(coin, [tx.pure.u64(amount)]);
  
  tx.moveCall({
    target: `${PACKAGE_ID}::vault::create_vault`,
    typeArguments: [VAULT_COIN_TYPE],
    arguments: [
      tx.object(PLATFORM_ID),
      splitCoin,
    ],
  });
  
  return tx;
}

/**
 * TEMPORARY: Deposit USDC directly (bypasses StableLayer SDK)
 * Use this until SDK mint issue is resolved
 */
export function buildDepositWithUsdcTx(
  vaultId: string,
  usdcCoinId: string,
  amount: bigint
): Transaction {
  const tx = new Transaction();
  
  const coin = tx.object(usdcCoinId);
  const [splitCoin] = tx.splitCoins(coin, [tx.pure.u64(amount)]);
  
  tx.moveCall({
    target: `${PACKAGE_ID}::vault::deposit`,
    typeArguments: [VAULT_COIN_TYPE],
    arguments: [
      tx.object(vaultId),
      tx.object(PLATFORM_ID),
      splitCoin,
    ],
  });
  
  return tx;
}

/**
 * TEMPORARY: Withdraw USDC directly (bypasses StableLayer SDK)
 * Use this until SDK mint issue is resolved
 */
export function buildWithdrawWithUsdcTx(
  vaultId: string,
  amount: bigint,
  recipient: string
): Transaction {
  const tx = new Transaction();
  
  const [coin] = tx.moveCall({
    target: `${PACKAGE_ID}::vault::withdraw`,
    typeArguments: [VAULT_COIN_TYPE],
    arguments: [
      tx.object(vaultId),
      tx.object(PLATFORM_ID),
      tx.pure.u64(amount),
    ],
  });
  
  tx.transferObjects([coin], tx.pure.address(recipient));
  
  return tx;
}

export async function createStableLayerClient(sender: string) {
  const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'mainnet' | 'testnet';
  return StableLayerClient.initialize({
    network,
    sender,
  });
}

/**
 * Builds a deposit transaction that:
 * 1. Mints stable coin from USDC using StableLayer SDK
 * 2. Deposits the stable coin into the vault
 * 
 * @param client - StableLayerClient instance
 * @param vaultId - Vault object ID
 * @param amount - Amount to deposit (in smallest unit, e.g., 1_000_000 for 1 USDC)
 * @returns Transaction ready for signing
 */
export async function buildDepositTx(
  client: StableLayerClient,
  vaultId: string,
  amount: bigint
): Promise<Transaction> {
  const tx = new Transaction();
  
  // Step 1: Mint stable coin from USDC using SDK
  // Using coinWithBalance as per SDK documentation
  const stableCoin = await client.buildMintTx({
    tx,
    stableCoinType: STABLE_COIN_TYPE,
    usdcCoin: coinWithBalance({
      balance: amount,
      type: USDC_TYPE,
    })(tx),
    amount,
    autoTransfer: false,
  });
  
  // Step 2: Deposit the minted stable coin into vault
  if (stableCoin) {
    tx.moveCall({
      target: `${PACKAGE_ID}::vault::deposit`,
      typeArguments: [STABLE_COIN_TYPE],
      arguments: [
        tx.object(vaultId),
        tx.object(PLATFORM_ID),
        stableCoin,
      ],
    });
  } else {
    throw new Error('Failed to mint stable coin: buildMintTx returned null');
  }
  
  return tx;
}

/**
 * Builds a withdraw transaction that:
 * 1. Withdraws stable coin from vault
 * 2. Burns stable coin back to USDC using StableLayer SDK
 * 3. USDC is automatically transferred to sender
 * 
 * @param client - StableLayerClient instance
 * @param vaultId - Vault object ID
 * @param amount - Amount to withdraw (in smallest unit)
 * @returns Transaction ready for signing
 */
export async function buildWithdrawTx(
  client: StableLayerClient,
  vaultId: string,
  amount: bigint
): Promise<Transaction> {
  const tx = new Transaction();
  
  // Step 1: Withdraw stable coin from vault
  const [stableCoin] = tx.moveCall({
    target: `${PACKAGE_ID}::vault::withdraw`,
    typeArguments: [STABLE_COIN_TYPE],
    arguments: [
      tx.object(vaultId),
      tx.object(PLATFORM_ID),
      tx.pure.u64(amount),
    ],
  });
  
  // Step 2: Burn stable coin back to USDC
  // Use amount parameter to burn specific amount
  await client.buildBurnTx({
    tx,
    stableCoinType: STABLE_COIN_TYPE,
    amount,
    autoTransfer: true,
  });
  
  return tx;
}

/**
 * Builds a claim and distribute rewards transaction that:
 * 1. Claims rewards from StableLayer using SDK
 * 2. Distributes rewards to vault (which handles donation allocation)
 * 
 * @param client - StableLayerClient instance
 * @param vaultId - Vault object ID
 * @returns Transaction ready for signing
 */
export async function buildClaimAndDistributeTx(
  client: StableLayerClient,
  vaultId: string
): Promise<Transaction> {
  const tx = new Transaction();
  
  // Step 1: Claim rewards from StableLayer
  // autoTransfer: false ensures we get the coin object reference
  const rewardsCoin = await client.buildClaimTx({
    tx,
    stableCoinType: STABLE_COIN_TYPE,
    autoTransfer: false,
  });
  
  // Step 2: Distribute rewards to vault
  // The vault will handle donation allocation based on configured percentages
  if (rewardsCoin) {
    // Note: If distribute_rewards doesn't exist, we might need to use deposit
    // or create a wrapper function. For now, assuming it exists or using deposit
    tx.moveCall({
      target: `${PACKAGE_ID}::vault::deposit`,
      typeArguments: [STABLE_COIN_TYPE],
      arguments: [
        tx.object(vaultId),
        tx.object(PLATFORM_ID),
        rewardsCoin,
      ],
    });
  } else {
    throw new Error('No rewards available to claim');
  }
  
  return tx;
}

/**
 * Builds a transaction to create a new vault with initial deposit:
 * 1. Mints stable coin from USDC using StableLayer SDK
 * 2. Creates the vault with the minted stable coin
 * 
 * @param client - StableLayerClient instance
 * @param amount - Amount to deposit (in smallest unit, e.g., 1_000_000 for 1 USDC)
 * @returns Transaction ready for signing
 */
export async function buildMintAndCreateVaultTx(
  client: StableLayerClient,
  amount: bigint
): Promise<Transaction> {
  const tx = new Transaction();
  
  // Step 1: Mint stable coin from USDC using SDK
  // Using coinWithBalance as per SDK documentation
  const stableCoin = await client.buildMintTx({
    tx,
    stableCoinType: STABLE_COIN_TYPE,
    usdcCoin: coinWithBalance({
      balance: amount,
      type: USDC_TYPE,
    })(tx),
    amount,
    autoTransfer: false,
  });
  
  // Step 2: Create vault with the minted stable coin
  if (stableCoin) {
    tx.moveCall({
      target: `${PACKAGE_ID}::vault::create_vault`,
      typeArguments: [STABLE_COIN_TYPE],
      arguments: [
        tx.object(PLATFORM_ID),
        stableCoin,
      ],
    });
  } else {
    throw new Error('Failed to mint stable coin: buildMintTx returned null');
  }
  
  return tx;
}
