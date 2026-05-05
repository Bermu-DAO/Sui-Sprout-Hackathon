module coc::dice {

    use sui::event;
    
    // 引入 Sui 內建的隨機數生成模組 (Sui Framework)
    use sui::random::{Self, Random};

    /// 擲骰結果事件，將永久紀錄在區塊鏈上供前端 DApp 或是 KP 核對
    public struct DiceRolled has copy, drop {
        scenario_id: ID,   // 所屬劇本 ID (全域擲骰可帶 dummy)
        roller: address,   // 擲骰子的玩家
        dice_type: u8,     // 是哪一種骰子 (如 100 代表 D100, 6 代表 D6)
        result: u8,        // 擲出的點數
        target_value: u8,  // 這次檢定的目標值 (若純粹丟傷害則為 0)
        is_success: bool,  // 根據規則是否成功 (結果 <= target_value)
        is_critical: bool, // 大成功 (01)
        is_fumble: bool,   // 大失敗 (96~100，或 100 依據難度)
    }

    /// 核心功能 1：進行 D100 技能檢定 (Skill Check)
    /// @param r: Sui 網路的全局隨機物件 (Shared Object `0x8`)
    /// @param target_value: 角色的該項技能點數 (例如: 閃避 65)
    #[allow(lint(public_random))]
    public fun roll_skill_check(
        scenario_id: ID,
        r: &Random,
        target_value: u8,
        ctx: &mut TxContext
    ) {
        // 利用全局的 r 生成一個僅供本次交易使用的安全假隨機生成器
        let mut generator = random::new_generator(r, ctx);

        // 隨機產生 1 ~ 100 之間的數值 (包含 1 與 100)
        let result = random::generate_u8_in_range(&mut generator, 1, 100);

        // -- CoC 7版 檢定規則判斷 --
        // 通常成功: 骰出數字小於等於目標值
        let is_success = result <= target_value;
        
        // 大成功: 固定為骰出 1
        let is_critical = result == 1;

        // 大失敗: 當技能小於 50，骰出 96~100 皆算大失敗；大於等於 50，則只有 100 才算。
        let is_fumble = if (target_value < 50) {
            result >= 96
        } else {
            result == 100
        };

        // 發送區塊鏈事件
        // 因為不可逆轉，這段事件日誌將成為玩家有沒有作弊的「絕對鐵證」
        event::emit(DiceRolled {
            scenario_id,
            roller: tx_context::sender(ctx),
            dice_type: 100, // D100
            result,
            target_value,
            is_success,
            is_critical,
            is_fumble,
        });

        // 取決於進後續實作，如果此合約獲得了角色卡 (`Investigator`) 的修改授權，
        // 可以直接在這邊與 `coc_investigator::decrease_san` 或者 `increase_skill` 聯動產生連鎖效應！
    }

    /// 核心功能 2：自訂面數擲骰 (Damage / Sanity Check 損失擲骰)
    /// 例如克蘇魯神話怪物傷害判定：D10 -> faces 傳入 10
    #[allow(lint(public_random))]
    public fun roll_damage(
        scenario_id: ID,
        r: &Random,
        faces: u8, 
        ctx: &mut TxContext
    ) {
        let mut generator = random::new_generator(r, ctx);

        // 產生從 1 到 faces 之間的數字
        let result = random::generate_u8_in_range(&mut generator, 1, faces);

        event::emit(DiceRolled {
            scenario_id,
            roller: tx_context::sender(ctx),
            dice_type: faces, // 動態 D4, D6, D10
            result,
            target_value: 0,
            is_success: true, // 傷害擲骰沒有檢定成敗概念，預設全亮
            is_critical: false,
            is_fumble: false,
        });
    }
}
