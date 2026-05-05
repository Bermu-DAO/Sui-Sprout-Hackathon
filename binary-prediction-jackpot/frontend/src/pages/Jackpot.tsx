import { useCurrentAccount } from '@mysten/dapp-kit'
import { Ticket, Trophy, Coins, RefreshCw, Wallet, Target } from 'lucide-react'
import { useMyInvoices } from '../hooks/useMyInvoices'
import { useInvoiceSystem } from '../hooks/useInvoiceSystem'
import { InvoiceCard } from '../components/InvoiceCard'

export function Jackpot() {
  const account = useCurrentAccount()
  const { data: invoices, isLoading: invoicesLoading, refetch } = useMyInvoices()
  const { system, treasury } = useInvoiceSystem()

  const systemData  = system.data
  const treasuryData = treasury.data
  const hasDrawn    = systemData && systemData.winner_number > 0
  const jackpotUsdc = treasuryData ? (treasuryData.pool_balance / 1_000_000).toFixed(2) : '—'
  const myWinner    = invoices?.find(
    (inv) =>
      hasDrawn &&
      inv.invoice_number === systemData!.winner_number &&
      inv.timestamp <= systemData!.jackpot_timestamp
  )

  return (
    <div className="space-y-5">
      {/* Jackpot banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-5 text-white shadow-lg">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Coins className="size-4" /> Jackpot Pool
          </div>
          <div className="mt-1 text-5xl font-black tracking-tight">{jackpotUsdc}</div>
          <div className="mt-0.5 text-sm text-white/70">USDC</div>
          <div className="mt-3 flex items-center gap-3 text-xs text-white/70">
            <span className="flex items-center gap-1">
              <Ticket className="size-3" />
              {systemData ? `${systemData.invoice_count} tickets issued` : 'Loading...'}
            </span>
            {hasDrawn && systemData && (
              <span className="flex items-center gap-1">
                <Target className="size-3" />
                Winner: #{systemData.winner_number}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Draw result */}
      {hasDrawn && systemData ? (
        <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <Trophy className="size-4 text-amber-500" /> Draw Result
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-300 bg-amber-50">
              <span className="text-xl font-black text-amber-600">#{systemData.winner_number}</span>
            </div>
            <div className="text-sm text-neutral-600">
              <div className="font-medium text-neutral-800">Winning Ticket</div>
              <div className="text-xs text-neutral-400 mt-0.5">
                Drawn at {new Date(systemData.jackpot_timestamp).toLocaleString()}
              </div>
              {myWinner && (
                <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-600">
                  <Trophy className="size-3" /> You hold the winning ticket!
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/15 p-4 text-center text-sm text-neutral-400">
          <Target className="mx-auto mb-2 size-5 opacity-40" />
          No draw yet — hold tickets and wait for the lottery
        </div>
      )}

      {/* How it works */}
      <div className="rounded-2xl border border-black/8 bg-neutral-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">How it works</div>
        <div className="mt-2 space-y-1.5 text-xs text-neutral-600">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">1</span>
            Buy YES or NO on any event — 10% goes to the Jackpot pool
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">2</span>
            You automatically receive one lottery ticket per purchase
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">3</span>
            Admin draws a random winning ticket number on-chain
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">4</span>
            The winner claims the entire Jackpot pool
          </div>
        </div>
      </div>

      {/* My tickets */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="size-4 text-neutral-600" />
            <h2 className="text-lg font-bold text-neutral-900">My Tickets</h2>
            {invoices && <span className="rounded-full border border-black/10 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-500">{invoices.length}</span>}
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
          >
            <RefreshCw className="size-3" /> Refresh
          </button>
        </div>

        {!account && (
          <div className="rounded-2xl border border-dashed border-black/15 py-12 text-center text-neutral-400">
            <Wallet className="mx-auto mb-3 size-7 opacity-30" />
            <p className="font-medium">Connect your wallet</p>
            <p className="mt-1 text-xs">Your tickets will appear here</p>
          </div>
        )}

        {account && invoicesLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />)}
          </div>
        )}

        {account && !invoicesLoading && invoices?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/15 py-12 text-center text-neutral-400">
            <Ticket className="mx-auto mb-3 size-7 opacity-30" />
            <p className="font-medium">No tickets yet</p>
            <p className="mt-1 text-xs">Buy a position to automatically receive a ticket</p>
          </div>
        )}

        <div className="space-y-3">
          {invoices?.map((invoice) => (
            <InvoiceCard key={invoice.id} invoice={invoice} system={systemData} />
          ))}
        </div>
      </div>
    </div>
  )
}
