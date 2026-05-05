module oracle_staking_pool::multi_oracle_registry;

// ---------- Common Import ----------
use std::string;
use sui::dynamic_object_field as dof;
use sui::event;
use sui::balance::{Self, Balance};
use sui::coin::{Self, Coin};

// ---------- sui_learning Import ----------
use oracle_staking_pool::price_oracle as po;
use oracle_staking_pool::oracle_coin::ORACLE_COIN;

// ---------- Const ----------
const REGISTRATION_FEE: u64 = 100_000_000; // 0.1 OC (9 decimals)

/// Error code
//// Oracle
const EPairExists: u64 = 1; // for register_oracle
const EPairNotFound: u64 = 2; // for get_oracle and get_oracle_mut
//// Coin
const EPaymentNotEnough: u64 = 3;
const EFeeNotEnough: u64 = 4;

// ---------- Struct ----------
public struct OracleRegistry has key, store {
    id: UID,
    name: string::String,
    treasury: Balance<ORACLE_COIN>,
}
public struct OracleRegisteredEvent has copy, drop {
    registry_id: ID,
    oracle_id: ID,
    pair: vector<u8>,
    timestamp: u64,
}
public struct OracleRemovedEvent has copy, drop {
    registry_id: ID,
    oracle_id: ID,
    pair: vector<u8>,
    timestamp: u64,
}
public struct WithdrawFeeEvent has copy, drop {
    amount: u64,
    recipient: address,
    timestamp: u64,
}

// ============================================================================================================
// Oracle Registry
// - Create Registry
// - Register / Remove Oracle
// ============================================================================================================

// ---------- Create OracleRegistry ----------
public fun create_registry(name: string::String, ctx: &mut TxContext) {
    let registry = OracleRegistry {
        id: object::new(ctx),
        name,
        treasury: balance::zero(),
    };
    transfer::share_object(registry);
}

/// - Function to combine the base and quote. e.g. base: BTC, quote: USDT
public fun make_pair_key(base: vector<u8>, quote: vector<u8>): vector<u8> {
    let mut key = vector::empty<u8>();
    vector::append(&mut key, base); // append is for vector
    vector::push_back(&mut key, 47); // ASCII code for '/', push_back is for an element like in this case is "u8"
    vector::append(&mut key, quote);
    key
}

// ---------- Register & Remove Oracles ----------
/// - This will create a new oracle under the registry
public fun register_oracle(
    registry: &mut OracleRegistry,
    mut payment: Coin<ORACLE_COIN>,
    base: vector<u8>,
    quote: vector<u8>,
    initial_price: u64,
    decimals: u8,
    admin_limit: u64,
    ctx: &mut TxContext,
) {
    // Coin
    /// Check if the payment amount >= REGISTRATION_FEE
    assert!(coin::value(&payment) >= REGISTRATION_FEE, EPaymentNotEnough);
    /// Split fee from the payment
    let fee_coin = coin::split(&mut payment, REGISTRATION_FEE, ctx);
    /// Turn fee_coin to balance and add it into registry treasury
    let fee_balance = coin::into_balance(fee_coin);
    balance::join(&mut registry.treasury, fee_balance);
    /// transfer the rest of the payment
    transfer::public_transfer(payment, tx_context::sender(ctx));

    // Pair key
    let pair_key = make_pair_key(base, quote);
    /// Copy pair keys for different uses
    let pair_key_event = copy pair_key; // Event emission
    let pair_string = string::utf8(copy pair_key); // For oracle creation

    // Check if the pair already exists
    assert!(!dof::exists_<vector<u8>>(&registry.id, pair_key), EPairExists); // "!" means not 
    
    // Create new oracle
    let (oracle, super_admin_cap, admin_cap) = po::new_oracle(
        pair_string,
        initial_price,
        decimals,
        admin_limit,
        ctx,
    );
    
    // Transfer the admin cap to the sender
    transfer::public_transfer(super_admin_cap, tx_context::sender(ctx));
    transfer::public_transfer(admin_cap, tx_context::sender(ctx));
    
    // Borrow ids for event
    let oracle_id = object::id(&oracle);
    let registry_id = object::id(registry); // object::id(&T), so if you put &mut object in it, it will only reference it

    // Insert the oracle into the registry
    dof::add(&mut registry.id, pair_key, oracle);

    // Emit the oracle registeredevent
    event::emit(OracleRegisteredEvent {
        registry_id,
        oracle_id,
        pair: pair_key_event,
        timestamp: tx_context::epoch(ctx),
    });
}

public fun remove_oracle(
    _super_admin_cap: &po::SuperAdminCap,
    registry: &mut OracleRegistry,
    base: vector<u8>,
    quote: vector<u8>,
    ctx: &mut TxContext,
) {
    let pair_key = make_pair_key(base, quote);
    let pair_key_event = copy pair_key; // Event emission

    // Check existence
    assert!(dof::exists_<vector<u8>>(&registry.id, pair_key), EPairNotFound);

    // Remove oracle
    let oracle = dof::remove<vector<u8>, po::Oracle>(&mut registry.id, pair_key);
    // Get oracle id for the event
    let oracle_id = object::id(&oracle);
    // Borrow registry id for the event
    let registry_id = object::id(registry);

    // Transfer the ownership
    transfer::public_transfer(oracle, tx_context::sender(ctx));

    // Emit the remove event
    event::emit(OracleRemovedEvent {
        registry_id,
        oracle_id,
        pair: pair_key_event,
        timestamp: tx_context::epoch(ctx),
    });
}

// ============================================================================================================
// Oracle Information
// - Get & Update the information
// ============================================================================================================

// ---------- GET ----------
/// Get oracle helper function (I thought I can get an oracle object with CLI but I can't, so this is for get_oracle_price function)
public fun get_oracle(registry: &OracleRegistry, base: vector<u8>, quote: vector<u8>): &po::Oracle {
    let pair_key = make_pair_key(base, quote);
    assert!(dof::exists_<vector<u8>>(&registry.id, pair_key), EPairNotFound);

    dof::borrow<vector<u8>, po::Oracle>(&registry.id, pair_key)
    // <vector<u8>, po::Oracle> is to tell borrow what type of the key (get access to the target) is vector<u8> and value (the return value of target) is po::Oracle
    // Note: because borrow is a generic function so there are many types that can use borrow, tell it what type is using is neccessary
}

/// Get price
public fun get_oracle_price(registry: &OracleRegistry, base: vector<u8>, quote: vector<u8>): u64 {
    let oracle = get_oracle(registry, base, quote);
    po::get_price(oracle)
}

// ---------- UPDATE ----------
/// Helper function (In order to update the price you have to modify the registry so use &mut)
public fun get_oracle_mut(
    registry: &mut OracleRegistry,
    base: vector<u8>,
    quote: vector<u8>,
): &mut po::Oracle {
    let pair_key = make_pair_key(base, quote);
    assert!(dof::exists_<vector<u8>>(&registry.id, pair_key), EPairNotFound);
    dof::borrow_mut<vector<u8>, po::Oracle>(&mut registry.id, pair_key)
}

/// Update price
public fun update_oracle_price(
    registry: &mut OracleRegistry,
    admin_cap: &po::AdminCap,
    base: vector<u8>,
    quote: vector<u8>,
    new_price: u64,
    ctx: &mut TxContext,
) {
    let oracle = get_oracle_mut(registry, base, quote);
    po::update_price(
        admin_cap,
        oracle,
        new_price,
        ctx,
    )
}
// ============================================================================================================
// Oracle Coin
// - Withdraw_fees function
// - 
// ============================================================================================================

public fun withdraw_fees(
    _super_admin: &po::SuperAdminCap,
    registry: &mut OracleRegistry,
    amount: u64,
    ctx: &mut TxContext,
) {
    // Get the treasury amount
    let registry_treasury = balance::value(&registry.treasury);
    // Make sure it's able to be withdrawn
    assert!(registry_treasury >= amount, EFeeNotEnough);
    // Split the amount from treasury
    let withdrawn = balance::split(&mut registry.treasury, amount);
    // Turn balance to coin
    let coin_fee = coin::from_balance(withdrawn, ctx);
    // Transfer the coin object to the caller
    transfer::public_transfer(coin_fee, tx_context::sender(ctx));

    event::emit(WithdrawFeeEvent {
        amount,
        recipient: tx_context::sender(ctx),
        timestamp: tx_context::epoch(ctx),
    });
}