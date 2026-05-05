import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Gavel, Clock, CheckCircle2, AlertCircle,
  Circle, ShieldAlert, Timer, BarChart2
} from 'lucide-react'
import { suiClient } from '../lib/sui'
import { buildProposeResolutionTx, buildFinalizeResolutionTx } from '../lib/transactions'
import { useAdminCap } from '../hooks/useAdminCap'
import {
  STATE_OPEN, STATE_PROPOSED, STATE_RESOLVED,
  OUTCOME_YES, OUTCOME_NO, OUTCOME_INVALID
} from '../lib/constants'
import type { EventData } from '../types'

const LIVENESS_MS = 30_000

const OUTCOME_CONFIG = {
  [OUTCOME_YES]:     { label: 'YES wins',  cls: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  [OUTCOME_NO]:      { label: 'NO wins',   cls: 'bg-rose-600 hover:bg-rose-700 text-white' },
  [OUTCOME_INVALID]: { label: 'Invalid',   cls: 'bg-neutral-600 hover:bg-neutral-700 text-white' },
}

function useEventDetail(id: string) {
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
    refetchInterval: 5_000,
  })
}

function InfoCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-black/8 bg-white px-3 py-2.5">
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold break-words ${accent ? 'text-indigo-700' : 'text-neutral-900'}`}>{value}</div>
    </div>
  )
}

function TimelineRow({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${active ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
      <div>
        <div className="text-[11px] text-neutral-400">{label}</div>
        <div className="text-xs font-semibold text-neutral-800">{value}</div>
      </div>
    </div>
  )
}

function CheckRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-black/8 bg-white px-3 py-2 text-xs">
      <span className="text-neutral-600">{label}</span>
      <span className={`font-semibold ${ready ? 'text-emerald-600' : 'text-amber-600'}`}>
        {ready ? 'Ready' : 'Pending'}
      </span>
    </div>
  )
}

export function ResolvePage() {
  const { id } = useParams<{ id: string }>()
  const account = useCurrentAccount()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const { data: event, isLoading, refetch } = useEventDetail(id!)
  const { data: adminInfo } = useAdminCap()

  const [nowMs, setNowMs] = useState(Date.now())
  const [txResult, setTxResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  function propose(outcome: number) {
    if (!adminInfo?.adminCapId || !id) return
    setError(null); setTxResult(null)
    signAndExecute(
      { transaction: buildProposeResolutionTx(adminInfo.adminCapId, id, outcome) },
      { onSuccess: (r) => { setTxResult(r.digest); void refetch() }, onError: (e) => setError(e.message) }
    )
  }

  function finalize() {
    if (!adminInfo?.adminCapId || !id) return
    setError(null); setTxResult(null)
    signAndExecute(
      { transaction: buildFinalizeResolutionTx(adminInfo.adminCapId, id) },
      { onSuccess: (r) => { setTxResult(r.digest); void refetch() }, onError: (e) => setError(e.message) }
    )
  }

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
  }

  if (!event) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-8 text-center text-neutral-500">
        <AlertCircle className="mx-auto mb-2 size-6 opacity-40" />
        Event not found
        <Link to="/resolve" className="mt-2 block text-sm text-indigo-600">← Back to Resolve List</Link>
      </div>
    )
  }

  const isAdmin = adminInfo?.isAdmin ?? false
  const canPropose = isAdmin && event.state === STATE_OPEN && nowMs >= event.close_time
  const cooldownRemaining = event.state === STATE_PROPOSED
    ? Math.max(0, event.can_finalize_at - nowMs)
    : null
  const canFinalize = isAdmin && event.state === STATE_PROPOSED && cooldownRemaining === 0
  const totalPool = event.yes_pool + event.no_pool

  const OUTCOME_LABELS: Record<number, string> = {
    0: 'Unresolved', 1: 'YES wins', 2: 'NO wins', 3: 'Invalid',
  }
  const STATE_LABELS: Record<number, string> = {
    [STATE_OPEN]: 'Trading', [STATE_PROPOSED]: 'Proposed', [STATE_RESOLVED]: 'Resolved',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/resolve" className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800">
          <ArrowLeft className="size-4" /> Resolve List
        </Link>
        <span className="text-neutral-300">/</span>
        <span className="text-sm text-neutral-600 line-clamp-1">{event.question}</span>
      </div>

      {/* Cockpit header */}
      <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-cyan-50/60 via-white to-emerald-50/40 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-neutral-800">
              <Gavel className="size-4" /> Resolution Cockpit
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">Propose and finalize event outcomes</p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
            event.state === STATE_OPEN ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
            event.state === STATE_PROPOSED ? 'border-amber-200 bg-amber-50 text-amber-700' :
            'border-neutral-200 bg-neutral-50 text-neutral-600'
          }`}>
            <Circle className="size-1.5 fill-current" />
            {STATE_LABELS[event.state]}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <InfoCell label="Close Time" value={new Date(event.close_time).toLocaleString()} />
          <InfoCell label="Total Pool" value={`${(totalPool / 1e6).toFixed(2)} USDC`} />
          <InfoCell label="YES Pool" value={`${(event.yes_pool / 1e6).toFixed(2)} USDC`} />
          <InfoCell label="NO Pool" value={`${(event.no_pool / 1e6).toFixed(2)} USDC`} />
        </div>

        {event.state === STATE_RESOLVED && (
          <div className={`mt-3 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
            event.final_outcome === OUTCOME_YES ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
            event.final_outcome === OUTCOME_NO  ? 'border-rose-200 bg-rose-50 text-rose-700' :
            'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            Final Result: {OUTCOME_LABELS[event.final_outcome]}
          </div>
        )}
      </div>

      {/* Permission check */}
      {!account && (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-black/15 p-4 text-sm text-neutral-400">
          <ShieldAlert className="size-5 shrink-0" /> Connect wallet to resolve events
        </div>
      )}
      {account && !isAdmin && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <div className="font-semibold">No Permission</div>
            <div className="mt-0.5 text-xs">Only the admin can propose and finalize outcomes.</div>
          </div>
        </div>
      )}

      {account && isAdmin && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Actions */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                <BarChart2 className="size-4" /> Resolution Actions
              </div>
              <p className="mt-0.5 text-xs text-neutral-400">Flow: Propose → 30s cooldown → Finalize</p>
            </div>

            {/* Proposal status */}
            <div className="grid grid-cols-2 gap-2">
              <InfoCell
                label="Proposal Status"
                value={event.state >= STATE_PROPOSED ? `Proposed: ${OUTCOME_LABELS[event.proposed_outcome]}` : 'Not proposed'}
              />
              <InfoCell
                label="Finalized"
                value={event.state === STATE_RESOLVED ? 'Yes' : cooldownRemaining === 0 && event.state === STATE_PROPOSED ? 'Ready' : 'No'}
              />
            </div>

            {/* Cooldown */}
            {event.state === STATE_PROPOSED && cooldownRemaining !== null && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                cooldownRemaining === 0
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}>
                <Timer className="size-4 shrink-0" />
                {cooldownRemaining === 0
                  ? 'Cooldown complete — ready to finalize'
                  : `Cooldown: ${Math.ceil(cooldownRemaining / 1000)}s remaining`
                }
              </div>
            )}

            {/* Propose buttons */}
            <div>
              <div className="mb-2 text-xs font-medium text-neutral-500">Propose Outcome</div>
              <div className="grid grid-cols-3 gap-2">
                {([OUTCOME_YES, OUTCOME_NO, OUTCOME_INVALID] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => propose(o)}
                    disabled={!canPropose || isPending}
                    className={`rounded-xl py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${OUTCOME_CONFIG[o].cls}`}
                  >
                    {OUTCOME_CONFIG[o].label}
                  </button>
                ))}
              </div>
              {!canPropose && event.state === STATE_OPEN && (
                <p className="mt-1.5 text-xs text-neutral-400">
                  {nowMs < event.close_time
                    ? `Event closes in ${Math.ceil((event.close_time - nowMs) / 1000)}s`
                    : 'Event closed — you can propose now'}
                </p>
              )}
            </div>

            {/* Finalize button */}
            <div>
              <div className="mb-2 text-xs font-medium text-neutral-500">Finalize Result</div>
              <button
                onClick={finalize}
                disabled={!canFinalize || isPending}
                className="w-full rounded-xl border border-black/10 bg-neutral-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending ? 'Submitting...' : 'Finalize Resolution'}
              </button>
            </div>

            {txResult && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                <span className="break-all">Success: {txResult}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Timeline + checks */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
                <Clock className="size-4" /> Resolution Timeline
              </div>
              <div className="space-y-2.5 rounded-xl border border-black/8 bg-white p-3">
                <TimelineRow label="Now" value={new Date(nowMs).toLocaleString()} active={true} />
                <TimelineRow label="Close Time" value={new Date(event.close_time).toLocaleString()} active={nowMs >= event.close_time} />
                <TimelineRow
                  label="Proposed At"
                  value={event.proposed_at > 0 ? new Date(event.proposed_at).toLocaleString() : '—'}
                  active={event.state >= STATE_PROPOSED}
                />
                <TimelineRow
                  label="Can Finalize At"
                  value={event.can_finalize_at > 0 ? new Date(event.can_finalize_at).toLocaleString() : '—'}
                  active={event.state === STATE_RESOLVED || (event.state === STATE_PROPOSED && cooldownRemaining === 0)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 shadow-sm space-y-2">
              <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Readiness Checks</div>
              <CheckRow label="Admin Permission" ready={isAdmin} />
              <CheckRow label="Event Closed" ready={nowMs >= event.close_time} />
              <CheckRow label="Can Propose" ready={canPropose} />
              <CheckRow label="Can Finalize" ready={canFinalize} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
