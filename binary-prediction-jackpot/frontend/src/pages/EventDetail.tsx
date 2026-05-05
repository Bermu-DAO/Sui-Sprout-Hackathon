import { useParams, Link } from 'react-router-dom'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Clock, TrendingUp, Wallet, Circle,
  CheckCircle2, AlertCircle, BarChart2, Activity,
  Coins, Gavel, ChevronRight, ArrowUpRight
} from 'lucide-react'
import { suiClient } from '../lib/sui'
import { BuyForm } from '../components/BuyForm'
import { PositionCard } from '../components/PositionCard'
import { useMyPositions } from '../hooks/useMyPositions'
import { useEventActivity } from '../hooks/useEventActivity'
import {
  OUTCOME_YES, OUTCOME_NO, OUTCOME_INVALID,
  STATE_OPEN, STATE_PROPOSED, STATE_RESOLVED,
  SIDE_YES
} from '../lib/constants'
import type { EventData } from '../types'

const STATE_CONFIG: Record<number, { label: string; badge: string }> = {
  [STATE_OPEN]:     { label: 'Trading',  badge: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  [STATE_PROPOSED]: { label: 'Proposed', badge: 'border-amber-200 bg-amber-50 text-amber-700' },
  [STATE_RESOLVED]: { label: 'Resolved', badge: 'border-neutral-200 bg-neutral-50 text-neutral-600' },
}

const OUTCOME_CONFIG: Record<number, { label: string; cls: string }> = {
  [OUTCOME_YES]:     { label: 'YES wins',  cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  [OUTCOME_NO]:      { label: 'NO wins',   cls: 'border-rose-200 bg-rose-50 text-rose-700' },
  [OUTCOME_INVALID]: { label: 'Invalid',   cls: 'border-amber-200 bg-amber-50 text-amber-700' },
}

const ACTIVITY_LABELS: Record<string, string> = {
  event_created: 'Event Created',
  position_bought: 'Position Bought',
  resolution_proposed: 'Resolution Proposed',
  resolution_finalized: 'Resolution Finalized',
  redeemed: 'Redeemed',
  invoice_minted: 'Ticket Issued',
  jackpot_claimed: 'Jackpot Claimed',
}

const ACTIVITY_COLORS: Record<string, string> = {
  event_created: 'bg-sky-500',
  position_bought: 'bg-emerald-500',
  resolution_proposed: 'bg-amber-500',
  resolution_finalized: 'bg-cyan-500',
  redeemed: 'bg-lime-500',
  invoice_minted: 'bg-indigo-500',
  jackpot_claimed: 'bg-orange-500',
}

function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async (): Promise<EventData> => {
      const obj = await suiClient.getObject({ id, options: { showContent: true } })
      const fields = (obj.data!.content as { fields: Record<string, unknown> }).fields
      return {
        id,
        question: fields.question as string,
        close_time: Number(fields.close_time),
        state: Number(fields.state),
        final_outcome: Number(fields.final_outcome),
        proposed_outcome: Number(fields.proposed_outcome),
        proposed_at: Number(fields.proposed_at),
        can_finalize_at: Number(fields.can_finalize_at),
        yes_pool: Number(fields.yes_pool),
        no_pool: Number(fields.no_pool),
        total_pool_snapshot: Number(fields.total_pool_snapshot),
        winning_pool_snapshot: Number(fields.winning_pool_snapshot),
      }
    },
    refetchInterval: 8_000,
  })
}

function useUsdcCoin(owner?: string) {
  return useQuery({
    queryKey: ['usdcCoin', owner],
    queryFn: async () => {
      if (!owner) return null
      const result = await suiClient.getCoins({ owner, coinType: '0x2::coin::Coin<USDC>' })
      return result.data[0]?.coinObjectId ?? null
    },
    enabled: !!owner,
  })
}

function PoolPanel({ label, pool, totalPool, color }: {
  label: string; pool: number; totalPool: number; color: 'emerald' | 'rose'
}) {
  const prob = totalPool > 0 ? (pool / totalPool) * 100 : 50
  const barWidth = Math.max(8, Math.min(92, prob))
  const c = color === 'emerald'
    ? { bg: 'from-emerald-50 to-emerald-100/30', border: 'border-emerald-200', text: 'text-emerald-800', bar: 'bg-emerald-500', barBg: 'bg-emerald-200/80' }
    : { bg: 'from-rose-50 to-rose-100/30', border: 'border-rose-200', text: 'text-rose-800', bar: 'bg-rose-500', barBg: 'bg-rose-200/80' }

  return (
    <div className={`flex flex-col rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} p-4`}>
      <div className={`flex items-center justify-between text-sm ${c.text}`}>
        <span className="font-semibold">{label}</span>
        <span className="text-xs">{(pool / 1e6).toFixed(2)} USDC</span>
      </div>
      <div className={`mt-2 text-4xl font-semibold leading-none ${c.text}`}>{prob.toFixed(1)}%</div>
      <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${c.barBg}`}>
        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  )
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const account = useCurrentAccount()
  const { data: event, isLoading } = useEvent(id!)
  const { data: usdcCoinId } = useUsdcCoin(account?.address)
  const { data: positions = [] } = useMyPositions()
  const { data: activities = [] } = useEventActivity(id)

  const myPositions = positions.filter((p) => p.event_id === id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-8 text-center text-neutral-500">
        <AlertCircle className="mx-auto mb-2 size-6 opacity-40" />
        <p>Event not found</p>
        <Link to="/" className="mt-2 block text-sm text-indigo-600">← Back to Hall</Link>
      </div>
    )
  }

  const stateInfo = STATE_CONFIG[event.state] ?? STATE_CONFIG[STATE_RESOLVED]
  const outcomeInfo = OUTCOME_CONFIG[event.final_outcome]
  const totalPool = event.yes_pool + event.no_pool
  const yesPercent = totalPool > 0 ? Math.round((event.yes_pool / totalPool) * 100) : 50

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link to="/" className="flex items-center gap-1 hover:text-neutral-800">
          <ArrowLeft className="size-4" /> Events
        </Link>
        <ChevronRight className="size-3" />
        <span className="line-clamp-1 text-neutral-700">{event.question}</span>
      </div>

      {/* Event header */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold leading-tight text-neutral-900">{event.question}</h2>
            <span className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${stateInfo.badge}`}>
              <Circle className="size-1.5 fill-current" />
              {stateInfo.label}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><Clock className="size-3" /> Closes {new Date(event.close_time).toLocaleString()}</span>
            <span className="flex items-center gap-1"><TrendingUp className="size-3" /> Pool: {(totalPool / 1e6).toFixed(2)} USDC</span>
            {!account && <span className="flex items-center gap-1 text-amber-600"><Wallet className="size-3" /> Connect wallet to trade</span>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/" className="flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
              <ArrowLeft className="size-3" /> Back to Hall
            </Link>
            <Link to={`/resolve/${event.id}`} className="flex items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
              <Gavel className="size-3" /> Resolve Page
            </Link>
          </div>

          {event.state === STATE_RESOLVED && outcomeInfo && (
            <div className={`mt-3 rounded-xl border px-4 py-2.5 text-sm font-semibold ${outcomeInfo.cls}`}>
              Final Result: {outcomeInfo.label}
            </div>
          )}

          {event.state === STATE_RESOLVED && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-black/8 bg-neutral-50 p-3 text-xs text-neutral-600">
              <div><span className="text-neutral-400">Total snapshot: </span>{(event.total_pool_snapshot / 1e6).toFixed(2)} USDC</div>
              <div><span className="text-neutral-400">Winning snapshot: </span>{(event.winning_pool_snapshot / 1e6).toFixed(2)} USDC</div>
            </div>
          )}

          {event.state === STATE_PROPOSED && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              <div className="flex items-center gap-1.5 font-medium">
                <AlertCircle className="size-3.5" /> Resolution Proposed
              </div>
              <div className="mt-1">Can finalize at: {new Date(event.can_finalize_at).toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      {/* Trade cockpit */}
      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
              <BarChart2 className="size-4" /> Trade Cockpit
            </div>
            <div className="text-xs text-neutral-400">Observe probabilities, view positions, and buy</div>
          </div>
          <div className="rounded-lg border border-black/8 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600">
            Total: <span className="font-semibold text-neutral-900">{(totalPool / 1e6).toFixed(2)} USDC</span>
          </div>
        </div>

        {/* YES / NO panels */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <PoolPanel label="YES" pool={event.yes_pool} totalPool={totalPool} color="emerald" />
          <PoolPanel label="NO"  pool={event.no_pool}  totalPool={totalPool} color="rose" />
        </div>

        {/* Pool bar */}
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-neutral-500">
            <span>YES {yesPercent}%</span>
            <span>NO {100 - yesPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-rose-200/80">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${Math.max(8, Math.min(92, yesPercent))}%` }} />
          </div>
        </div>

        {/* Buy form */}
        <BuyForm event={event} usdcCoinId={usdcCoinId ?? undefined} />
      </div>

      {/* My positions on this event */}
      {myPositions.length > 0 && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
            <Coins className="size-4" /> My Positions on This Event
          </div>
          <div className="space-y-3">
            {myPositions.map((pos) => (
              <PositionCard key={pos.id} position={pos} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Jackpot info */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
          <Activity className="size-4" /> Jackpot Lottery
        </div>
        <p className="mt-1.5 text-xs text-amber-700">
          10% of every buy goes to the Jackpot pool. You automatically receive one lottery ticket per purchase.
          After the draw, the winning ticket holder claims the entire Jackpot pool.
        </p>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
          <Activity className="size-4" /> Recent Activity
        </div>
        <p className="mb-3 text-xs text-neutral-400">On-chain events for this market</p>

        {activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 py-8 text-center text-xs text-neutral-400">
            No activity recorded yet
          </div>
        ) : (
          <div className="space-y-2">
            {activities.slice(0, 10).map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${
                  item.kind === 'position_bought' && item.side === SIDE_YES
                    ? 'border-emerald-200 bg-emerald-50/60'
                    : item.kind === 'position_bought'
                    ? 'border-rose-200 bg-rose-50/60'
                    : 'border-black/8 bg-neutral-50'
                }`}
              >
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${ACTIVITY_COLORS[item.kind] ?? 'bg-neutral-400'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-neutral-800">{ACTIVITY_LABELS[item.kind] ?? item.kind}</span>
                    {item.amount && (
                      <span className="shrink-0 font-semibold text-neutral-700">
                        {(item.amount / 1e6).toFixed(2)} USDC
                      </span>
                    )}
                  </div>
                  {item.account && (
                    <div className="mt-0.5 text-neutral-400">
                      {item.account.slice(0, 8)}...{item.account.slice(-4)}
                    </div>
                  )}
                  {item.kind === 'position_bought' && item.yesPool !== null && item.noPool !== null && (
                    <div className="mt-0.5 text-neutral-400">
                      After: YES {(item.yesPool / 1e6).toFixed(2)} · NO {(item.noPool / 1e6).toFixed(2)} USDC
                    </div>
                  )}
                  <div className="mt-0.5 flex items-center gap-1 text-neutral-300">
                    <a
                      href={`https://suiscan.xyz/testnet/tx/${item.txDigest}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-0.5 hover:text-indigo-500"
                    >
                      {item.txDigest.slice(0, 10)}... <ArrowUpRight className="size-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
