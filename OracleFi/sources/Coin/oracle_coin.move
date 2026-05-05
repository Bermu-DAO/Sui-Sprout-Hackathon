module oracle_staking_pool::oracle_coin;

// ---------- Common Import ----------
use sui::coin::{Self, TreasuryCap, Coin};
use sui::table::{Self, Table};
use sui::clock::{Self, Clock};

// ---------- Struct ----------
/// OTW
public struct ORACLE_COIN has drop{}

// ---------- Const ----------
const COIN_LIMITATION: u64 = 1_000_000_000_000_000_000;
const FAUCET_AMOUNT: u64 = 100_000_000_000;
const COOLDOWN_MS: u64 = 24 * 60 * 60 * 1000;

/// Error Code
const ECoinOverLimit: u64 = 1;
const ECoinNotEnough: u64 = 2;
const EFaucetCooldown: u64 = 3;

public struct FaucetState has key {
    id: UID,
    last_claim: Table<address, u64>,
    treasury: TreasuryCap<ORACLE_COIN>,
}


// ============================================================================================================
// Oracle Coin
// - Mint & Burn
// - 
// ============================================================================================================
fun do_init(witness: ORACLE_COIN, ctx: &mut TxContext): TreasuryCap<ORACLE_COIN> {
    let (treasury_cap, metadata) =
    coin::create_currency(
        witness,
        9, // 1 OC = 1000000000
        b"OC",
        b"Oracle Coin",
        b"Coin for Oracle Registry Payment",
        option::none(),
        ctx
    );
    // Freeze the metadata (Turn it to immutable shared object)
    transfer::public_freeze_object(metadata);
    treasury_cap
}
// ---------- Create Coin ----------
fun init(witness: ORACLE_COIN, ctx: &mut TxContext) {
    // create coin
    let treasury_cap = do_init(witness, ctx);

    // Transfer the treasury cap to caller
    transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
}

public entry fun mint(
    cap: &mut TreasuryCap<ORACLE_COIN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    assert!(coin::total_supply(cap) + amount <= COIN_LIMITATION, ECoinOverLimit);
    coin::mint_and_transfer(
        cap,
        amount,
        recipient,
        ctx
    );
}

public entry fun burn(
    cap: &mut TreasuryCap<ORACLE_COIN>,
    mut coin: Coin<ORACLE_COIN>,
    amount: u64,
    ctx: &mut TxContext,
) {
    assert!(coin::value(&coin) >= amount, ECoinNotEnough);
    // If it still has coin, return it to the caller
    if (coin::value(&coin) == amount) {
        coin::burn(cap, coin);
    } else{
        // Split the part that need to be burned
        let burn_coin = coin::split(&mut coin, amount, ctx);
        coin::burn(cap, burn_coin);
        transfer::public_transfer(coin, tx_context::sender(ctx));
    }
}

// ============================================================================================================
// Faucet
// ============================================================================================================

public entry fun init_faucet(
    treasury: TreasuryCap<ORACLE_COIN>,
    ctx: &mut TxContext
) {
    let state = FaucetState {
        id: object::new(ctx),
        last_claim: table::new(ctx),
        treasury,
    };
    transfer::share_object(state);
}

public entry fun faucet(
    state: &mut FaucetState,
    clock: &Clock,
    ctx: &mut TxContext
) {
    let sender = tx_context::sender(ctx);
    let now = clock::timestamp_ms(clock);

    if (table::contains(&state.last_claim, sender)) {
        let last = *table::borrow(&state.last_claim, sender);
        assert!(now - last >= COOLDOWN_MS, EFaucetCooldown);
        let last_mut = table::borrow_mut(&mut state.last_claim, sender);
        *last_mut = now;
    } else {
        table::add(&mut state.last_claim, sender, now);
    };

    assert!(coin::total_supply(&state.treasury) + FAUCET_AMOUNT <= COIN_LIMITATION, ECoinOverLimit);
    let coin = coin::mint(&mut state.treasury, FAUCET_AMOUNT, ctx);
    transfer::public_transfer(coin, sender);
}

// ============================================================================================================
// Package-level Admin Mint (called by staking_pool::admin_mint)
// ============================================================================================================

/// Mint OC tokens from FaucetState treasury. Only callable by sibling modules in this package.
public(package) fun mint_from_faucet(
    state: &mut FaucetState,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext
) {
    assert!(coin::total_supply(&state.treasury) + amount <= COIN_LIMITATION, ECoinOverLimit);
    let coin = coin::mint(&mut state.treasury, amount, ctx);
    transfer::public_transfer(coin, recipient);
}

// ============================================================================================================
// Test-Only Functions
// - 
// - 
// ============================================================================================================

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ORACLE_COIN{}, ctx)
}