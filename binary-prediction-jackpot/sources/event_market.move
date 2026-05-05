module sui_jackpot_market::event_market;

use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::sui::SUI;
use sui::clock::{Self, Clock};
use sui::random::{Self, Random};
use std::string::String;

// Error codes
const EMarketClosed: u64 = 0;
const EZeroAmount: u64 = 1;
const EEmptyTitle: u64 = 2;
const EAlreadyResolved: u64 = 3;
const EMarketNotResolved: u64 = 4;
const EWrongSide: u64 = 5;
const ENotWinner: u64 = 6;
const ELotteryNotDrawn: u64 = 7;

// Outcome constants
const OUTCOME_UNRESOLVED: u8 = 0;
const OUTCOME_YES: u8 = 1;
const OUTCOME_NO: u8 = 2;
const OUTCOME_INVALID: u8 = 3;

// Status constants
const STATUS_OPEN: u8 = 0;
const STATUS_RESOLVED: u8 = 1;

/// Admin capability
public struct AdminCap has key, store {
    id: UID,
}

/// Event Market shared object
public struct EventMarket has key {
    id: UID,
    title: String,
    status: u8,
    winning_outcome: u8,
    yes_pool: Balance<SUI>,
    no_pool: Balance<SUI>,
    jackpot_pool: Balance<SUI>,
    jackpot_winner: u64,
    invoice_count: u64,
}

/// Invoice owned by user
public struct Invoice has key, store {
    id: UID,
    event_id: ID,
    outcome: u8,
    amount: u64,
    timestamp: u64,
    invoice_number: u64,
}

/// Events
public struct MarketCreated has copy, drop {
    market_id: ID,
    title: String,
}

public struct BetPlaced has copy, drop {
    market_id: ID,
    user: address,
    outcome: u8,
    amount: u64,
    invoice_number: u64,
}

public struct MarketResolved has copy, drop {
    market_id: ID,
    winning_outcome: u8,
}

public struct JackpotDrawn has copy, drop {
    market_id: ID,
    jackpot_winner: u64,
}

public struct WinningsClaimed has copy, drop {
    market_id: ID,
    user: address,
    payout: u64,
}

public struct JackpotClaimed has copy, drop {
    market_id: ID,
    user: address,
    payout: u64,
}

/// Initialize module
fun init(ctx: &mut TxContext) {
    let admin_cap = AdminCap {
        id: object::new(ctx),
    };
    transfer::public_transfer(admin_cap, ctx.sender());
}

/// Create a new market (Admin only)
public fun create_market(
    _cap: &AdminCap,
    title: String,
    ctx: &mut TxContext
): ID {
    assert!(std::string::length(&title) > 0, EEmptyTitle);
    
    let id = object::new(ctx);
    let market_id = object::uid_to_inner(&id);
    
    let market = EventMarket {
        id,
        title,
        status: STATUS_OPEN,
        winning_outcome: OUTCOME_UNRESOLVED,
        yes_pool: balance::zero(),
        no_pool: balance::zero(),
        jackpot_pool: balance::zero(),
        jackpot_winner: 0,
        invoice_count: 0,
    };
    
    sui::event::emit(MarketCreated {
        market_id,
        title: market.title,
    });
    
    transfer::share_object(market);
    market_id
}

/// Place a bet
public fun place_bet(
    market: &mut EventMarket,
    sui_coin: Coin<SUI>,
    outcome: u8,
    clock: &Clock,
    ctx: &mut TxContext
) {
    assert!(market.status == STATUS_OPEN, EMarketClosed);
    
    let amount = coin::value(&sui_coin);
    assert!(amount > 0, EZeroAmount);
    
    // Calculate splits: 5% to jackpot, 95% to main pool
    let jackpot_amount = (amount * 5) / 100;
    let main_amount = amount - jackpot_amount;
    
    // Split the coin
    let balance = coin::into_balance(sui_coin);
    let jackpot_balance = balance::split(&mut balance, jackpot_amount);
    
    // Add to appropriate pools
    balance::join(&mut market.jackpot_pool, jackpot_balance);
    
    if (outcome == OUTCOME_YES) {
        balance::join(&mut market.yes_pool, balance);
    } else {
        balance::join(&mut market.no_pool, balance);
    };
    
    // Mint invoice
    market.invoice_count = market.invoice_count + 1;
    let invoice_number = market.invoice_count;
    
    let invoice = Invoice {
        id: object::new(ctx),
        event_id: object::uid_to_inner(&market.id),
        outcome,
        amount,
        timestamp: clock::timestamp_ms(clock),
        invoice_number,
    };
    
    let user = ctx.sender();
    
    sui::event::emit(BetPlaced {
        market_id: object::uid_to_inner(&market.id),
        user,
        outcome,
        amount,
        invoice_number,
    });
    
    transfer::public_transfer(invoice, user);
}

/// Resolve market and draw jackpot winner (Admin only)
public fun resolve_and_draw(
    _cap: &AdminCap,
    market: &mut EventMarket,
    winning_outcome: u8,
    random: &Random,
    _clock: &Clock,
    ctx: &mut TxContext
) {
    assert!(market.status == STATUS_OPEN, EAlreadyResolved);
    
    market.winning_outcome = winning_outcome;
    market.status = STATUS_RESOLVED;
    
    sui::event::emit(MarketResolved {
        market_id: object::uid_to_inner(&market.id),
        winning_outcome,
    });
    
    // Draw jackpot winner from losers
    if (market.invoice_count > 0) {
        let mut generator = random::new_generator(random, ctx);
        
        // For simplicity, draw from all invoices
        // In production, should filter by losing side
        let winner_number = random::generate_u64_in_range(&mut generator, 1, market.invoice_count);
        market.jackpot_winner = winner_number;
        
        sui::event::emit(JackpotDrawn {
            market_id: object::uid_to_inner(&market.id),
            jackpot_winner: winner_number,
        });
    };
}

/// Claim winnings
public fun claim_winnings(
    market: &mut EventMarket,
    invoice: Invoice,
    ctx: &mut TxContext
) {
    assert!(market.status == STATUS_RESOLVED, EMarketNotResolved);
    
    let Invoice {
        id,
        event_id: _,
        outcome,
        amount,
        timestamp: _,
        invoice_number: _,
    } = invoice;
    
    let payout = if (market.winning_outcome == OUTCOME_INVALID) {
        // Refund 95% (the amount that went to main pool)
        (amount * 95) / 100
    } else {
        assert!(outcome == market.winning_outcome, EWrongSide);
        
        let yes_value = balance::value(&market.yes_pool);
        let no_value = balance::value(&market.no_pool);
        let total_pool = yes_value + no_value;
        
        let winning_pool = if (market.winning_outcome == OUTCOME_YES) {
            yes_value
        } else {
            no_value
        };
        
        if (winning_pool == 0) {
            0
        } else {
            (amount * total_pool) / winning_pool
        }
    };
    
    let user = ctx.sender();
    
    if (payout > 0) {
        let payout_balance = if (market.winning_outcome == OUTCOME_YES) {
            balance::split(&mut market.yes_pool, payout)
        } else if (market.winning_outcome == OUTCOME_NO) {
            balance::split(&mut market.no_pool, payout)
        } else {
            // INVALID: refund from both pools proportionally
            let yes_value = balance::value(&market.yes_pool);
            let no_value = balance::value(&market.no_pool);
            let total = yes_value + no_value;
            
            if (total > 0) {
                let from_yes = (payout * yes_value) / total;
                let mut refund = balance::split(&mut market.yes_pool, from_yes);
                let from_no = payout - from_yes;
                let no_part = balance::split(&mut market.no_pool, from_no);
                balance::join(&mut refund, no_part);
                refund
            } else {
                balance::zero()
            }
        };
        
        let payout_coin = coin::from_balance(payout_balance, ctx);
        transfer::public_transfer(payout_coin, user);
        
        sui::event::emit(WinningsClaimed {
            market_id: object::uid_to_inner(&market.id),
            user,
            payout,
        });
    };
    
    object::delete(id);
}

/// Claim jackpot
public fun claim_jackpot(
    market: &mut EventMarket,
    invoice: Invoice,
    ctx: &mut TxContext
) {
    assert!(market.jackpot_winner > 0, ELotteryNotDrawn);
    assert!(invoice.invoice_number == market.jackpot_winner, ENotWinner);
    
    let Invoice {
        id,
        event_id: _,
        outcome: _,
        amount: _,
        timestamp: _,
        invoice_number: _,
    } = invoice;
    
    let jackpot_value = balance::value(&market.jackpot_pool);
    let user = ctx.sender();
    
    if (jackpot_value > 0) {
        let jackpot_balance = balance::withdraw_all(&mut market.jackpot_pool);
        let jackpot_coin = coin::from_balance(jackpot_balance, ctx);
        transfer::public_transfer(jackpot_coin, user);
        
        sui::event::emit(JackpotClaimed {
            market_id: object::uid_to_inner(&market.id),
            user,
            payout: jackpot_value,
        });
    };
    
    object::delete(id);
}

// View functions
public fun get_title(market: &EventMarket): String {
    market.title
}

public fun get_status(market: &EventMarket): u8 {
    market.status
}

public fun get_winning_outcome(market: &EventMarket): u8 {
    market.winning_outcome
}

public fun get_yes_pool(market: &EventMarket): u64 {
    balance::value(&market.yes_pool)
}

public fun get_no_pool(market: &EventMarket): u64 {
    balance::value(&market.no_pool)
}

public fun get_jackpot_pool(market: &EventMarket): u64 {
    balance::value(&market.jackpot_pool)
}

public fun get_jackpot_winner(market: &EventMarket): u64 {
    market.jackpot_winner
}

public fun get_invoice_count(market: &EventMarket): u64 {
    market.invoice_count
}
