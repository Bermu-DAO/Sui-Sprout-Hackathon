module coc::profile {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};

    /// 錯誤碼
    const E_INVALID_AMOUNT: u64 = 2;

    /// 系統管理員權限憑證
    public struct AdminCap has key, store {
        id: UID,
    }

    /// 國庫共享物件，用於接收玩家註冊費
    public struct Treasury has key {
        id: UID,
        balance: Balance<SUI>,
    }

    /// 核心帳戶：一個錢包註冊一次，包含玩家與 KP 兩種維度的名聲。
    public struct CoreProfile has key, store {
        id: UID,
        owner: address,
        
        // 玩家維度 (Player Dimension)
        player_games_played: u64,
        player_reputation: u64,
        
        // 主持人維度 (Keeper Dimension)
        kp_games_hosted: u64,
        kp_reputation: u64,
        
        // 不良紀錄 (逃走次數是全域共用的污點)
        escape_count: u64,

        // 角色歷史英靈殿 (Life History / Valhalla)
        history: vector<LifeEvent>,
    }

    /// 角色生平事件 (SBT 紀錄形式)
    public struct LifeEvent has store, copy, drop {
        investigator_name: std::string::String,
        status: std::string::String, // "VALHALLA" (Dead) or "RETIRED"
        obituary: std::string::String,
        timestamp: u64,
    }

    /// 模組初始化：發行 AdminCap 與創建 Treasury
    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, tx_context::sender(ctx));
        transfer::share_object(Treasury {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
        });
    }

    /// 創建 / 註冊玩家的帳戶
    #[allow(lint(self_transfer))]
    public fun create_profile(
        treasury: &mut Treasury,
        payment: Coin<SUI>, 
        ctx: &mut TxContext
    ) {
        // 規定註冊手續費為 0.1 SUI (100_000_000 MIST)
        let required_fee = 100_000_000;
        assert!(coin::value(&payment) == required_fee, E_INVALID_AMOUNT);

        // 將註冊費存入國庫
        coin::put(&mut treasury.balance, payment);

        let profile = CoreProfile {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            player_games_played: 0,
            player_reputation: 100, // 初始分，滿分為 100
            kp_games_hosted: 0,
            kp_reputation: 100,     // 初始分
            escape_count: 0,
            history: vector::empty<LifeEvent>(),
        };

        transfer::transfer(profile, tx_context::sender(ctx));
    }

    /// 管理員提款
    #[allow(lint(self_transfer))]
    public fun withdraw_fees(
        _cap: &AdminCap,
        treasury: &mut Treasury,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let extracted = coin::take(&mut treasury.balance, amount, ctx);
        transfer::public_transfer(extracted, tx_context::sender(ctx));
    }

    // --- Authorized System Functions (Gatekept by logical module flow) ---

    /// 更新聲譽 (由 coc_scenario 呼叫)
    public(package) fun update_reputation(
        profile: &mut CoreProfile,
        is_kp: bool,
        delta: u64,
        is_negative: bool,
        game_finished: bool
    ) {
        if (is_kp) {
            if (game_finished) profile.kp_games_hosted = profile.kp_games_hosted + 1;
            profile.kp_reputation = apply_delta(profile.kp_reputation, delta, is_negative);
        } else {
            if (game_finished) profile.player_games_played = profile.player_games_played + 1;
            profile.player_reputation = apply_delta(profile.player_reputation, delta, is_negative);
        };
    }

    /// 紀錄逃跑汙點
    public(package) fun record_escape(profile: &mut CoreProfile) {
        profile.escape_count = profile.escape_count + 1;
    }

    /// 紀錄英靈殿成就 (角色死亡或退休)
    public(package) fun record_life_event(
        profile: &mut CoreProfile,
        name: std::string::String,
        status: std::string::String,
        obituary: std::string::String,
        ts: u64
    ) {
        let event = LifeEvent {
            investigator_name: name,
            status,
            obituary,
            timestamp: ts,
        };
        vector::push_back(&mut profile.history, event);
    }

    // --- Internal Helpers ---

    fun apply_delta(current: u64, delta: u64, is_negative: bool): u64 {
        if (!is_negative) {
            let result = current + delta;
            if (result > 100) 100 else result
        } else {
            if (current < delta) 0 else current - delta
        }
    }
}
