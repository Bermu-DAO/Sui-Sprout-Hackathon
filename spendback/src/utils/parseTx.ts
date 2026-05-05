import type { SuiTransactionBlockResponse, BalanceChange } from "@mysten/sui/jsonRpc";

export interface ParsedTx {
  digest: string;
  timestampMs: number | null;
  type: "sui_transfer" | "move_call" | "unknown";
  summary: string;
  balanceChanges: { coinType: string; amount: string }[];
}

export function parseTx(raw: SuiTransactionBlockResponse): ParsedTx {
  const digest = raw.digest;
  const timestampMs = raw.timestampMs ? Number(raw.timestampMs) : null;

  // Determine type and summary from transaction commands
  const kind = raw.transaction?.data?.transaction;
  let type: ParsedTx["type"] = "unknown";
  let summary = "Unknown";

  if (kind && "kind" in kind && kind.kind === "ProgrammableTransaction") {
    const txs = (kind as { kind: string; transactions: unknown[] }).transactions ?? [];

    const hasTransfer = txs.some(
      (t) => typeof t === "object" && t !== null && "TransferObjects" in t,
    );
    const firstMoveCall = txs.find(
      (t) => typeof t === "object" && t !== null && "MoveCall" in t,
    ) as { MoveCall: { package: string; module: string; function: string } } | undefined;

    if (hasTransfer) {
      type = "sui_transfer";
      summary = "SUI Transfer";
    } else if (firstMoveCall) {
      type = "move_call";
      const mc = firstMoveCall.MoveCall;
      summary = `${mc.package.slice(0, 6)}…::${mc.module}::${mc.function}`;
    }
  }

  // Parse balance changes
  const balanceChanges: ParsedTx["balanceChanges"] = (raw.balanceChanges ?? []).map(
    (bc: BalanceChange) => ({
      coinType: bc.coinType,
      amount: bc.amount,
    }),
  );

  return { digest, timestampMs, type, summary, balanceChanges };
}
