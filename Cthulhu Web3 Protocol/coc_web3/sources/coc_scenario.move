module coc::scenario {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::dynamic_object_field as dof;
    use std::string::String;
    use coc::investigator::{Self, Investigator};
    use coc::profile::{Self, CoreProfile};

    /// 錯誤碼
    const E_NOT_ENOUGH_DEPOSIT: u64 = 1;
    const E_SCENARIO_NOT_ACTIVE: u64 = 3;
    const E_EARLY_TERMINATION_NOT_ALLOWED: u64 = 4; // 時間鎖未到期，禁止惡意解散
    const E_NOT_AUTHORIZED_VOTER: u64 = 5;
    const E_NOT_KP: u64 = 6;
    const E_PLAYER_NOT_IN_SCENARIO: u64 = 7;

    /// 玩家的抽象帳戶，紀錄評分與逃跑次數
    public struct PlayerProfile has key, store {
        id: UID,
        player_address: address,
        reputation_score: u64, // 玩家信譽積分
        escape_count: u64,     // 全域逃跑紀錄
    }

    /// 劇本物件
    public struct Scenario has key {
        id: UID,
        kp: address,                 // 主持人
        title: String,               // 劇本名稱
        max_players: u8,
        active: bool,                // 劇本是否在進行中
        time_lock_ms: u64,           // 劇本預計結團的時間戳記 (毫秒)，超過此時間才允許玩家發起強制解散
        kp_deposit: Balance<SUI>,    // KP的保證金質押
        entry_fee_amount: u64,       // 報名費定價
        player_deposit_amount: u64,  // 玩家需質押的保證金定價

        // 管理玩家名單與資金
        // 儲存玩家的角色卡 ID (用於迭代檢索與結算)
        players_locked: vector<ID>,
        // 映射角色卡 ID 到其主人的地址 (用於返還資金)
        player_addresses: Table<ID, address>,
        escrow_vault: Balance<SUI>,  // 暫存玩家的報名費+質押金
        
        // 多簽解散投票 (紀錄投票的角色卡 ID)
        termination_votes: Table<ID, bool>, 
        votes_count: u64,
        
        // 結團狀態
        is_settled: bool,
    }

    /// 結團報告條目
    #[allow(unused_field)]
    public struct InvestigatorReport has copy, drop, store {
        investigator_id: ID,
        is_alive: bool,
        san_change: u8,
        san_is_negative: bool,
        health_change: u8,
        health_is_negative: bool,
        reputation_delta: u64,
        reputation_is_negative: bool,
        obituary: String,
    }

    /// 事件：劇本創建
    public struct ScenarioCreated has copy, drop {
        scenario_id: ID,
        kp: address,
        time_lock_end: u64,
    }

    public struct ScenarioSettled has copy, drop {
        scenario_id: ID,
        kp: address,
    }

    public struct PlayerForceQuit has copy, drop {
        scenario_id: ID,
        player: address,
        investigator_id: ID,
    }

    public struct ScenarioTerminated has copy, drop {
        scenario_id: ID,
    }

    /// 建立玩家抽象帳戶 (Player Profile)
    #[allow(lint(self_transfer))]
    public fun create_profile(ctx: &mut TxContext) {
        let profile = PlayerProfile {
            id: object::new(ctx),
            player_address: tx_context::sender(ctx),
            reputation_score: 100,
            escape_count: 0,
        };
        transfer::public_transfer(profile, tx_context::sender(ctx));
    }

    /// KP 創建劇本，必須鎖入保證金 (Dual-Staking) 並且設定約定好的遊戲時長
    public fun create_scenario(
        title: String,
        max_players: u8,
        entry_fee_amount: u64,
        player_deposit_amount: u64,
        expected_duration_ms: u64, // 預估跑團天數轉換成的毫秒數
        kp_coin: Coin<SUI>,        // KP必須質押代幣
        clock: &Clock,             // 傳入 Sui 節點的時間物件
        ctx: &mut TxContext
    ) {
        // 假設 KP 必須質押至少報名費的兩倍作為誠意
        assert!(coin::value(&kp_coin) >= entry_fee_amount * 2, E_NOT_ENOUGH_DEPOSIT);

        // 設定時間鎖，當下時間 + 預計遊戲時長
        let time_lock = clock::timestamp_ms(clock) + expected_duration_ms;

        let scenario = Scenario {
            id: object::new(ctx),
            kp: tx_context::sender(ctx),
            title,
            max_players,
            active: true,
            time_lock_ms: time_lock,
            kp_deposit: coin::into_balance(kp_coin),
            entry_fee_amount,
            player_deposit_amount,
            players_locked: vector::empty<ID>(),
            player_addresses: table::new(ctx),
            escrow_vault: balance::zero(),
            termination_votes: table::new(ctx),
            votes_count: 0,
            is_settled: false,
        };

        event::emit(ScenarioCreated {
            scenario_id: object::uid_to_inner(&scenario.id),
            kp: tx_context::sender(ctx),
            time_lock_end: time_lock,
        });

        transfer::share_object(scenario);
    }

    /// 玩家申請加入劇本，需抵押代幣與鎖定角色卡
    public fun join_scenario(
        scenario: &mut Scenario,
        investigator: Investigator,
        payment_coin: Coin<SUI>, 
        ctx: &mut TxContext
    ) {
        assert!(scenario.active, E_SCENARIO_NOT_ACTIVE);
        let total_required = scenario.entry_fee_amount + scenario.player_deposit_amount;
        assert!(coin::value(&payment_coin) >= total_required, E_NOT_ENOUGH_DEPOSIT);

        // 收取玩家款項
        balance::join(&mut scenario.escrow_vault, coin::into_balance(payment_coin));

        let inv_id = object::id(&investigator);
        vector::push_back(&mut scenario.players_locked, inv_id);
        table::add(&mut scenario.player_addresses, inv_id, tx_context::sender(ctx));

        // 鎖定角色卡至 Scenario 內
        dof::add(&mut scenario.id, inv_id, investigator);
    }

    /// 多簽解散投票 (Multi-sig Termination) + 時間鎖防禦
    /// 只有在 KP 拖延不結算，導致 `time_lock_ms` 超時後，玩家發動才有效。
    public fun vote_terminate(
        scenario: &mut Scenario,
        inv_id: ID,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // [關鍵防禦]：時間鎖防護，如果時間還沒超過 KP 承諾的時長，禁止發起解散，保護 KP 不被惡意結黨坑殺
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time > scenario.time_lock_ms, E_EARLY_TERMINATION_NOT_ALLOWED);

        // 確認發起人是該角色卡原本的主人
        assert!(table::contains(&scenario.player_addresses, inv_id), E_NOT_AUTHORIZED_VOTER);
        let owner = *table::borrow(&scenario.player_addresses, inv_id);
        assert!(owner == tx_context::sender(ctx), E_NOT_AUTHORIZED_VOTER);

        // 加入投票陣列
        if (!table::contains(&scenario.termination_votes, inv_id)) {
            table::add(&mut scenario.termination_votes, inv_id, true);
            scenario.votes_count = scenario.votes_count + 1;
        };

        // 檢查是否大於一半的玩家投票，若過半則啟動無條件退卡與分發 KP 保證金的邏輯
        if (scenario.votes_count > (vector::length(&scenario.players_locked) / 2)) {
            terminate_scenario_internal(scenario, ctx);
        };
    }

    /// KP 提交結團報告 (Closing Report)
    /// 更新所有角色的數值，並決定是否銷毀 (撕卡)
    public fun submit_closing_report(
        scenario: &mut Scenario,
        reports: vector<InvestigatorReport>,
        _clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == scenario.kp, E_NOT_KP);
        assert!(scenario.active, E_SCENARIO_NOT_ACTIVE);
        assert!(!scenario.is_settled, E_SCENARIO_NOT_ACTIVE);

        let mut i = 0;
        let len = vector::length(&reports);
        while (i < len) {
            let report = vector::borrow(&reports, i);
            let inv_id = report.investigator_id;
            
            if (table::contains(&scenario.player_addresses, inv_id)) {
                let investigator = dof::borrow_mut<ID, Investigator>(&mut scenario.id, inv_id);
                
                // 1. 更新數值
                let current_san = investigator::get_san(investigator);
                let new_san = if (!report.san_is_negative) {
                    current_san + report.san_change
                } else {
                    if (current_san < report.san_change) 0 else current_san - report.san_change
                };
                investigator::set_san(investigator, new_san);

                // 2. 判斷生死與英靈殿紀錄
                // 這裡簡化邏輯：如果 is_alive 為 false，則執行銷毀並在 Profile 留下遺跡
                // (實際銷毀在 settle 時執行，此處僅標記或在此處即刻執行)
            };
            i = i + 1;
        }
    }

    /// KP 正常結算劇本，退還所有抵押並發放獎勵
    public fun kp_settle_scenario(
        scenario: &mut Scenario,
        reports: vector<InvestigatorReport>, // 結算時同時傳入報告以獲取聲譽與生死資訊
        player_profiles: &mut Table<address, CoreProfile>, // 需傳入 Profile Table 以更新
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == scenario.kp, E_NOT_KP);
        assert!(scenario.active, E_SCENARIO_NOT_ACTIVE);
        
        scenario.active = false;
        scenario.is_settled = true;

        let mut reports_map = table::new<ID, InvestigatorReport>(ctx);
        let mut j = 0;
        while (j < vector::length(&reports)) {
            let r = *vector::borrow(&reports, j);
            table::add(&mut reports_map, r.investigator_id, r);
            j = j + 1;
        };

        // 退還所有玩家的角色卡與押金，並更新聲望
        while (!vector::is_empty(&scenario.players_locked)) {
            let inv_id = vector::pop_back(&mut scenario.players_locked);
            let player_addr = table::remove(&mut scenario.player_addresses, inv_id);
            
            let investigator = dof::remove<ID, Investigator>(&mut scenario.id, inv_id);
            
            // 獲取該角色的結算報告
            if (table::contains(&reports_map, inv_id)) {
                let r = table::borrow(&reports_map, inv_id);
                
                // 更新 Profile (聲譽與傳奇歷史)
                if (table::contains(player_profiles, player_addr)) {
                    let profile = table::borrow_mut(player_profiles, player_addr);
                    profile::update_reputation(
                        profile, 
                        false, 
                        r.reputation_delta, 
                        r.reputation_is_negative,
                        true
                    );

                    if (!r.is_alive) {
                        // 撕卡邏輯：NFT 直接銷毀，紀錄進英靈殿
                        profile::record_life_event(
                            profile, 
                            investigator::name(&investigator),
                            std::string::utf8(b"VALHALLA"),
                            r.obituary,
                            clock::timestamp_ms(clock)
                        );
                        // Investigator 在此正式銷毀 (撕卡)
                        investigator::burn_investigator(investigator); 
                    } else {
                        // 生還邏輯：退回 NFT
                        transfer::public_transfer(investigator, player_addr);
                    };
                } else {
                     // 萬一沒 Profile (理論上不應發生)，保險退回卡片
                     transfer::public_transfer(investigator, player_addr);
                };
            } else {
                // 無報告，預設退回
                transfer::public_transfer(investigator, player_addr);
            };

            // 退還押金 (entry_fee + deposit)
            let total_return = scenario.entry_fee_amount + scenario.player_deposit_amount;
            let player_refund = coin::take(&mut scenario.escrow_vault, total_return, ctx);
            transfer::public_transfer(player_refund, player_addr);
        };

        // 退還 KP 的押金並更新 KP 聲望
        if (table::contains(player_profiles, scenario.kp)) {
            let kp_pro = table::borrow_mut(player_profiles, scenario.kp);
            profile::update_reputation(kp_pro, true, 10, false, true); // 默認順利結團 +10
        };

        let kp_refund_amount = balance::value(&scenario.kp_deposit);
        let kp_refund = coin::take(&mut scenario.kp_deposit, kp_refund_amount, ctx);
        transfer::public_transfer(kp_refund, scenario.kp);

        table::drop(reports_map);

        event::emit(ScenarioSettled {
            scenario_id: object::uid_to_inner(&scenario.id),
            kp: scenario.kp,
        });
    }

    /// 玩家強制退出 (懲罰機制)
    public fun force_quit(
        scenario: &mut Scenario,
        inv_id: ID,
        ctx: &mut TxContext
    ) {
        assert!(scenario.active, E_SCENARIO_NOT_ACTIVE);
        assert!(table::contains(&scenario.player_addresses, inv_id), E_PLAYER_NOT_IN_SCENARIO);
        
        let player_addr = table::remove(&mut scenario.player_addresses, inv_id);
        assert!(player_addr == tx_context::sender(ctx), E_NOT_AUTHORIZED_VOTER);

        // 從玩家清單中移除 (手動手動尋找索引)
        let mut i = 0;
        let len = vector::length(&scenario.players_locked);
        while (i < len) {
            if (*vector::borrow(&scenario.players_locked, i) == inv_id) {
                vector::remove(&mut scenario.players_locked, i);
                break
            };
            i = i + 1;
        };

        // 懲罰：資金留在 escrow_vault 歸 KP (或依協議分配)，此處暫時留在合約中
        // 未來可在 settle 時撥給 KP

        // 退還 Investigator NFT
        let investigator = dof::remove<ID, Investigator>(&mut scenario.id, inv_id);
        transfer::public_transfer(investigator, player_addr);

        event::emit(PlayerForceQuit {
            scenario_id: object::uid_to_inner(&scenario.id),
            player: player_addr,
            investigator_id: inv_id,
        });
    }

    /// 內部函數：強制解散劇本並分配 KP 押金給玩家
    fun terminate_scenario_internal(scenario: &mut Scenario, ctx: &mut TxContext) {
        scenario.active = false;

        let total_players = vector::length(&scenario.players_locked);
        
        // KP 押金分紅給沒跳車的玩家
        let kp_bonus_total = balance::value(&scenario.kp_deposit);
        let share = if (total_players > 0) { kp_bonus_total / (total_players as u64) } else { 0 };

        while (!vector::is_empty(&scenario.players_locked)) {
            let inv_id = vector::pop_back(&mut scenario.players_locked);
            let player_addr = table::remove(&mut scenario.player_addresses, inv_id);

            // 退還 Investigator
            let investigator = dof::remove<ID, Investigator>(&mut scenario.id, inv_id);
            transfer::public_transfer(investigator, player_addr);

            // 退還玩家自己的押金
            let player_refund_amount = scenario.entry_fee_amount + scenario.player_deposit_amount;
            let player_refund = coin::take(&mut scenario.escrow_vault, player_refund_amount, ctx);
            transfer::public_transfer(player_refund, player_addr);

            // 分配 KP 押金作為補償
            if (share > 0) {
                let bonus = coin::take(&mut scenario.kp_deposit, share, ctx);
                transfer::public_transfer(bonus, player_addr);
            };
        };

        // 剩餘殘渣 (若有) 給黑洞
        let remaining = balance::value(&scenario.kp_deposit);
        if (remaining > 0) {
            let trash = coin::take(&mut scenario.kp_deposit, remaining, ctx);
            transfer::public_transfer(trash, @0x0);
        };

        event::emit(ScenarioTerminated {
            scenario_id: object::uid_to_inner(&scenario.id),
        });
    }

    // GameFi - 商店與經濟循環 (Token Sink) (Commented out until Phase 2)
    /*
    public fun buy_sanity_potion(
        investigator: &mut Investigator,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let cost = 1000_000_000; 
        assert!(coin::value(&payment) >= cost, 0);

        let current_san = coc::investigator::get_san(investigator); 
        coc::investigator::set_san(investigator, current_san + 5);

        transfer::public_transfer(payment, @0x0); 
    }
    */
}
