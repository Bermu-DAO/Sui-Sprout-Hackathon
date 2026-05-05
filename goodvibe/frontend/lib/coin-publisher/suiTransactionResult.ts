import type { SuiClientTypes } from "@mysten/sui/client";

export function extractSignAndExecuteDigest(result: unknown): string | null {
  if (typeof result !== "object" || result === null) return null;
  const r = result as {
    Transaction?: { digest?: string };
    FailedTransaction?: { digest?: string };
    digest?: string;
  };
  if (typeof r.Transaction?.digest === "string") return r.Transaction.digest;
  if (typeof r.FailedTransaction?.digest === "string") return r.FailedTransaction.digest;
  if (typeof r.digest === "string") return r.digest;
  return null;
}

export function unwrapCoreTransaction<Include extends SuiClientTypes.TransactionInclude = object>(
  txResult: SuiClientTypes.TransactionResult<Include>,
): SuiClientTypes.Transaction<Include> | null {
  if (txResult.$kind === "Transaction") return txResult.Transaction;
  if (txResult.$kind === "FailedTransaction") return txResult.FailedTransaction;
  return null;
}

export function isFailedSignAndExecuteResult(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "$kind" in result &&
    (result as { $kind: string }).$kind === "FailedTransaction"
  );
}
