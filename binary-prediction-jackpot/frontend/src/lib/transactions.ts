import { Transaction } from "@mysten/sui/transactions";
import {
  PACKAGE_ID,
  SUI_CLOCK_OBJECT_ID,
  SUI_RANDOM_OBJECT_ID,
  OUTCOME_YES,
  OUTCOME_NO,
  OUTCOME_INVALID,
} from "./constants";
import { parseToMIST } from "./sui";

export function buildPlaceBetTx(
  marketId: string,
  amountSUI: number,
  outcome: typeof OUTCOME_YES | typeof OUTCOME_NO
): Transaction {
  const tx = new Transaction();
  const amount = parseToMIST(amountSUI);

  const [coin] = tx.splitCoins(tx.gas, [amount]);

  tx.moveCall({
    target: `${PACKAGE_ID}::event_market::place_bet`,
    arguments: [
      tx.object(marketId),
      coin,
      tx.pure.u8(outcome),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildCreateMarketTx(title: string): Transaction {
  const tx = new Transaction();

  // Note: This requires AdminCap to be passed
  // In production, the admin would need to provide their AdminCap object ID
  tx.moveCall({
    target: `${PACKAGE_ID}::event_market::create_market`,
    arguments: [
      tx.object("ADMIN_CAP_ID"), // Replace with actual AdminCap ID
      tx.pure.string(title),
    ],
  });

  return tx;
}

export function buildResolveAndDrawTx(
  marketId: string,
  winningOutcome: typeof OUTCOME_YES | typeof OUTCOME_NO | typeof OUTCOME_INVALID
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::event_market::resolve_and_draw`,
    arguments: [
      tx.object("ADMIN_CAP_ID"), // Replace with actual AdminCap ID
      tx.object(marketId),
      tx.pure.u8(winningOutcome),
      tx.object(SUI_RANDOM_OBJECT_ID),
      tx.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  return tx;
}

export function buildClaimWinningsTx(
  marketId: string,
  invoiceId: string
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::event_market::claim_winnings`,
    arguments: [tx.object(marketId), tx.object(invoiceId)],
  });

  return tx;
}

export function buildClaimJackpotTx(
  marketId: string,
  invoiceId: string
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::event_market::claim_jackpot`,
    arguments: [tx.object(marketId), tx.object(invoiceId)],
  });

  return tx;
}
