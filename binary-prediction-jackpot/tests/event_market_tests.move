#[test_only]
module sui_jackpot_market::event_market_tests;

use sui_jackpot_market::event_market::{Self, AdminCap, EventMarket, Invoice};
use sui::test_scenario::{Self as ts, Scenario};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::clock::{Self, Clock};
use sui::random::{Self, Random};
use std::string;

// Test helper to create a test scenario
fun setup_test(): (Scenario, address, address) {
    let admin = @0xAD;
    let user = @0xUSER;
    let scenario = ts::begin(admin);
    (scenario, admin, user)
}

#[test]
fun test_init() {
    let (mut scenario, admin, _user) = setup_test();
    
    // Initialize module
    {
        event_market::test_init(ts::ctx(&mut scenario));
    };
    
    // Check AdminCap was created
    ts::next_tx(&mut scenario, admin);
    {
        assert!(ts::has_most_recent_for_address<AdminCap>(admin), 0);
    };
    
    ts::end(scenario);
}

#[test]
fun test_create_market() {
    let (mut scenario, admin, _user) = setup_test();
    
    // Initialize
    {
        event_market::test_init(ts::ctx(&mut scenario));
    };
    
    // Create market
    ts::next_tx(&mut scenario, admin);
    {
        let admin_cap = ts::take_from_address<AdminCap>(&scenario, admin);
        let title = string::utf8(b"Will SUI reach $2?");
        
        event_market::create_market(
            &admin_cap,
            title,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_address(admin, admin_cap);
    };
    
    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = event_market::EEmptyTitle)]
fun test_create_market_empty_title() {
    let (mut scenario, admin, _user) = setup_test();
    
    // Initialize
    {
        event_market::test_init(ts::ctx(&mut scenario));
    };
    
    // Try to create market with empty title
    ts::next_tx(&mut scenario, admin);
    {
        let admin_cap = ts::take_from_address<AdminCap>(&scenario, admin);
        let title = string::utf8(b"");
        
        event_market::create_market(
            &admin_cap,
            title,
            ts::ctx(&mut scenario)
        );
        
        ts::return_to_address(admin, admin_cap);
    };
    
    ts::end(scenario);
}

// Note: Full property-based tests would require more complex setup
// with Clock and Random objects, which are system objects in Sui.
// For production, these tests should be expanded with proper mocking.
