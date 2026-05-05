import { Transaction } from "@mysten/sui/transactions";
import {
  PACKAGE_ID,
  SYSTEM_ID,
  TREASURY_ID,
  USDC_TREASURY_CAP,
  TAX_TREASURY_CAP,
  ADMIN_ID,
  CLOCK_ID,
  RANDOM_ID,
} from "./constants";

export function buildMintUsdc(amount: number, recipient: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::usdc::faucet`,
    arguments: [
      tx.object(USDC_TREASURY_CAP),
      tx.pure.u64(amount),
      tx.pure.address(recipient),
    ],
  });
  return tx;
}

export function buildBuyTax(usdcCoinId: string, amount: number): Transaction {
  const tx = new Transaction();
  const [splitCoin] = tx.splitCoins(tx.object(usdcCoinId), [tx.pure.u64(amount)]);
  tx.moveCall({
    target: `${PACKAGE_ID}::tax_coin::buy_quota`,
    arguments: [
      splitCoin,
      tx.object(TAX_TREASURY_CAP),
      tx.object(TREASURY_ID),
    ],
  });
  return tx;
}

export function buildCreateInvoice(taxCoinId: string, protocol: string): Transaction {
  const tx = new Transaction();
  const [smallCoin] = tx.splitCoins(tx.object(taxCoinId), [tx.pure.u64(100_000_000)]);
  tx.moveCall({
    target: `${PACKAGE_ID}::invoice::init_invoice`,
    arguments: [
      smallCoin,
      tx.object(SYSTEM_ID),
      tx.pure.string(protocol),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildLottery(): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::invoice::lottery`,
    arguments: [
      tx.object(ADMIN_ID),
      tx.object(SYSTEM_ID),
      tx.object(RANDOM_ID),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}

export function buildClaimLottery(invoiceId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::invoice::claim_lottery`,
    arguments: [
      tx.object(SYSTEM_ID),
      tx.object(invoiceId),
      tx.object(TREASURY_ID),
      tx.object(CLOCK_ID),
    ],
  });
  return tx;
}
