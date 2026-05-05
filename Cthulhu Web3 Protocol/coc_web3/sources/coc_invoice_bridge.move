module coc::invoice_bridge {
    use sui::coin::Coin;
    use sui::clock::Clock;
    use std::string::String;
    
    // 黑客松指定套件：引入 Bermu-DAO 部署的樂透/發票系統
    // 在 Move.toml 之中已經定義了 onchain_invoice = 0xd64a15f8a11e9a0644449d86ee0ea71af3f6583fae52616d5f386151c83a35d2
    use onchain_invoice::invoice::{Self, System};
    use onchain_invoice::tax_coin::TAX_COIN;

    /// 黑客松整合情境：玩家購買「理智回復藥水」或是「支付劇本報名費」時，
    /// 合約強制觸發 onchain_invoice 的樂透抽獎功能，賦予這筆開銷獲得意外大獎的機會！
    public fun buy_item_and_get_lottery_ticket(
        tax_payment: Coin<TAX_COIN>, // 使用對方合約制定的 TAX_COIN 來支付
        invoice_system: &mut System, // 傳入 Bermu 合約在鏈上的全局 System 共享物件
        protocol_name: String,       // 傳入 "Cthulhu-Survival-Lottery" 作為協議標記
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // [TRPG 自有邏輯]
        // 此處可寫上玩家扣除法力、獲得藥水、或是被加入劇本名單的程式碼...

        // [黑客松核心串接 - Cross-contract call]
        // 直接在此呼叫對方部署在主網/測試網上的 `init_invoice`
        // 對方合約收到這筆呼叫後，會自動把 `tax_payment` 收到他們的 Treasury 池子裡，
        // 並主動鑄造一張印有流水號的 `Invoice` (樂透彩券 NFT)，直接發放回給 ctx.sender (當前玩家) 的錢包！
        invoice::init_invoice(
            tax_payment,
            invoice_system,
            protocol_name,
            clock,
            ctx
        );
    }

    // 只要有玩家不斷交易，大樂透彩池的錢就會越來越多。
    // 後續只要對方管理員(或系統)透過 VRF 抽出 Winner，中獎的那個 TRPG 玩家就能
    // 在鏈上拿著他的發票呼叫 `onchain_invoice::invoice::claim_lottery`，抱走滿滿的 USDC！
}
