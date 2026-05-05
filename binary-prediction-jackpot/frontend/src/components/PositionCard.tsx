import { useState } from 'react'
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { ArrowUpRight, CheckCircle2, AlertCircle, Coins } from 'lucide-react'
import type { PositionData, EventData } from '../types'
import { buildRedeemTx } from '../lib/transactions'
import { SIDE_YES, STATE_RESOLVED, OUTCOME_YES, OUTCOME_NO, OUTCOME_INVALID } from '../lib/constants'

interface Props {
  position: PositionData
  event?: EventData
}

function calcPayout(position: PositionData, event: EventData): number {
  if (event.final_outcome === OUTCOME_INVALID) return position.amount
  if (event.final_outcome === OUTCOME_YES && position.side === SIDE_YES && event.winning_pool_snapshot > 0)
    return Math.floor((position.amount * event.total_pool_snapshot) / event.winning_pool_snapshot)
  if (event.final_outcome === OUTCOME_NO && position.side !== SIDE_YES && event.winning_pool_snapshot > 0)
    return Math.floor((position.amount * event.total_pool_snapshot) / event.winning_pool_snapshot)
  return 0
}

function isWinner(position: PositionData, event: EventData): boolean {
  if (event.final_outcome === OUTCOME_INVALID) return true
  if (event.final_outcome === OUTCOME_YES && position.side === SIDE_YES) return true
  if (event.final_outcome === OUTCOME_NO && position.side !== SIDE_YES) return true
  return false
}

export function PositionCard({ position, event }: Props) {
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const [txResult, setTxResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isYes = position.side === SIDE_YES
  const resolved = event?.state === STATE_RESOLVED
  const winner = resolved && event ? isWinner(position, event) : false
  const payout = resolved && event ? calcPayout(position, event) : 0

  function handleRedeem() {
    if (!event) return
    setError(null)
    signAndExecute(
      { transaction: buildRedeemTx(event.id, position.id) },
      {
        onSuccess: (r) => setTxResult(r.digest),
        onError:   (e) => setError(e.message),
      }
    )
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all ${
      winner && resolved
        ? isYes ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' : 'border-rose-200 bg-gradient-to-br from-rose-50 to-white'
        : 'border-black/10 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${
              isYes ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-rose-200 bg-rose-100 text-rose-800'
            }`}>
              {isYes ? 'YES' : 'NO'}
            </span>
            {resolved && (
              winner
                ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="size-3" /> Winner</span>
                : <span className="text-xs text-neutral-400">No win</span>
            )}
          </div>
          <div className="text-sm text-neutral-600">
            <span className="text-neutral-400">Amount: </span>
            <span className="font-semibold text-neutral-800">{(position.amount / 1e6).toFixed(2)} USDC</span>
          </div>
          {event && <div className="line-clamp-1 text-xs text-neutral-400">{event.question}</div>}
        </div>

        {resolved && winner && payout > 0 && (
          <div className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
            <div className="text-[10px] text-emerald-600">Payout</div>
            <div className="text-sm font-bold text-emerald-700">{(payout / 1e6).toFixed(2)}</div>
            <div className="text-[10px] text-emerald-600">USDC</div>
          </div>
        )}
      </div>

      {resolved && winner && !txResult && (
        <button
          onClick={handleRedeem}
          disabled={isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          <Coins className="size-4" />
          {isPending ? 'Redeeming...' : 'Redeem'}
        </button>
      )}

      {txResult && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          <span className="break-all">{txResult}</span>
        </div>
      )}
      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
