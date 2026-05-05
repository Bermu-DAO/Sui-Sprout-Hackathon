import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PACKAGE_ID } from "../constants";
import { fullTime, relativeTime } from "../utils/relativeTime";
import { readReceipt } from "../utils/walrus";
import { Badge, Button, Card, Spinner } from "./ui";

const INVOICE_TYPE = `${PACKAGE_ID}::invoice::Invoice`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface InvoiceFields {
  invoice_number: string;
  protocol: string;
  amount: string;
  timestamp: string;
}

interface ParsedInvoice {
  objectId: string;
  invoiceNumber: number;
  protocol: string;
  txType: string;
  blobId: string | null;
  amount: string;
  timestampMs: number;
}

// protocol format: "txType::digestPrefix[::blobId]"
function parseProtocol(protocol: string): { txType: string; blobId: string | null } {
  const parts = protocol.split("::");
  const txType = parts[0] ?? "unknown";
  const blobId = parts.length >= 3 ? parts[2] : null;
  return { txType, blobId: blobId || null };
}

function parseInvoice(objectId: string, json: Record<string, unknown>): ParsedInvoice {
  const f = json as unknown as InvoiceFields;
  const { txType, blobId } = parseProtocol(f.protocol ?? "");
  return {
    objectId,
    invoiceNumber: Number(f.invoice_number ?? 0),
    protocol:      f.protocol ?? "",
    txType,
    blobId,
    amount:        f.amount ?? "0",
    timestampMs:   Number(f.timestamp ?? 0),
  };
}

function SkeletonRow() {
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

// ── Receipt Modal ─────────────────────────────────────────────────────────────

function ReceiptModal({ blobId, onClose }: { blobId: string; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["walrus", blobId],
    queryFn: () => readReceipt(blobId),
  });

  const receipt = data as {
    txDigest?:       string;
    txType?:         string;
    summary?:        string;
    timestamp?:      number;
    balanceChanges?: { coinType: string; amount: string }[];
  } | undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Receipt</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
            <Spinner className="h-4 w-4" /> Loading from Walrus…
          </div>
        )}
        {isError && (
          <p className="py-4 text-center text-sm text-red-500">
            Failed to load receipt from Walrus.
          </p>
        )}

        {receipt && (
          <div className="space-y-4 text-sm">
            {receipt.txDigest && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-400">Tx Digest</p>
                <p className="break-all font-mono text-xs text-slate-700">{receipt.txDigest}</p>
                <a
                  href={`https://suiscan.xyz/testnet/tx/${receipt.txDigest}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-indigo-600 underline hover:text-indigo-800"
                >
                  View on Suiscan ↗
                </a>
              </div>
            )}
            {receipt.summary && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-400">Summary</p>
                <p className="font-mono text-xs text-slate-600">{receipt.summary}</p>
              </div>
            )}
            {receipt.balanceChanges && receipt.balanceChanges.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-400">Balance Changes</p>
                <div className="space-y-1 rounded-lg bg-slate-50 p-3">
                  {receipt.balanceChanges.map((bc, i) => (
                    <div key={i} className="flex justify-between font-mono text-xs">
                      <span className="truncate text-slate-500">
                        {bc.coinType.split("::").pop()}
                      </span>
                      <span className={Number(bc.amount) >= 0 ? "text-green-600" : "text-red-500"}>
                        {Number(bc.amount) >= 0 ? "+" : ""}{bc.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400">Blob ID</p>
              <p className="break-all font-mono text-xs text-slate-400">{blobId}</p>
            </div>
          </div>
        )}

        <Button variant="outline" className="mt-6 w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function InvoiceList() {
  const account = useCurrentAccount();
  const client  = useCurrentClient();
  const address = account?.address;

  const [activeBlobId, setActiveBlobId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["invoices", address],
    queryFn: () =>
      client.listOwnedObjects({
        owner: address!,
        type:  INVOICE_TYPE,
        include: { json: true },
      }),
    enabled: !!address,
  });

  const invoices: ParsedInvoice[] = (data?.objects ?? [])
    .filter((obj) => obj.json != null)
    .map((obj) => parseInvoice(obj.objectId, obj.json as Record<string, unknown>))
    .sort((a, b) => b.invoiceNumber - a.invoiceNumber);

  return (
    <>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Invoices</h2>
          {isError && (
            <button
              onClick={() => refetch()}
              className="text-xs text-indigo-500 underline hover:text-indigo-700"
            >
              Retry
            </button>
          )}
        </div>

        {isError && (
          <p className="mb-4 text-sm text-red-400">
            Failed to load invoices. Check your network and retry.
          </p>
        )}

        {!isLoading && !isError && invoices.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <p className="text-sm font-medium text-slate-400">No invoices yet</p>
            <p className="mt-1 text-xs text-slate-300">
              Record a transaction above to get your first lottery ticket!
            </p>
          </div>
        )}

        {(isLoading || invoices.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-400">
                  <th className="pb-2 pr-4 font-medium">#</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Time</th>
                  <th className="pb-2 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && [1, 2, 3].map((i) => <SkeletonRow key={i} />)}

                {invoices.map((inv) => (
                  <tr
                    key={inv.objectId}
                    className="border-b transition-colors last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-slate-400">
                      #{inv.invoiceNumber}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge color={inv.txType === "move_call" ? "indigo" : "gray"}>
                        {inv.txType}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-600">
                      {inv.amount}
                    </td>
                    <td
                      className="py-2 pr-4 whitespace-nowrap text-xs text-slate-500"
                      title={fullTime(inv.timestampMs)}
                    >
                      {relativeTime(inv.timestampMs)}
                    </td>
                    <td className="py-2">
                      {inv.blobId ? (
                        <Button
                          variant="outline"
                          className="py-1 text-xs"
                          onClick={() => setActiveBlobId(inv.blobId)}
                        >
                          View Receipt
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {activeBlobId && (
        <ReceiptModal
          blobId={activeBlobId}
          onClose={() => setActiveBlobId(null)}
        />
      )}
    </>
  );
}
