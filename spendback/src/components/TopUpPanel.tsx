import { useCurrentAccount, useCurrentClient, useDAppKit } from "@mysten/dapp-kit-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PACKAGE_ID } from "../constants";
import { buildBuyTax, buildMintUsdc } from "../transactions";
import { Badge, Button, Card, Spinner } from "./ui";

const USDC_TYPE = `${PACKAGE_ID}::usdc::USDC`;
const TAX_TYPE  = `${PACKAGE_ID}::tax_coin::TAX_COIN`;
const DECIMALS  = 6;
const MULTIPLIER = 10 ** DECIMALS; // 1_000_000

/** Raw on-chain value → human-readable string (2 dp) */
function formatBalance(raw: string | undefined): string {
  if (!raw) return "0.00";
  const n = Number(raw) / MULTIPLIER;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BalanceSkeleton() {
  return <span className="inline-block h-6 w-20 animate-pulse rounded bg-slate-200" />;
}

export function TopUpPanel() {
  const account     = useCurrentAccount();
  const client      = useCurrentClient();
  const dAppKit     = useDAppKit();
  const queryClient = useQueryClient();

  const [mintStatus, setMintStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [buyStatus,  setBuyStatus]  = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [errMsg,     setErrMsg]     = useState("");
  const [usdcInput,  setUsdcInput]  = useState("100");

  const address = account?.address;

  // ── Balances ──────────────────────────────────────────────────────────────

  const { data: usdcBalance, isLoading: usdcLoading, refetch: refetchUsdc } = useQuery({
    queryKey: ["balance", address, USDC_TYPE],
    queryFn: () => client.getBalance({ owner: address!, coinType: USDC_TYPE }),
    enabled: !!address,
  });

  const { data: taxBalance, isLoading: taxLoading, refetch: refetchTax } = useQuery({
    queryKey: ["balance", address, TAX_TYPE],
    queryFn: () => client.getBalance({ owner: address!, coinType: TAX_TYPE }),
    enabled: !!address,
  });

  const { data: usdcCoins } = useQuery({
    queryKey: ["coins", address, USDC_TYPE],
    queryFn: () => client.listCoins({ owner: address!, coinType: USDC_TYPE, limit: 1 }),
    enabled: !!address,
  });

  const firstUsdcId   = usdcCoins?.objects[0]?.objectId;
  const taxRaw        = taxBalance?.balance.coinBalance;
  const hasTax        = Number(taxRaw ?? 0) > 0;

  // ── Buy input validation ──────────────────────────────────────────────────

  const usdcRaw        = Number(usdcBalance?.balance.coinBalance ?? 0);
  const usdcHuman      = usdcRaw / MULTIPLIER;          // human-readable max
  const inputNum       = parseFloat(usdcInput) || 0;
  const inputRaw       = Math.floor(inputNum * MULTIPLIER); // on-chain value
  const taxReceived    = inputNum * 10;                  // 1 USDC = 10 TAX_COIN
  const recordCount    = Math.floor(taxReceived / 100);  // each record = 100 TAX_COIN

  const isInsufficientUsdc = inputNum > usdcHuman;
  const isInvalidInput     = inputNum < 1;
  const buyDisabled        = buyStatus === "loading" || !firstUsdcId || isInsufficientUsdc || isInvalidInput;

  async function refetchAll() {
    await Promise.all([
      refetchUsdc(),
      refetchTax(),
      queryClient.invalidateQueries({ queryKey: ["coins", address, USDC_TYPE] }),
      queryClient.invalidateQueries({ queryKey: ["coins", address, TAX_TYPE] }),
    ]);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleMint() {
    if (!address) return;
    setMintStatus("loading");
    setErrMsg("");
    try {
      await dAppKit.signAndExecuteTransaction({ transaction: buildMintUsdc(1_000_000_000, address) });
      setMintStatus("ok");
      await refetchAll();
    } catch (e) {
      setMintStatus("err");
      setErrMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleBuyTax() {
    if (!firstUsdcId) return;
    setBuyStatus("loading");
    setErrMsg("");
    try {
      await dAppKit.signAndExecuteTransaction({ transaction: buildBuyTax(firstUsdcId, inputRaw) });
      setBuyStatus("ok");
      await refetchAll();
    } catch (e) {
      setBuyStatus("err");
      setErrMsg(e instanceof Error ? e.message : String(e));
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold">Top Up</h2>

      {/* Balances */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="mb-1 text-xs text-slate-400">USDC</p>
          <p className="font-mono text-lg font-semibold text-slate-800">
            {usdcLoading ? <BalanceSkeleton /> : formatBalance(usdcBalance?.balance.coinBalance)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="mb-1 text-xs text-slate-400">TAX_COIN</p>
          <p className={`font-mono text-lg font-semibold ${hasTax ? "text-slate-800" : "text-amber-500"}`}>
            {taxLoading ? <BalanceSkeleton /> : formatBalance(taxRaw)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">

        {/* Mint USDC */}
        <div className="flex items-center gap-3">
          <Button onClick={handleMint} disabled={mintStatus === "loading"}>
            {mintStatus === "loading"
              ? <span className="flex items-center gap-2"><Spinner />Processing…</span>
              : "Mint 1000 USDC"}
          </Button>
          {mintStatus === "ok"  && <Badge color="green">Success</Badge>}
          {mintStatus === "err" && <Badge color="red">Failed</Badge>}
        </div>

        {/* Buy TAX_COIN */}
        <div className="flex flex-col gap-2">
          {/* Rate info */}
          <div className="flex flex-col gap-0.5 text-xs text-slate-400">
            <span>1 USDC = 10 TAX_COIN</span>
            <span>Each Record costs 100 TAX_COIN</span>
          </div>

          {/* Amount input */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="1"
              value={usdcInput}
              onChange={(e) => {
                setUsdcInput(e.target.value);
                setBuyStatus("idle");
                setErrMsg("");
              }}
              className="w-28 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono text-slate-800 bg-white focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              placeholder="100"
            />
            <span className="text-sm text-slate-500">USDC</span>
          </div>

          {/* Dynamic preview */}
          {inputNum >= 1 && !isInsufficientUsdc && (
            <p className="text-xs text-slate-400">
              = {taxReceived.toLocaleString()} TAX_COIN — can Record {recordCount} times
            </p>
          )}

          {/* Buy button row */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleBuyTax}
              disabled={buyDisabled}
              title={!firstUsdcId ? "Need USDC first" : undefined}
            >
              {buyStatus === "loading"
                ? <span className="flex items-center gap-2"><Spinner />Processing…</span>
                : "Buy TAX_COIN"}
            </Button>
            {buyStatus === "ok"  && <Badge color="green">Success</Badge>}
            {buyStatus === "err" && <Badge color="red">Failed</Badge>}
            {!firstUsdcId && buyStatus === "idle" && (
              <span className="text-xs text-slate-400">Mint USDC first</span>
            )}
            {isInsufficientUsdc && firstUsdcId && (
              <span className="text-xs text-red-500">Insufficient USDC</span>
            )}
          </div>
        </div>
      </div>

      {errMsg && (
        <p className="mt-3 break-all text-xs text-red-500">{errMsg}</p>
      )}
    </Card>
  );
}
