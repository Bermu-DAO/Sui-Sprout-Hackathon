import { useCurrentAccount, useCurrentClient, useDAppKit } from "@mysten/dapp-kit-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PACKAGE_ID, SYSTEM_ID, TREASURY_ID } from "../constants";
import { buildClaimLottery } from "../transactions";
import { fullTime } from "../utils/relativeTime";
import { Badge, Button, Card, Spinner } from "./ui";

const INVOICE_TYPE = `${PACKAGE_ID}::invoice::Invoice`;
const DECIMALS = 6;

function formatUsdc(raw: string | number | undefined): string {
  if (raw == null) return "0.00";
  return (Number(raw) / 10 ** DECIMALS).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Data types ────────────────────────────────────────────────────────────────

interface SystemFields {
  count:     string;
  winner:    string;
  tax_value: string;
  timestamp: string;
}

interface TreasuryFields {
  pool: { fields?: { balance: string }; value?: string } | string;
}

interface InvoiceJson {
  invoice_number: string;
  timestamp:      string;
}

interface WinningInvoice {
  objectId:      string;
  invoiceNumber: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LotteryPanel() {
  const account     = useCurrentAccount();
  const client      = useCurrentClient();
  const dAppKit     = useDAppKit();
  const queryClient = useQueryClient();
  const address     = account?.address;

  const [claimStatus, setClaimStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  // ── System object ────────────────────────────────────────────────────────

  const { data: systemObj, isLoading: systemLoading } = useQuery({
    queryKey: ["system"],
    queryFn:  () => client.getObject({ objectId: SYSTEM_ID, include: { json: true } }),
  });

  const systemFields = systemObj?.object?.json as unknown as SystemFields | undefined;
  const winner   = Number(systemFields?.winner   ?? 0);
  const count    = Number(systemFields?.count    ?? 0);
  const taxValue = systemFields?.tax_value;
  const drawnAt  = Number(systemFields?.timestamp ?? 0);

  // ── Treasury object ──────────────────────────────────────────────────────

  const { data: treasuryObj, isLoading: treasuryLoading } = useQuery({
    queryKey: ["treasury"],
    queryFn:  () => client.getObject({ objectId: TREASURY_ID, include: { json: true } }),
  });

  const treasuryFields = treasuryObj?.object?.json as unknown as TreasuryFields | undefined;
  const rawPool = treasuryFields?.pool;
  let poolBalance = "0";
  if (typeof rawPool === "string") {
    poolBalance = rawPool;
  } else if (typeof rawPool === "object" && rawPool !== null) {
    poolBalance = rawPool.fields?.balance ?? rawPool.value ?? "0";
  }

  // ── User's invoices — detect winner ──────────────────────────────────────

  const { data: invoiceObjs } = useQuery({
    queryKey: ["invoices", address],
    queryFn:  () =>
      client.listOwnedObjects({ owner: address!, type: INVOICE_TYPE, include: { json: true } }),
    enabled: !!address,
  });

  const winningInvoice: WinningInvoice | null = (() => {
    if (winner === 0 || !invoiceObjs) return null;
    const match = invoiceObjs.objects.find((obj) => {
      if (!obj.json) return false;
      const f   = obj.json as unknown as InvoiceJson;
      const num = Number(f.invoice_number ?? -1);
      const ts  = Number(f.timestamp ?? 0);
      return num === winner && ts <= drawnAt;
    });
    if (!match) return null;
    return { objectId: match.objectId, invoiceNumber: winner };
  })();

  // ── Claim handler ────────────────────────────────────────────────────────

  async function handleClaim() {
    if (!winningInvoice) return;
    setClaimStatus("loading");
    setErrMsg("");
    try {
      await dAppKit.signAndExecuteTransaction({
        transaction: buildClaimLottery(winningInvoice.objectId),
      });
      setClaimStatus("ok");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["treasury"] }),
        queryClient.invalidateQueries({ queryKey: ["invoices", address] }),
        queryClient.invalidateQueries({ queryKey: ["balance",  address] }),
      ]);
    } catch (e) {
      setClaimStatus("err");
      setErrMsg(e instanceof Error ? e.message : String(e));
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────

  const poolLoading = treasuryLoading || systemLoading;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Card>
      <h2 className="mb-5 text-lg font-semibold">Lottery</h2>

      {/* Prize pool — hero display */}
      <div className="mb-6 rounded-xl bg-indigo-50 px-6 py-5 text-center">
        <p className="mb-1 text-xs uppercase tracking-widest text-indigo-400">Prize Pool</p>
        {poolLoading ? (
          <div className="mx-auto mt-2 h-10 w-32 animate-pulse rounded-lg bg-indigo-100" />
        ) : (
          <p className="text-3xl font-bold tabular-nums text-indigo-700">
            {formatUsdc(poolBalance)}
            <span className="ml-2 text-base font-medium text-indigo-400">USDC</span>
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-slate-400">Total Invoices</p>
          {systemLoading
            ? <div className="mx-auto mt-2 h-7 w-12 animate-pulse rounded bg-slate-100" />
            : <p className="mt-1 text-xl font-semibold tabular-nums">{count}</p>}
        </div>
        <div>
          <p className="text-xs text-slate-400">Last Winner</p>
          <div className="mt-1 flex justify-center">
            {systemLoading
              ? <div className="h-6 w-10 animate-pulse rounded-full bg-slate-100" />
              : winner === 0
                ? <Badge color="gray">—</Badge>
                : <Badge color="indigo">#{winner}</Badge>}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-400">Drawn At</p>
          {systemLoading
            ? <div className="mx-auto mt-2 h-4 w-20 animate-pulse rounded bg-slate-100" />
            : <p
                className="mt-1 text-xs text-slate-500"
                title={fullTime(drawnAt || null)}
              >
                {drawnAt ? new Date(drawnAt).toLocaleDateString() : "—"}
              </p>}
        </div>
      </div>

      {/* Winning alert */}
      {winningInvoice && claimStatus !== "ok" && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-4">
          <p className="text-sm font-bold text-green-700">
            You won! Invoice #{winningInvoice.invoiceNumber}
          </p>
          <p className="mt-0.5 text-xs text-green-600">
            Claim {formatUsdc(poolBalance)} USDC from the prize pool
          </p>
        </div>
      )}

      {/* Claim button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleClaim}
          disabled={!winningInvoice || claimStatus === "loading" || claimStatus === "ok"}
        >
          {claimStatus === "loading"
            ? <span className="flex items-center gap-2"><Spinner />Processing…</span>
            : "Claim Prize"}
        </Button>

        {claimStatus === "ok"  && <Badge color="green">Claimed!</Badge>}
        {claimStatus === "err" && <Badge color="red">Failed</Badge>}
        {!winningInvoice && claimStatus === "idle" && (
          <span className="text-xs text-slate-400">No winning invoice</span>
        )}
      </div>

      {errMsg && (
        <p className="mt-2 break-all text-xs text-red-500">{errMsg}</p>
      )}

      {taxValue && (
        <p className="mt-5 text-xs text-slate-300">
          Invoice fee: {formatUsdc(taxValue)} TAX_COIN per record
        </p>
      )}
    </Card>
  );
}
