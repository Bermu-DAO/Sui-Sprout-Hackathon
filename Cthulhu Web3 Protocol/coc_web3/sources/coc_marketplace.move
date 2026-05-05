module coc::marketplace {
    use sui::table::{Self, Table};
    use sui::event;
    
    // 假設引用前文的 scenario 模組
    // use coc::scenario::{Self, Scenario, PlayerProfile};

    /// 自訂錯誤碼
    const E_NOT_AUTHORIZED: u64 = 1;         // 不是劇本主持人
    const E_REPUTATION_TOO_LOW: u64 = 2;     // 名譽分過低，禁止霸佔市集版面

    /// 劇本市集（大廳），作為讓前端 DApp 呈現列表的全局物件
    public struct Marketplace has key {
        id: UID,
        // 紀錄目前所有正在大廳招募中的劇本 (Key: 劇本 ID, Value: 主持人 Address)
        open_scenarios: Table<ID, address>,
        // 全局累積統計（可以作為平台營運指標）
        total_listings: u64,
    }

    /// 事件：劇本正式登上大廳
    public struct ScenarioListed has copy, drop {
        scenario_id: ID,
        kp: address,
    }

    /// 模組初始化：合約上鏈部署時，自動向全網初始化唯一的一個公用劇本大廳
    fun init(ctx: &mut TxContext) {
        let marketplace = Marketplace {
            id: object::new(ctx),
            open_scenarios: table::new(ctx),
            total_listings: 0,
        };
        // 分享物件讓所有人都能讀取與寫入（需要透過定義好的函數寫入）
        transfer::share_object(marketplace);
    }

    /// KP 將已經創建好的劇本 (Scenario) 推送/上架到大廳，供陌生玩家搜尋報名
    /// （為確保編譯順利，這裡將原本應傳入的實際物件型別改為泛用參數與模擬數值作為概念呈現）
    public fun list_scenario(
        marketplace: &mut Marketplace,
        scenario_id: ID, // 劇本物件的 ID
        is_owner: bool,  // 理想中為 `coc::scenario::is_kp(scenario, sender)`
        kp_reputation: u64, // 理想中為讀取 KP 的 PlayerProfile 內的名譽分
        kp_escape_count: u64, // 讀取 KP 曾經跳車棄團的紀錄
        ctx: &mut TxContext
    ) {
        // 第一道防線：防駭客亂動別人的劇本，驗證調用者是否為擁有者
        assert!(is_owner, E_NOT_AUTHORIZED);
        
        // 第二道防線：名譽查核 (Reputation Gate)，這是預防 Web3 惡意洗版的最有效措施
        // 如果這個主揪常常爛尾（逃跑次數 > 3），或者信用破產，不允許他在公開大廳發文招募。
        // （這不影響他私底下招募朋友，但避免他坑殺路人）
        assert!(kp_reputation >= 60 && kp_escape_count <= 3, E_REPUTATION_TOO_LOW);
        
        // 都通過後，正式登錄進大廳 Table
        if (!table::contains(&marketplace.open_scenarios, scenario_id)) {
            table::add(&mut marketplace.open_scenarios, scenario_id, tx_context::sender(ctx));
            marketplace.total_listings = marketplace.total_listings + 1;
        };

        // 推送區塊鏈事件讓前端動態刷新
        event::emit(ScenarioListed {
            scenario_id,
            kp: tx_context::sender(ctx),
        });
    }

    /// 招募滿員或 KP 決定取消開團時，可以自主將劇本從大廳移除
    public fun unlist_scenario(
        marketplace: &mut Marketplace,
        scenario_id: ID,
        is_owner: bool, 
        _ctx: &mut TxContext
    ) {
        assert!(is_owner, E_NOT_AUTHORIZED);

        if (table::contains(&marketplace.open_scenarios, scenario_id)) {
            table::remove(&mut marketplace.open_scenarios, scenario_id);
        }
    }
}
