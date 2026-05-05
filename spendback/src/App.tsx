import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { InvoiceList } from "./components/InvoiceList";
import { LotteryPanel } from "./components/LotteryPanel";
import { TopUpPanel } from "./components/TopUpPanel";
import { TransactionList } from "./components/TransactionList";

export default function App() {
  const account = useCurrentAccount();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-indigo-600">SPENDBACK</span>
            <span className="hidden text-[10px] leading-none text-slate-400 sm:block">
              Record on-chain activity → earn lottery tickets
            </span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {!account ? (
          /* ── Welcome screen ── */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-6xl">🎟</div>
            <h1 className="mb-2 text-2xl font-bold text-slate-800">Welcome to SPENDBACK</h1>
            <p className="mb-1 text-sm text-slate-500 max-w-sm">
              Record your on-chain transactions as Invoices and enter the lottery.
            </p>
            <p className="mb-8 text-sm font-medium text-indigo-500">
              Win the USDC prize pool every round.
            </p>
            <ConnectButton />
          </div>
        ) : (
          /* ── Dashboard ── */
          <div className="flex flex-col gap-6">
            {/* Row 1 — TopUp + Lottery side by side on desktop */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <TopUpPanel />
              <LotteryPanel />
            </div>

            {/* Row 2 — Recent transactions */}
            <TransactionList />

            {/* Row 3 — Invoice history */}
            <InvoiceList />
          </div>
        )}
      </main>
    </div>
  );
}
