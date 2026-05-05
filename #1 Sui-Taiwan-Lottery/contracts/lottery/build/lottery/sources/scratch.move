module lottery::scratch {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::event;
    use sui::object::UID;
    use sui::random::Random;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use std::option;
    use std::vector;

    const E_NOT_OWNER: u64 = 1;
    const E_INVALID_PRICE: u64 = 2;
    const E_INVALID_CARD: u64 = 3;
    const E_ALREADY_SETTLED: u64 = 4;
    const E_NOT_BUYER: u64 = 5;
    const E_INSUFFICIENT_VAULT: u64 = 6;

    const BOARD_SIZE: u64 = 9;
    // TWD is represented in cent units (2 decimals): NT$200.00 => 20000
    const PRICE_200_TWD_CENT: u64 = 20_000;
    const PRICE_500_TWD_CENT: u64 = 50_000;
    const PRICE_2000_TWD_CENT: u64 = 200_000;

    public struct SCRATCH has drop {}

    public struct TwdBank has key {
        id: UID,
        admin: address,
        treasury_cap: TreasuryCap<SCRATCH>,
    }

    public struct ScratchLottery has key {
        id: UID,
        owner: address,
        vault: Balance<SCRATCH>,
        total_revenue: u64,
        total_payouts: u64,
        round: u64,
        card_count: u64,
    }

    public struct ScratchCard has key {
        id: UID,
        buyer: address,
        round: u64,
        card_id: u64,
        board: vector<u64>,
        price_tier: u64,
        result_payout: u64,
        is_settled: bool,
    }

    public struct CardPurchased has copy, drop {
        buyer: address,
        card_id: u64,
        price_tier: u64,
        payout_mist: u64,
        round: u64,
    }

    public struct CardSettled has copy, drop {
        card_id: u64,
        buyer: address,
        payout_mist: u64,
        round: u64,
    }

    fun init(witness: SCRATCH, ctx: &mut TxContext) {
        let owner = sui::tx_context::sender(ctx);

        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            2,
            b"TWD",
            b"Taiwan Dollar Test Token",
            b"Lottery in-game currency for testnet",
            option::none(),
            ctx,
        );

        transfer::public_freeze_object(metadata);

        let bank = TwdBank {
            id: sui::object::new(ctx),
            admin: owner,
            treasury_cap,
        };

        let lottery = ScratchLottery {
            id: sui::object::new(ctx),
            owner,
            vault: balance::zero<SCRATCH>(),
            total_revenue: 0,
            total_payouts: 0,
            round: 1,
            card_count: 0,
        };
        transfer::share_object(bank);
        sui::transfer::share_object(lottery);
    }

    /// Public faucet for judges/players to claim test TWD.
    public fun claim_test_twd(
        bank: &mut TwdBank,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let coin = coin::mint(&mut bank.treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    fun get_price_for_tier(tier: u64): u64 {
        if (tier == 1) {
            PRICE_500_TWD_CENT
        } else if (tier == 2) {
            PRICE_2000_TWD_CENT
        } else {
            PRICE_200_TWD_CENT
        }
    }

    fun get_payout_multiplier(tier_level: u64): u64 {
        if (tier_level == 3) {
            120
        } else if (tier_level == 2) {
            110
        } else if (tier_level == 1) {
            105
        } else {
            100
        }
    }

    fun draw_winning_odds(random: &Random, ctx: &mut TxContext): u64 {
        let mut gen = sui::random::new_generator(random, ctx);
        let roll = (sui::random::generate_u32(&mut gen) as u64) % 10000;
        if (roll < 25) {
            10
        } else if (roll < 120) {
            20
        } else if (roll < 350) {
            50
        } else {
            0
        }
    }

    fun create_board(random: &Random, has_jackpot: bool, ctx: &mut TxContext): vector<u64> {
        let mut board = vector::empty<u64>();
        let mut gen = sui::random::new_generator(random, ctx);
        let mut idx = 0;

        while (idx < BOARD_SIZE) {
            let val = (sui::random::generate_u32(&mut gen) as u64) % 5;
            vector::push_back(&mut board, val);
            idx = idx + 1;
        };

        if (has_jackpot) {
            let winning_idx = (sui::random::generate_u32(&mut gen) as u64) % BOARD_SIZE;
            *vector::borrow_mut(&mut board, winning_idx) = 99;
        };

        board
    }

    public fun buy_scratch_card(
        lottery: &mut ScratchLottery,
        random: &Random,
        payment: Coin<SCRATCH>,
        ticket_tier: u64,
        player_tier: u64,
        ctx: &mut TxContext,
    ) {
        let expected_price = get_price_for_tier(ticket_tier);
        let paid = coin::value(&payment);

        assert!(paid == expected_price, E_INVALID_PRICE);

        let odds_multiplier = draw_winning_odds(random, ctx);
        let tier_bonus = get_payout_multiplier(player_tier);
        let final_multiplier = (odds_multiplier * tier_bonus) / 100;
        let payout = (expected_price * final_multiplier) / 10;

        let has_jackpot = payout > 0;
        let board = create_board(random, has_jackpot, ctx);

        balance::join(&mut lottery.vault, coin::into_balance(payment));
        lottery.total_revenue = lottery.total_revenue + expected_price;
        lottery.card_count = lottery.card_count + 1;

        let card = ScratchCard {
            id: sui::object::new(ctx),
            buyer: sui::tx_context::sender(ctx),  
            round: lottery.round,
            card_id: lottery.card_count,
            board,
            price_tier: ticket_tier,
            result_payout: payout,
            is_settled: false,
        };

        event::emit(CardPurchased {
            buyer: sui::tx_context::sender(ctx),
            card_id: lottery.card_count,
            price_tier: ticket_tier,
            payout_mist: payout,
            round: lottery.round,
        });

        sui::transfer::transfer(card, sui::tx_context::sender(ctx));
    }

    public fun settle_scratch(
        lottery: &mut ScratchLottery,
        card: &mut ScratchCard,
        ctx: &mut TxContext,
    ) {
        assert!(!card.is_settled, E_ALREADY_SETTLED);
        assert!(sui::tx_context::sender(ctx) == card.buyer, E_NOT_BUYER);
        assert!(card.result_payout > 0, E_INVALID_CARD);
        assert!(balance::value(&lottery.vault) >= card.result_payout, E_INSUFFICIENT_VAULT);

        let payout_amount = card.result_payout;
        card.is_settled = true;

        let payout_coin = coin::from_balance(
            balance::split(&mut lottery.vault, payout_amount),
            ctx
        );

        lottery.total_payouts = lottery.total_payouts + payout_amount;

        event::emit(CardSettled {
            card_id: card.card_id,
            buyer: card.buyer,
            payout_mist: payout_amount,
            round: card.round,
        });

        sui::transfer::public_transfer(payout_coin, card.buyer);
    }

    public fun new_round(
        lottery: &mut ScratchLottery,
        ctx: &mut TxContext,
    ) {
        assert!(sui::tx_context::sender(ctx) == lottery.owner, E_NOT_OWNER);
        lottery.round = lottery.round + 1;
    }

    /// 合約擁有者可以手動注入資金到獎金池 (Vault)
    public fun top_up(
        lottery: &mut ScratchLottery,
        payment: Coin<SCRATCH>,
        _ctx: &mut TxContext,
    ) {
        balance::join(&mut lottery.vault, coin::into_balance(payment));
    }

    /// 合約擁有者可以提取獎金池中的資金 (例如回收盈餘)
    public fun withdraw(
        lottery: &mut ScratchLottery,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        assert!(sui::tx_context::sender(ctx) == lottery.owner, E_NOT_OWNER);
        assert!(balance::value(&lottery.vault) >= amount, E_INSUFFICIENT_VAULT);
        
        let withdrawn_coin = coin::from_balance(
            balance::split(&mut lottery.vault, amount),
            ctx
        );
        sui::transfer::public_transfer(withdrawn_coin, lottery.owner);
    }
}