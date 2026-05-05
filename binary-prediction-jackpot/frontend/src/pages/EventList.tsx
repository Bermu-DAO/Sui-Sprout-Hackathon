import { useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { LayoutGrid, RefreshCw, Wallet, AlertCircle } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { usePortfolio } from '../hooks/usePortfolio'
import { EventCard } from '../components/EventCard'
import { STATE_OPEN, STATE_PROPOSED, STATE_RESOLVED } from '../lib/constants'

const FILTERS = ['All', 'Trading', 'Proposed', 'Resolved'] as const
type Filter = typeof FILTERS[number]

export function EventList() {
  const account = useCurrentAccount()
  const { data: events = [], isLoading, error, refetch } = useEvents()
  const { data: portfolio } = usePortfolio(events)
  const [filter, setFilter] = useState<Filter>('All')

  const filtered = events.filter((e) => {
    if (filter === 'All') return true
    if (filter === 'Trading')  return e.state === STATE_OPEN
    if (filter === 'Proposed') return e.state === STATE_PROPOSED
    if (filter === 'Resolved') return e.state === STATE_RESOLVED
    return true
  })

  const open     = events.filter((e) => e.state === STATE_OPEN).length
  const total    = events.length

  return (
    <div className="space-y-5">
      {/* Account overview */}
      <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-emerald-50/80 via-white to-cyan-50/60 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Account Overview</h2>
            <p className="mt-0.5 text-xs text-neutral-500">Your portfolio stats on this prediction market</p>
          </div>
          {!account && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Wallet className="size-3.5" /> Connect wallet to see your stats
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: 'USDC Balance',    value: '—',                                                  note: 'testnet' },
            { label: 'Participated',    value: account ? `${portfolio?.participated ?? 0}`,          note: 'events' },
            { label: 'Claimable',       value: account ? `${portfolio?.claimable ?? 0}`,             note: 'positions' },
            { label: 'Trading / Total', value: `${open} / ${total}`,                                 note: 'events' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-black/8 bg-white/80 p-3">
              <div className="text-[11px] text-neutral-400">{s.label}</div>
              <div className="mt-1 text-base font-bold text-neutral-900">{s.value}</div>
              <div className="text-[10px] text-neutral-400">{s.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Header + filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-4 text-neutral-600" />
            <h1 className="text-xl font-bold text-neutral-900">Event Hall</h1>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
          >
            <RefreshCw className="size-3" /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-black/10 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-neutral-100" />)}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Failed to load events: {error.message}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/15 py-16 text-center text-neutral-400">
          <LayoutGrid className="mx-auto mb-3 size-8 opacity-30" />
          <p className="font-medium">No {filter !== 'All' ? filter.toLowerCase() : ''} events</p>
          <p className="mt-1 text-xs">Events will appear here after contract deployment</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </div>
  )
}


