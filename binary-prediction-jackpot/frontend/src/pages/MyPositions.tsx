import { useCurrentAccount } from '@mysten/dapp-kit'
import { Wallet, Briefcase, RefreshCw } from 'lucide-react'
import { useMyPositions } from '../hooks/useMyPositions'
import { useEvents } from '../hooks/useEvents'
import { PositionCard } from '../components/PositionCard'
import { SIDE_YES, STATE_RESOLVED } from '../lib/constants'

export function MyPositions() {
  const account = useCurrentAccount()
  const { data: positions, isLoading, refetch } = useMyPositions()
  const { data: events } = useEvents()

  if (!account) {
    return (
      <div className="rounded-2xl border border-dashed border-black/15 py-16 text-center text-neutral-400">
        <Wallet className="mx-auto mb-3 size-8 opacity-30" />
        <p className="font-medium">Connect your wallet</p>
        <p className="mt-1 text-xs">Your positions will appear here</p>
      </div>
    )
  }

  const resolvedWinners = positions?.filter((p) => {
    const ev = events?.find((e) => e.id === p.event_id)
    if (!ev || ev.state !== STATE_RESOLVED) return false
    if (ev.final_outcome === 3) return true // Invalid
    if (ev.final_outcome === 1 && p.side === SIDE_YES) return true
    if (ev.final_outcome === 2 && p.side !== SIDE_YES) return true
    return false
  }).length ?? 0

  const totalValue = positions?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  return (
    <div className="space-y-5">
      {/* Portfolio overview */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Positions',    value: positions?.length ?? 0,                  cls: 'text-neutral-800' },
          { label: 'Total Value',  value: `${(totalValue / 1e6).toFixed(2)} USDC`, cls: 'text-indigo-700' },
          { label: 'Redeemable',   value: resolvedWinners,                          cls: 'text-emerald-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-black/8 bg-white p-3 text-center shadow-sm">
            <div className={`text-lg font-bold ${s.cls}`}>{s.value}</div>
            <div className="text-[11px] text-neutral-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-neutral-600" />
          <h2 className="text-lg font-bold text-neutral-900">My Positions</h2>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
        >
          <RefreshCw className="size-3" /> Refresh
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-100" />)}
        </div>
      )}

      {!isLoading && positions?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/15 py-12 text-center text-neutral-400">
          <Briefcase className="mx-auto mb-3 size-7 opacity-30" />
          <p className="font-medium">No positions yet</p>
          <p className="mt-1 text-xs">Buy YES or NO on an event to get started</p>
        </div>
      )}

      <div className="space-y-3">
        {positions?.map((position) => {
          const event = events?.find((e) => e.id === position.event_id)
          return <PositionCard key={position.id} position={position} event={event} />
        })}
      </div>
    </div>
  )
}
