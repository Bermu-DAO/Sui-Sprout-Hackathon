import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, LOT_ID } from "../constants/ids";

// 支付停車費
export const createParkingPaymentTx = (
    spaceId: string,
    hourlyRate: bigint,
    hours: number
) => {
    const tx = new Transaction();
    const totalPrice = hourlyRate * BigInt(hours);
    const [payment] = tx.splitCoins(tx.gas, [totalPrice]);

    tx.moveCall({
        target: `${PACKAGE_ID}::parking_rwa::pay_for_parking`,
        arguments: [
            tx.object(LOT_ID),
            tx.object(spaceId),
            tx.pure.u64(hours),
            payment,
        ],
    });

    return tx;
};

// 購買停車格
export const createPurchaseSpaceTx = (
    spaceId: string,
    price: bigint
) => {
    const tx = new Transaction();
    const [payment] = tx.splitCoins(tx.gas, [price]);

    tx.moveCall({
        target: `${PACKAGE_ID}::parking_rwa::purchase_space`,
        arguments: [
            tx.object(spaceId),
            payment,
        ],
    });

    return tx;
};

// 設定停車格售價
export const createSetPriceTx = (
    spaceId: string,
    newPrice: bigint
) => {
    const tx = new Transaction();

    tx.moveCall({
        target: `${PACKAGE_ID}::parking_rwa::set_price`,
        arguments: [
            tx.object(spaceId),
            tx.pure.u64(newPrice),
        ],
    });

    return tx;
};

// 轉讓停車格
export const createTransferSpaceTx = (
    spaceId: string,
    recipient: string
) => {
    const tx = new Transaction();

    tx.moveCall({
        target: `${PACKAGE_ID}::parking_rwa::transfer_space`,
        arguments: [
            tx.object(spaceId),
            tx.pure.address(recipient),
        ],
    });

    return tx;
};

// 鑄造停車格 (僅營運商可用)
export const createMintSpaceTx = (
    location: string,
    hourlyRate: bigint,
    price: bigint
) => {
    const tx = new Transaction();

    tx.moveCall({
        target: `${PACKAGE_ID}::parking_rwa::mint_space`,
        arguments: [
            tx.object(LOT_ID),
            tx.pure.string(location),
            tx.pure.u64(hourlyRate),
            tx.pure.u64(price),
        ],
    });

    return tx;
};