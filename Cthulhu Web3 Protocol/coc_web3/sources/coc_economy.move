module coc::economy {
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::url;

    /// Game Token (GT) - Distributed as rewards and used for rerolls/items.
    public struct ECONOMY has drop {}

    /// Treasury for the Game Token
    public struct GameTreasury has key {
        id: UID,
        supply: TreasuryCap<ECONOMY>,
        reserve: Balance<SUI>,
    }

    #[allow(deprecated_usage)]
    fun init(otw: ECONOMY, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            otw,
            9,
            b"GT",
            b"Game Token",
            b"Utility token for CoC-W3P specialized actions.",
            std::option::some(url::new_unsafe_from_bytes(b"https://cthulhu-protocol.io/token.png")),
            ctx
        );
        transfer::public_freeze_object(metadata);
        
        transfer::share_object(GameTreasury {
            id: object::new(ctx),
            supply: treasury_cap,
            reserve: balance::zero<SUI>(),
        });
    }

    /// Minting logic (deferred or mock for now)
    public(package) fun mint_reward(treasury: &mut GameTreasury, amount: u64, recipient: address, ctx: &mut TxContext) {
        let coins = coin::mint(&mut treasury.supply, amount, ctx);
        transfer::public_transfer(coins, recipient);
    }

    /// Burning logic
    public fun burn_token(treasury: &mut GameTreasury, tokens: Coin<ECONOMY>) {
        coin::burn(&mut treasury.supply, tokens);
    }

    // --- Mock Oracle Integration ---
    
    /// Estimated SUI/USDC price logic (to be replaced by Pyth)
    /// Returns price in 10^8 format (like Pyth)
    public fun get_mock_sui_price(): u64 {
        1_500_000_00 // $1.50
    }

    /// Calculate cost based on SUI price
    public fun calculate_token_cost(usdc_target: u64): u64 {
        let sui_price = get_mock_sui_price();
        // usdc_target in cents (10^2), sui_price (10^8)
        // result in MIST (10^9)
        (usdc_target * 1000_000_000) / sui_price
    }
}
