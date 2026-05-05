module parking_system::parking_rwa {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::string::String;

    /// 錯誤代碼
    const EIncorrectAmount: u64 = 0;
    const ENotOwner: u64 = 1;
    const ENotOperator: u64 = 2;

    /// 停車場營運物件
    struct ParkingLot has key {
        id: UID,
        operator: address,
        commission_rate_bps: u64, // 基點，例如 8000 代表 80%
    }

    /// 停車格物件 (RWA 資產)
    struct ParkingSpace has key, store {
        id: UID,
        location: String,
        hourly_rate: u64,
        owner: address,
        price: u64, // 出售價格，0 表示不出售
    }

    /// 支付事件
    struct PaymentEvent has copy, drop {
        space_id: ID,
        payer: address,
        hours: u64,
        total_amount: u64,
        owner_share: u64,
        operator_share: u64,
    }

    /// 轉讓事件
    struct TransferEvent has copy, drop {
        space_id: ID,
        from: address,
        to: address,
    }

    /// 購買事件
    struct PurchaseEvent has copy, drop {
        space_id: ID,
        buyer: address,
        seller: address,
        price: u64,
    }

    /// 鑄造事件
    struct MintEvent has copy, drop {
        space_id: ID,
        location: String,
        hourly_rate: u64,
        price: u64,
    }

    /// 初始化停車場 (由營運商執行)
    public fun create_lot(ctx: &mut TxContext) {
        let lot = ParkingLot {
            id: object::new(ctx),
            operator: tx_context::sender(ctx),
            commission_rate_bps: 8000, 
        };
        transfer::share_object(lot);
    }

    /// 鑄造停車格並發行（只有營運商可以調用）
    public fun mint_space(
        lot: &ParkingLot,
        location: String,
        hourly_rate: u64,
        price: u64, // 初始銷售價格
        ctx: &mut TxContext
    ) {
        // 權限檢查：只有營運商可以鑄造
        assert!(lot.operator == tx_context::sender(ctx), ENotOperator);

        let space = ParkingSpace {
            id: object::new(ctx),
            location: location,
            hourly_rate,
            owner: tx_context::sender(ctx),
            price,
        };

        // 發出鑄造事件
        event::emit(MintEvent {
            space_id: object::id(&space),
            location: location,
            hourly_rate,
            price,
        });
        
        // 將停車格設為共享物件，這樣任何人都可以與它互動
        transfer::share_object(space);
    }

    /// 支付停車費並自動分潤
    public fun pay_for_parking(
        lot: &ParkingLot,
        space: &mut ParkingSpace,
        hours: u64,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let total_required = space.hourly_rate * hours;
        assert!(coin::value(&payment) == total_required, EIncorrectAmount);

        let total_balance = coin::into_balance(payment);
        let total_value = balance::value(&total_balance);

        // 計算分潤：20% 給車位持有者，80% 給營運商
        let operator_share = (total_value * lot.commission_rate_bps) / 10000;
        let owner_share = total_value - operator_share;

        // 執行轉帳
        let operator_coin = coin::from_balance(balance::split(&mut total_balance, operator_share), ctx);
        let owner_coin = coin::from_balance(total_balance, ctx);

        transfer::public_transfer(operator_coin, lot.operator);
        transfer::public_transfer(owner_coin, space.owner);

        // 發出支付事件
        event::emit(PaymentEvent {
            space_id: object::id(space),
            payer: tx_context::sender(ctx),
            hours,
            total_amount: total_value,
            owner_share,
            operator_share,
        });
    }

    /// 設置停車格售價
    public fun set_price(space: &mut ParkingSpace, price: u64, ctx: &mut TxContext) {
        // 權限檢查：只有當前 owner 可以設置價格
        assert!(space.owner == tx_context::sender(ctx), ENotOwner);
        space.price = price;
    }

    /// 購買停車格
    public fun purchase_space(
        space: &mut ParkingSpace,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        // 檢查是否在出售中
        assert!(space.price > 0, EIncorrectAmount);

        // 檢查支付金額是否正確
        assert!(coin::value(&payment) == space.price, EIncorrectAmount);

        let seller = space.owner;
        let buyer = tx_context::sender(ctx);
        let price = space.price;

        // 將款項轉給賣家
        transfer::public_transfer(payment, seller);

        // 更新所有權
        space.owner = buyer;
        space.price = 0; // 購買後設為不出售

        // 發出購買事件
        event::emit(PurchaseEvent {
            space_id: object::id(space),
            buyer,
            seller,
            price,
        });
    }

    /// 轉讓停車格 (變更收益權持有者) - 用於贈與或轉移
    public fun transfer_space(space: &mut ParkingSpace, to: address, ctx: &mut TxContext) {
        // 權限檢查：只有當前 owner 可以轉讓
        assert!(space.owner == tx_context::sender(ctx), ENotOwner);

        let from = space.owner;
        space.owner = to;

        // 發出轉讓事件
        event::emit(TransferEvent {
            space_id: object::id(space),
            from,
            to,
        });
    }
}