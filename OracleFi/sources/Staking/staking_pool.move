module oracle_staking_pool::staking_pool;

// ---------- Imports ----------
use oracle_staking_pool::oracle_coin::{Self, ORACLE_COIN, FaucetState};
use oracle_staking_pool::multi_oracle_registry::{Self, OracleRegistry};
use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::event;
use std::u64;
// use onchain_invoice::invoice; // Hackthon bonus
// Dof and df
// use sui::dynamic_object_field as dof; // with ID
use sui::dynamic_field as df; // without ID
// ---------- Constants ----------
const REWARD_PRECISION: u64 = 1_000_000_000;
const BASE_RATE: u64 = 100;
const PRICE_ANCHOR: u64 = 1_000_000_000; // 1 USD in 9 decimals
const MIN_RATE: u64 = 10;   // Prevent rate from approaching 0 when OC price is high
const MAX_RATE: u64 = 1_000; // Prevent rate explosion when OC price is very low
// ---------- Error Codes ----------

const EInvalidStakeAmount: u64 = 2;
const EInvalidWithdrawAmount: u64 = 3;
const ENoStakeFound: u64 = 4;
const EAdminsOverLimit: u64 = 5;
const EPoolMismatch: u64 = 7;
const EOverflow: u64 = 8;
const EAdminDenied: u64 = 9;
const EAlreadyDenied: u64 = 10;
const ERewardUnderflow: u64 = 11;


// ---------- Structs ----------
// Core structs
public struct StakingPool has key{
    id: UID,
    total_staked: u64, // Total staked amount in the pool
    reward_per_token_stored: u64, // Accumulated reward per token in the pool (scaled by 1e9 for precision)
    last_update_epoch: u64, // epoch timestamp
    stake_balance: Balance<ORACLE_COIN>, // Total staked balance in the pool
    reward_balance: Balance<ORACLE_COIN>, // Total reward balance in the pool
    admin_minted: u64,
    admin_limit: u64,
    denied_admins: vector<address>, // Denylist for revoked admins
}
public struct StakeRecord has store {
    amount: u64,    // Amount staked by the user
    reward_per_token_paid: u64, // Reward per token value at the time of user's last stake/withdraw
    rewards: u64, // Rewards earned but not yet claimed
    stake_timestamp: u64, // epoch timestamp of the last stake action
}

// Administration structs
public struct PoolSuperAdminCap has key, store {
    id: UID,
    pool_id: ID, // Bound to a specific StakingPool
}
public struct PoolAdminCap has key, store {
    id: UID,
    pool_id: ID, // Bound to a specific StakingPool
}

// Events
public struct StakeEvent has copy, drop {
    user: address,
    amount: u64,
    timestamp: u64,
}
public struct WithdrawEvent has copy, drop {
    user: address,
    amount: u64,
    timestamp: u64,
}
public struct ClaimRewardEvent has copy, drop {
    user: address,
    amount: u64,
    timestamp: u64,
}

// ============================================================================================================
// Staking Pool Core Functions (For users)
// - Create
// - Stake, Withdraw, Claim Reward
// ============================================================================================================
public fun create_pool(
    admin_limit: u64,
    ctx: &mut TxContext
) {
    // Create the pool (reward_rate is now dynamically calculated from oracle price)
    let pool = StakingPool {
        id: object::new(ctx),
        total_staked: 0,
        reward_per_token_stored: 0,
        last_update_epoch: tx_context::epoch(ctx),
        stake_balance: balance::zero(),
        reward_balance: balance::zero(),
        admin_minted: 1, // Founder has 1
        admin_limit,
        denied_admins: vector::empty(),
    };
    // Create caps bound to this pool
    let pool_id = object::id(&pool);
    let super_admin_cap = PoolSuperAdminCap {
        id: object::new(ctx),
        pool_id,
    };
    let admin_cap = PoolAdminCap {
        id: object::new(ctx),
        pool_id,
    };
    // Share the pool, transfer super admin cap to creator
    transfer::share_object(pool);
    transfer::public_transfer(super_admin_cap, tx_context::sender(ctx));
    transfer::public_transfer(admin_cap, tx_context::sender(ctx));

}

public fun stake(
    pool: &mut StakingPool,
    registry: &OracleRegistry,
    stake_coin: Coin<ORACLE_COIN>,
    ctx: &mut TxContext
) {
    let amount = coin::value(&stake_coin);
    assert!(amount > 0, EInvalidStakeAmount);
    
    // Update pool rewards before changing the stake amount
    update_rewards(pool, registry, ctx);
    
    // Check if user already has a stake record, if not create one
    let user = tx_context::sender(ctx);
    let current_epoch = tx_context::epoch(ctx);

    // If user stake for the first time, create a new stake record for the user with amount 0 and reward_per_token_paid as current reward_per_token_stored
    if (!df::exists_(&pool.id, user)) {
        let record = StakeRecord {
            amount,
            reward_per_token_paid: pool.reward_per_token_stored,
            rewards: 0,
            stake_timestamp: current_epoch,
        };
        // Create a new stake record for the user
        df::add(&mut pool.id, user, record); // df::add(object_id, key, value) to create a new stake record for the user (DF) under StakingPool
    } else {
    
        // 1. Get reward_per_token_stored from the pool
        let rpt = pool.reward_per_token_stored;
        // 2. Get the user's stake record
        let record = df::borrow_mut<address, StakeRecord>(&mut pool.id, user); // df::borrow_mut<KeyType, ValueType>(&mut object_id, key) to get user address's StakeRecord(DF) under StakingPool
        // 3.1 Count current rewards (rewards per token in the pool - record.rewards per token user already gained)
        // 3.2 Count how much rewards user earned from last time (reward_delta * user stake amount)
        // 3.3 Update the user's stake record
        record.rewards = earned(record, rpt); // Update the user's rewards before changing the stake amount
        record.amount = record.amount + amount; // Update the user's stake amount
        record.reward_per_token_paid = pool.reward_per_token_stored; // Update the user's reward_per_token_paid to the current reward_per_token_stored
        record.stake_timestamp = current_epoch; // Update the user's stake timestamp to the current epoch time   
    };

    // Update the pool's total staked amount
    pool.total_staked = pool.total_staked + amount;
    // Transfer the staked coins to the pool (join the coin to the pool's reward balance)
    let stake_balance = coin::into_balance(stake_coin);
    balance::join(&mut pool.stake_balance, stake_balance);

    // Emit a stake event
    event::emit(StakeEvent {
        user,
        amount,
        timestamp: current_epoch,
    });
}

public fun withdraw(
    pool: &mut StakingPool,
    registry: &OracleRegistry,
    amount: u64,
    ctx: &mut TxContext
) {
    let user = tx_context::sender(ctx);
    let current_epoch = tx_context::epoch(ctx);

    // Validation
    assert!(amount > 0, EInvalidWithdrawAmount);
    assert!(df::exists_(&pool.id, tx_context::sender(ctx)), ENoStakeFound);

    // Update pool rewards before changing the stake amount
    update_rewards(pool, registry, ctx);

    // Get the user's stake record and reward per token stored in the pool
    let record = df::borrow_mut<address, StakeRecord>(&mut pool.id, user);
    let rpt = pool.reward_per_token_stored;

    // Check if user has enough stake to withdraw
    assert!(record.amount >= amount, EInvalidWithdrawAmount);

    // 1. Update user's pending rewards before changing stake amount
    record.rewards = earned(record, rpt);

    // 2. Deduct the withdraw amount from user's stake
    record.amount = record.amount - amount;

    // 3. Sync user's reward checkpoint to current pool state
    record.reward_per_token_paid = rpt;

    // Read final state into locals (releases the mutable borrow on record)
    let remaining_amount = record.amount;
    let remaining_rewards = record.rewards;

    // 4. If fully withdrawn and no pending rewards, remove the DF to save storage
    if (remaining_amount == 0 && remaining_rewards == 0) {
        let StakeRecord { amount: _, reward_per_token_paid: _, rewards: _, stake_timestamp: _ }
            = df::remove<address, StakeRecord>(&mut pool.id, user);
    };

    // 5. Deduct from pool totals
    pool.total_staked = pool.total_staked - amount;

    // 6. Split withdrawn amount from pool's stake_balance and transfer to user
    let withdrawn_balance = balance::split(&mut pool.stake_balance, amount);
    let withdrawn_coin = coin::from_balance(withdrawn_balance, ctx);
    transfer::public_transfer(withdrawn_coin, user);

    // 7. Emit WithdrawEvent
    event::emit(WithdrawEvent {
        user,
        amount,
        timestamp: current_epoch,
    });
}

public fun claim_reward(
    pool: &mut StakingPool,
    registry: &OracleRegistry,
    ctx: &mut TxContext
) {
    let user = tx_context::sender(ctx);
    let current_epoch = tx_context::epoch(ctx);

    // 0. Validate: user must have a stake record
    assert!(df::exists_(&pool.id, user), ENoStakeFound);

    // 1. Sync pool reward state to current epoch
    update_rewards(pool, registry, ctx);

    // 2. Get user's stake record and current reward_per_token
    let rpt = pool.reward_per_token_stored;
    let record = df::borrow_mut<address, StakeRecord>(&mut pool.id, user);

    // 3. Calculate total pending rewards
    let pending_rewards = earned(record, rpt);

    // Early return: nothing to claim
    if (pending_rewards == 0) { return };

    // 4. Clamp to available reward balance (graceful degradation if pool underfunded)
    let available = balance::value(&pool.reward_balance);
    let actual_reward = u64::min(pending_rewards, available);

    // Early return: pool has no reward tokens at all
    if (actual_reward == 0) { return };

    // 5. Reset record: deduct only the actually paid portion, sync checkpoint
    record.rewards = pending_rewards - actual_reward;
    record.reward_per_token_paid = rpt;

    // 6. Split rewards from pool and transfer to user
    let reward_bal = balance::split(&mut pool.reward_balance, actual_reward);
    let reward_coin = coin::from_balance(reward_bal, ctx);
    transfer::public_transfer(reward_coin, user);

    // 7. Emit ClaimRewardEvent
    event::emit(ClaimRewardEvent {
        user,
        amount: actual_reward,
        timestamp: current_epoch,
    });
}
// ============================================================================================================
// Staking Pool Core Functions (Administration)
// - fund_reward
// - add_admin
// ============================================================================================================
public fun fund_reward(
    admin_cap: &PoolAdminCap,
    pool: &mut StakingPool,
    reward_coin: Coin<ORACLE_COIN>,
    ctx: &mut TxContext
) {
    // Validate admin cap is bound to this pool
    assert!(admin_cap.pool_id == object::id(pool), EPoolMismatch);
    // Check caller is not on the denylist
    assert!(!vector::contains(&pool.denied_admins, &tx_context::sender(ctx)), EAdminDenied);
    let reward_amount = coin::value(&reward_coin);
    assert!(reward_amount > 0, EInvalidStakeAmount);

    let reward_balance = coin::into_balance(reward_coin);
    // Update the pool's reward balance
    balance::join(&mut pool.reward_balance, reward_balance);
}

public fun add_admin(
    admin_cap: &PoolAdminCap,
    pool: &mut StakingPool,
    receiver: address,
    ctx: &mut TxContext,
) {
    // Validate admin cap is bound to this pool
    assert!(admin_cap.pool_id == object::id(pool), EPoolMismatch);
    // Check caller is not on the denylist
    assert!(!vector::contains(&pool.denied_admins, &tx_context::sender(ctx)), EAdminDenied);
    assert!(pool.admin_minted < pool.admin_limit, EAdminsOverLimit);
    // If not over limit
    pool.admin_minted = pool.admin_minted + 1;
    let new_admin_cap = PoolAdminCap { id: object::new(ctx), pool_id: admin_cap.pool_id };
    transfer::public_transfer(new_admin_cap, receiver);
}

public fun remove_admin(
    super_admin_cap: &PoolSuperAdminCap,
    pool: &mut StakingPool,
    addr: address,
) {
    // Validate super admin cap is bound to this pool
    assert!(super_admin_cap.pool_id == object::id(pool), EPoolMismatch);
    // Ensure the address is not already denied
    assert!(!vector::contains(&pool.denied_admins, &addr), EAlreadyDenied);
    // Add to denylist
    vector::push_back(&mut pool.denied_admins, addr);
}

/// Admin mint: allows PoolAdminCap holders to mint OC tokens from FaucetState.
/// This replaces the old `oracle_coin::mint` which required a standalone TreasuryCap.
public fun admin_mint(
    admin_cap: &PoolAdminCap,
    pool: &StakingPool,
    faucet_state: &mut FaucetState,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    // Validate admin cap is bound to this pool
    assert!(admin_cap.pool_id == object::id(pool), EPoolMismatch);
    // Check caller is not on the denylist
    assert!(!vector::contains(&pool.denied_admins, &tx_context::sender(ctx)), EAdminDenied);
    // Delegate to oracle_coin's package-level mint function
    oracle_coin::mint_from_faucet(faucet_state, amount, recipient, ctx);
}

// ============================================================================================================
// Helper functions
// - update_rewards (count how much rewards in the pool from last time)
// - earned (count how much rewards each user earned)
// ============================================================================================================
// 2 things update_rewards do
// 1. Count how much rewards occured from last time update (total_new_rewards = reward_rate × epochs_passed)
// 2. Spread these rewards evenly to total_staked, count how much rewards each token get (reward_per_token_delta = total_new_rewards × REWARD_PRECISION / total_staked)
fun update_rewards(
    pool: &mut StakingPool,
    registry: &OracleRegistry,
    ctx: &TxContext
) {
    let current_epoch = tx_context::epoch(ctx);
    // only update epoch if there is no one staking
    if (pool.total_staked == 0) {
        pool.last_update_epoch = current_epoch;
        return
    };
    
    // count rewards
    let epochs_passed = current_epoch - pool.last_update_epoch;
    if (epochs_passed > 0) {
        // Step A: Read OC/USD price from oracle registry
        let oc_price = multi_oracle_registry::get_oracle_price(registry, b"OC", b"USD");

        // Step B: Calculate dynamic rate with min/max bounds
        let raw_rate = if (oc_price == 0) { BASE_RATE }
                       else { BASE_RATE * PRICE_ANCHOR / oc_price };
        let dynamic_rate = if (raw_rate < MIN_RATE) { MIN_RATE }
                           else if (raw_rate > MAX_RATE) { MAX_RATE }
                           else { raw_rate };

        // Step C: Use dynamic_rate to compute total new rewards
        // Overflow guard: ensure dynamic_rate * epochs_passed won't overflow u64
        assert!(dynamic_rate <= 18_446_744_073_709_551_615 / epochs_passed, EOverflow);
        let total_new_rewards = dynamic_rate * epochs_passed;
        // Overflow guard: ensure total_new_rewards * REWARD_PRECISION won't overflow u64
        assert!(total_new_rewards <= 18_446_744_073_709_551_615 / REWARD_PRECISION, EOverflow);
        // reward per token (variation)
        let reward_per_token_delta = (total_new_rewards * REWARD_PRECISION) / pool.total_staked;

        // Update the pool's reward per token and last update epoch
        pool.reward_per_token_stored = pool.reward_per_token_stored + reward_per_token_delta;
        pool.last_update_epoch = current_epoch;
    };
}

fun earned(record: &StakeRecord, rpt: u64): u64 {

    assert!(rpt >= record.reward_per_token_paid, ERewardUnderflow);
    let reward_delta = rpt - record.reward_per_token_paid;
    (record.amount * reward_delta) / REWARD_PRECISION + record.rewards
}

// ============================================================================================================
// Read-Only functions
// - get_stake_amount
// - get_pending_rewards
// - get_total_staked
// ============================================================================================================

// ===================================================
// NOTE: How to get user stake record: DF (Dynamic Field)
// - StakeRecord is stored under StakingPool as DF, with user address as key
// - So you have to &StakingPool first, then use DF to get user address's StakeRecord
// - &StakingPool -> df::borrow<KeyType, ValueType>(object_id, key) -> &StakeRecord -> get amount, reward, etc
// ===================================================
// Get how much user staked in the pool
public fun get_stake_amount(
    pool: &StakingPool,
    user: address
): u64 {
    if(!df::exists_(&pool.id, user)) {
        return 0;
    };
    let record = df::borrow<address, StakeRecord>(&pool.id, user); // df::borrow<KeyType, ValueType>(object_id, key) to get user address's StakeRecord(DF) under StakingPool
    record.amount
}
// Get how much rewards user can claim in the pool
public fun get_pending_rewards(
    pool: &StakingPool,
    registry: &OracleRegistry,
    user: address,
    ctx: &TxContext
): u64 {
    if(!df::exists_(&pool.id, user)) {return 0};

    let current_epoch = tx_context::epoch(ctx);
    let epochs_passed = current_epoch - pool.last_update_epoch;
    let live_rpt =
    if (pool.total_staked > 0 && epochs_passed > 0) {
        // Dynamic rate calculation (mirrors update_rewards logic)
        let oc_price = multi_oracle_registry::get_oracle_price(registry, b"OC", b"USD");
        let raw_rate = if (oc_price == 0) { BASE_RATE }
                       else { BASE_RATE * PRICE_ANCHOR / oc_price };
        let dynamic_rate = if (raw_rate < MIN_RATE) { MIN_RATE }
                           else if (raw_rate > MAX_RATE) { MAX_RATE }
                           else { raw_rate };

        if (dynamic_rate > 0 && epochs_passed > 18_446_744_073_709_551_615 / dynamic_rate) {
            // overflow: use stored rpt without adding new rewards
            pool.reward_per_token_stored
        } else {
            let total_new_rewards = dynamic_rate * epochs_passed;
            if (total_new_rewards > 18_446_744_073_709_551_615 / REWARD_PRECISION) {
                pool.reward_per_token_stored
            } else {
                pool.reward_per_token_stored + (total_new_rewards * REWARD_PRECISION) / pool.total_staked
            }
        }
    } else {
        pool.reward_per_token_stored
    };

    let record = df::borrow<address, StakeRecord>(&pool.id, user);
    earned(record, live_rpt)
}
// Get how much total staked in the pool
public fun get_total_staked(
    pool: &StakingPool
): u64 {
    pool.total_staked
}