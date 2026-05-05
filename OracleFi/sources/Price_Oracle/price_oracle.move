// Purpose: Allow everyone can see the price, but only admin can update it

module oracle_staking_pool::price_oracle;

use std::string::String;
use sui::event;

// Errors
const EAdminsOverLimit: u64 = 0;

// Struct
/// SuperAdminCap
public struct SuperAdminCap has key, store {
    id: UID,
}
/// AdminCap
public struct AdminCap has key, store {
    id: UID,
}
/// Oracle
public struct Oracle has key, store {
    id: UID,
    pair: String, // ex. BTC/USDT
    price: u64,
    decimals: u8,
    last_updated: u64, // epoch timestamp
    admin_minted: u64,
    admin_limit: u64,
}
/// Price update event
public struct PriceUpdateEvent has copy, drop {
    pair: String,
    old_price: u64,
    new_price: u64,
    timestamp: u64,
}

// Initialise Oracle
/// 20260103 Isolated function to make new oracle
public fun new_oracle(
    pair: String,
    initial_price: u64,
    decimals: u8,
    admin_limit: u64,
    ctx: &mut TxContext,
): (Oracle, SuperAdminCap, AdminCap) {
    // Struct instances (super and normal admin)
    let super_admin_cap = SuperAdminCap {
        id: object::new(ctx),
    };
    let admin_cap = AdminCap {
        id: object::new(ctx),
    };

    // Create the oracle (Struct instance)
    let oracle = Oracle {
        id: object::new(ctx),
        pair,
        price: initial_price,
        decimals,
        admin_minted: 1, // Founder has 1
        admin_limit,
        last_updated: tx_context::epoch(ctx), // Get the current epoch time
    };
    // Return the created oracle and admin caps
    (oracle, super_admin_cap, admin_cap)
}

/// Public function to create oracle (If there is no return value, it can be an entry function)
public fun create_oracle(
    pair: String,
    initial_price: u64,
    decimals: u8,
    admin_limit: u64,
    ctx: &mut TxContext,
) {
    // Create the oracle (Struct instance)
    let (oracle, super_admin_cap, admin_cap) = new_oracle(
        pair,
        initial_price,
        decimals,
        admin_limit,
        ctx,
    );

    transfer::public_transfer(super_admin_cap, tx_context::sender(ctx));
    transfer::public_transfer(admin_cap, tx_context::sender(ctx));
    transfer::share_object(oracle);
}

// Super admin authority (add admin and increase admin limit)
public fun add_admin(
    _superadmin: &SuperAdminCap,
    oracle: &mut Oracle,
    receiver: address,
    ctx: &mut TxContext,
) {
    assert!(oracle.admin_minted < oracle.admin_limit, EAdminsOverLimit);
    // If not over limit
    oracle.admin_minted = oracle.admin_minted + 1;
    let new_admin_cap = AdminCap { id: object::new(ctx) };
    transfer::public_transfer(new_admin_cap, receiver);
}

public fun increase_admin_limit(_superadmin: &SuperAdminCap, oracle: &mut Oracle, new_limit: u64) {
    oracle.admin_limit = new_limit;
}

// Public function to update the price (Normal Admin)
public fun update_price(
    _admin: &AdminCap, // Validate the admin cap, the logic is if you need to borrow one, you have to have one (The underline before admin is to avoid unused warning cos this is just for the validation.)
    oracle: &mut Oracle,
    new_price: u64,
    ctx: &mut TxContext,
) {
    // Record the old price
    let old_price = oracle.price;
    // Update the price
    oracle.price = new_price;
    // Update the last updated time
    oracle.last_updated = tx_context::epoch(ctx);

    // Emit the event
    event::emit(PriceUpdateEvent {
        pair: oracle.pair,
        old_price,
        new_price,
        timestamp: oracle.last_updated,
    });
}

// Public function to get info of the oracle (Everyone can access)
public fun get_price(oracle: &Oracle): u64 {
    oracle.price
}

public fun get_pair(oracle: &Oracle): String {
    oracle.pair
}

public fun get_last_update(oracle: &Oracle): u64 {
    oracle.last_updated
}

public fun get_decimals(oracle: &Oracle): u8 {
    oracle.decimals
}

/// Check if price is fresh (not stale)
public fun is_fresh(oracle: &Oracle, max_age: u64, ctx: &TxContext): bool {
    let now = tx_context::epoch(ctx);
    if (now < oracle.last_updated) {
        return false
    };

    let age = now - oracle.last_updated;
    age <= max_age
}
