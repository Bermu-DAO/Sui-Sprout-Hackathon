module coc::investigator {
    use sui::coin::{Self, Coin};
    use sui::random::{Self, Random};
    use sui::sui::SUI;
    use std::string::String;

    /// Dummy Token Placeholder (until tokenomics phase is built)
    public struct GAME_TOKEN has drop {}

    const E_INVALID_ATTRIBUTE: u64 = 1;
    const E_INSUFFICIENT_FEE: u64 = 2;

    /// 調查員（角色卡）的資料結構
    public struct Investigator has key, store {
        id: UID,
        name: String,
        str: u8,
        con: u8,
        siz: u8,
        dex: u8,
        app: u8,
        int: u8,
        pow: u8,
        edu: u8,
        luck: u8,
    }

    /// 輔助函數：模擬擲骰 3D6 (3 顆 6 面骰，總和 3_18)，乘以 5 (15_90) 是 CoC 7th 傳統
    fun roll_3d6_times_5(generator: &mut random::RandomGenerator): u8 {
        let mut total: u8 = 0;
        let mut i: u8 = 0;
        while (i < 3) {
            total = total + random::generate_u8_in_range(generator, 1, 6);
            i = i + 1;
        };
        total * 5
    }

    /// 輔助函數：模擬 2D6+6 再乘 5 (適合 SIZ, INT, EDU 等)
    fun roll_2d6_plus_6_times_5(generator: &mut random::RandomGenerator): u8 {
        let mut total: u8 = 6;
        let mut i: u8 = 0;
        while (i < 2) {
            total = total + random::generate_u8_in_range(generator, 1, 6);
            i = i + 1;
        };
        total * 5
    }

    /// 盲抽創建一個全新調查員角色卡，所有屬性由 VRF 直接生成
    #[allow(lint(public_random, self_transfer))]
    public fun mint_investigator(
        name: String,
        r: &Random,
        ctx: &mut TxContext
    ) {
        let mut generator = random::new_generator(r, ctx);

        let investigator = Investigator {
            id: object::new(ctx),
            name,
            str: roll_3d6_times_5(&mut generator),
            con: roll_3d6_times_5(&mut generator),
            dex: roll_3d6_times_5(&mut generator),
            app: roll_3d6_times_5(&mut generator),
            pow: roll_3d6_times_5(&mut generator),
            luck: roll_3d6_times_5(&mut generator), // 也可以用 3d6 * 5
            siz: roll_2d6_plus_6_times_5(&mut generator),
            int: roll_2d6_plus_6_times_5(&mut generator),
            edu: roll_2d6_plus_6_times_5(&mut generator),
        };

        transfer::public_transfer(investigator, tx_context::sender(ctx));
    }

    /// 支付代幣重骰單一屬性
    #[allow(lint(public_random, self_transfer))]
    public fun reroll_attribute(
        investigator: &mut Investigator,
        attribute_name: vector<u8>,
        payment: Coin<SUI>, // Temporary placeholder for GAME_TOKEN due to simplicity
        r: &Random,
        ctx: &mut TxContext
    ) {
        // Assert payment is enough (placeholder cost 1_000_000_000 MIST)
        assert!(coin::value(&payment) >= 1_000_000_000, E_INSUFFICIENT_FEE);
        transfer::public_transfer(payment, @0x0); // Burn placeholder currency

        let mut generator = random::new_generator(r, ctx);

        if (attribute_name == b"str") {
            investigator.str = roll_3d6_times_5(&mut generator);
        } else if (attribute_name == b"con") {
            investigator.con = roll_3d6_times_5(&mut generator);
        } else if (attribute_name == b"dex") {
            investigator.dex = roll_3d6_times_5(&mut generator);
        } else if (attribute_name == b"app") {
            investigator.app = roll_3d6_times_5(&mut generator);
        } else if (attribute_name == b"pow") {
            investigator.pow = roll_3d6_times_5(&mut generator);
        } else if (attribute_name == b"luck") {
            investigator.luck = roll_3d6_times_5(&mut generator);
        } else if (attribute_name == b"siz") {
            investigator.siz = roll_2d6_plus_6_times_5(&mut generator);
        } else if (attribute_name == b"int") {
            investigator.int = roll_2d6_plus_6_times_5(&mut generator);
        } else if (attribute_name == b"edu") {
            investigator.edu = roll_2d6_plus_6_times_5(&mut generator);
        } else {
            abort E_INVALID_ATTRIBUTE
        };
    }

    // --- Accessors & Mutators ---

    public fun name(investigator: &Investigator): String {
        investigator.name
    }

    /// 取得理智值 (目前暫時映射至 pow 屬性)
    public fun get_san(investigator: &Investigator): u8 {
        investigator.pow
    }

    /// 設定理智值 (目前暫時映射至 pow 屬性)
    public fun set_san(investigator: &mut Investigator, value: u8) {
        investigator.pow = value;
    }
    /// 銷毀調查員物件 (撕卡)
    public(package) fun burn_investigator(investigator: Investigator) {
        let Investigator {
            id,
            name: _,
            str: _,
            con: _,
            siz: _,
            dex: _,
            app: _,
            int: _,
            pow: _,
            edu: _,
            luck: _,
        } = investigator;
        object::delete(id);
    }
}
