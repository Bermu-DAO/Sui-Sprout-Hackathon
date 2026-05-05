import { useCurrentAccount, useCurrentClient, useDAppKit } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PACKAGE_ID } from "../constants";
import { rpc, useRecentTxs } from "../hooks/useRecentTxs";
import { buildCreateInvoice } from "../transactions";
import { parseTx, type ParsedTx } from "../utils/parseTx";
import { fullTime, relativeTime } from "../utils/relativeTime";
import { uploadReceipt } from "../utils/walrus";
import { Badge, Button, Card, Spinner } from "./ui";

const TAX_TYPE = `${PACKAGE_ID}::tax_coin::TAX_COIN`;

const TYPE_COLOR: Record<ParsedTx["type"], "indigo" | "gray"> = {
  move_call:    "indigo",
  sui_transfer: "gray",
  unknown:      "gray",
};

const TYPE_LABEL: Record<ParsedTx["type"], string> = {
  move_call:    "Move Call",
  sui_transfer: "Transfer",
  unknown:      "Unknown",
};

function shortDigest(digest: string): string {
  return `${digest.slice(0, 8)}…${digest.slice(-6)}`;
}

function LoadingRow() {
  return (
    <tr className="border-b">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="py-3 pr-4">
          <span className="inline-block h-4 w-full animate-pulse rounded bg-slate-100" />
        </td>
      ))}
    </tr>
  );
}

export function TransactionList() {
  const account = useCurrentAccount();
  const client  = useCurrentClient();
  const dAppKit = useDAppKit();

  const { data: rawTxs, isLoading, isError, refetch } = useRecentTxs();

  const [recordedDigests, setRecordedDigests] = useState<Set<string>>(new Set());
  const [loadingDigest,   setLoadingDigest]   = useState<string | null>(null);
  const [manualDigest,    setManualDigest]     = useState("");
  const [manualLoading,   setManualLoading]    = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const address = account?.address;

  // TAX_COIN coins
  const { data: taxCoins } = useQuery({
    queryKey: ["coins", address, TAX_TYPE],
    queryFn: () => client.listCoins({ owner: address!, coinType: TAX_TYPE, limit: 1 }),
    enabled: !!address,
  });
  const firstTaxCoinId = taxCoins?.objects[0]?.objectId;

  const txs = (rawTxs ?? []).map(parseTx);

  // ── Core record pipeline ──────────────────────────────────────────────────

  async function handleRecordFromParsed(tx: ParsedTx) {
    if (!firstTaxCoinId) {
      setStatusMsg({ ok: false, text: "Need TAX_COIN — go to Top Up first" });
      return;
    }
    setLoadingDigest(tx.digest);
    setStatusMsg(null);
    try {
      const blobId = await uploadReceipt({
        txDigest:       tx.digest,
        txType:         tx.type,
        summary:        tx.summary,
        balanceChanges: tx.balanceChanges,
        timestamp:      tx.timestampMs,
      });
      let protocol = `${tx.type}::${tx.digest.slice(0, 16)}`;
      if (blobId) protocol = `${protocol}::${blobId}`;

      await dAppKit.signAndExecuteTransaction({
        transaction: buildCreateInvoice(firstTaxCoinId, protocol),
      });
      setRecordedDigests((prev) => new Set(prev).add(tx.digest));
      setStatusMsg({
        ok: true,
        text: `Invoice created!${blobId ? ` Blob: ${blobId.slice(0, 10)}…` : " (no Walrus receipt)"}`,
      });
    } catch (e) {
      setStatusMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoadingDigest(null);
    }
  }

  async function handleManualRecord() {
    const digest = manualDigest.trim();
    if (!digest) return;
    setManualLoading(true);
    setStatusMsg(null);
    try {
      const raw = await rpc.getTransactionBlock({
        digest,
        options: { showInput: true, showBalanceChanges: true, showEffects: true },
      });
      await handleRecordFromParsed(parseTx(raw));
      setManualDigest("");
    } catch (e) {
      setStatusMsg({
        ok: false,
        text: `Tx not found: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setManualLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
        {isError && (
          <button
            onClick={() => refetch()}
            className="text-xs text-indigo-500 underline hover:text-indigo-700"
          >
            Retry
          </button>
        )}
      </div>

      {/* TAX_COIN hint */}
      {address && !firstTaxCoinId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-amber-500">⚠</span>
          <p className="text-xs text-amber-700">
            You need TAX_COIN to Record transactions.{" "}
            <span className="font-medium">Top up TAX_COIN first.</span>
          </p>
        </div>
      )}

      {/* Table */}
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-slate-400">
              <th className="pb-2 pr-4 font-medium">Time</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Summary</th>
              <th className="pb-2 pr-4 font-medium">Digest</th>
              <th className="pb-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && [1, 2, 3].map((i) => <LoadingRow key={i} />)}

            {isError && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-red-400">
                  Failed to load transactions. Check your network and retry.
                </td>
              </tr>
            )}

            {!isLoading && !isError && txs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  No recent transactions found.{" "}
                  <span className="text-slate-300">Try transferring some SUI!</span>
                </td>
              </tr>
            )}

            {txs.map((tx) => {
              const recorded  = recordedDigests.has(tx.digest);
              const txLoading = loadingDigest === tx.digest;

              return (
                <tr
                  key={tx.digest}
                  className="border-b transition-colors last:border-0 hover:bg-slate-50"
                >
                  <td
                    className="py-2 pr-4 whitespace-nowrap text-xs text-slate-500"
                    title={fullTime(tx.timestampMs)}
                  >
                    {relativeTime(tx.timestampMs)}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge color={TYPE_COLOR[tx.type]}>
                      {TYPE_LABEL[tx.type]}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-500">
                    {tx.summary}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-400"
                      title={tx.digest}>
                    {shortDigest(tx.digest)}
                  </td>
                  <td className="py-2">
                    {recorded ? (
                      <span className="text-xs font-medium text-green-600">
                        Recorded ✓
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        className="py-1 text-xs"
                        disabled={txLoading || !firstTaxCoinId || !!loadingDigest}
                        onClick={() => handleRecordFromParsed(tx)}
                      >
                        {txLoading
                          ? <span className="flex items-center gap-1.5"><Spinner />Recording…</span>
                          : "Record"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-xs ${
          statusMsg.ok
            ? "border border-green-200 bg-green-50 text-green-700"
            : "border border-red-200 bg-red-50 text-red-600"
        }`}>
          {statusMsg.ok ? "✓ " : "✗ "}{statusMsg.text}
        </div>
      )}

      {/* Manual digest input */}
      <div className="border-t pt-4">
        <p className="mb-2 text-xs text-slate-400">Manually enter a Tx Digest to record</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Paste transaction digest…"
            value={manualDigest}
            onChange={(e) => setManualDigest(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualRecord()}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <Button
            variant="outline"
            disabled={!manualDigest.trim() || manualLoading || !!loadingDigest}
            onClick={handleManualRecord}
          >
            {manualLoading
              ? <span className="flex items-center gap-1.5"><Spinner />Looking up…</span>
              : "Record"}
          </Button>
        </div>
        {recordedDigests.size > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            {recordedDigests.size} invoice{recordedDigests.size > 1 ? "s" : ""} recorded this session
          </p>
        )}
      </div>
    </Card>
  );
}
