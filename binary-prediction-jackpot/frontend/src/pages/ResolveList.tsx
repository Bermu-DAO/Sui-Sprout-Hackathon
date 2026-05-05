import { Link } from 'react-router-dom'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { Gavel, ChevronRight, Circle, Wallet, Info } from 'lucide-react'
import { useEvents } from '../hooks/useEvents'
import { useAdminCap } from '../hooks/useAdminCap'
import { STATE_OPEN, STATE_PROPOSED, STATE_RESOLVED, OUTCOME_YES, OUTCOME_NO, OUTCOME_INVALID } from '../lib/constants'

const STATE_CONFIG: Record<number, { label: string; badge: string }> = {
  [STATE_OPEN]:     { label: 'Trading',  badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  [STATE_PROPOSED]: { label: 'Proposed', badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  [STATE_RESOLVED]: { label: 'Resolved', badge: 'border-neutral-200 bg-neutral-50 text-neutral-600' },
}

const OUTCOME_LABELS: Record<number, string> = {
  [OUTCOME_YES]: 'YES wins', [OUTCOME_NO]: 'NO wins', [OUTCOME_INVALID]: 'Invalid',
}

function shortAddr(addr: string) { return `${addr.slice(0, 6)}...${addr.slice(-4)}` }

export function ResolveList() {
  const account = useCurrentAccount()
  const { data: events = [], isLoading } = useEvents()
  const { data: adminInfo } = useAdminCap()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Event Resolution</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Only the admin (resolver) can propose and finalize outcomes. Cooldown period: 30 seconds.
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm space-y-2 text-sm text-neutral-700">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
          <Info className="size-4" /> Resolution Guide
        </div>
        <div className="text-xs text-neutral-500 space-y-1">
          <p>1. Wait for the event close time to pass</p>
          <p>2. Propose YES / NO / Invalid outcome</p>
          <p>3. Wait 30 seconds cooldown period</p>
          <p>4. Finalize the result — pool snapshots are frozen</p>
        </div>
        <div className="border-t border-black/8 pt-2 text-xs text-neutral-500">
          {account
            ? <>Connected: {shortAddr(account.address)} · Admin: {adminInfo?.isAdmin ? <span className="text-emerald-600 font-medium">Yes</span> : <span className="text-amber-600">No</span>}</>
            : <span className="flex items-center gap-1"><Wallet className="size-3" /> Connect wallet to check permissions</span>
          }
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-100" />)}
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/15 py-12 text-center text-neutral-400">
          <Gavel className="mx-auto mb-3 size-7 opacity-30" />
          <p>No events to resolve</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {events.map((event) => {
          const stateInfo = STATE_CONFIG[event.state] ?? STATE_CONFIG[STATE_RESOLVED]
          const totalPool = event.yes_pool + event.no_pool
          return (
            <div key={event.id} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-sm font-semibold text-neutral-900">{event.question}</h3>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${stateInfo.badge}`}>
                  <Circle className="size-1.5 fill-current" />
                  {stateInfo.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600">
                <div><span className="text-neutral-400">Close: </span>{new Date(event.close_time).toLocaleString()}</div>
                <div><span className="text-neutral-400">Pool: </span>{(totalPool / 1e6).toFixed(2)} USDC</div>
                {event.state === STATE_RESOLVED && (
                  <div className="col-span-2">
                    <span className="text-neutral-400">Outcome: </span>
                    <span className="font-medium">{OUTCOME_LABELS[event.final_outcome] ?? '—'}</span>
                  </div>
                )}
                {event.state === STATE_PROPOSED && (
                  <div className="col-span-2 text-amber-600">
                    Can finalize at: {new Date(event.can_finalize_at).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Link
                  to={`/resolve/${event.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-neutral-900 py-2 text-xs font-semibold text-white hover:bg-neutral-700"
                >
                  <Gavel className="size-3.5" /> Open Resolve
                </Link>
                <Link
                  to={`/event/${event.id}`}
                  className="flex items-center gap-1 rounded-xl border border-black/10 px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
                >
                  Detail <ChevronRight className="size-3" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
