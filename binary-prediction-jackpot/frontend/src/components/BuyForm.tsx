import { useState, useMemo } from 'react'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import { Wallet, TrendingUp, AlertCircle, CheckCircle2, Zap } from 'lucide-react'
import type { EventData } from '../types'
import { buildBuyPositionTx } from '../lib/transactions'
import { INVOICE_SYSTEM_ID, TREASURY_ID, SIDE_YES, SIDE_NO, STATE_OPEN } from '../lib/constants'

const QUICK_PRESETS = ['1', '5', '10', '50'] as const

interface Props {
  event: EventData
  usdcCoinId?: string
}

function calcImpact(yesPool: number, noPool: number, amount: number, side: number) {
  const addYes = side === SIDE_YES ? amount : 0
  const addNo  = side === SIDE_NO  ? amount : 0
  const newYes = yesPool + addYes
  const newNo  = noPool  + addNo
  const total  = newYes + newNo
  if (total === 0) return { yesProb: 50, noProb: 50 }
  return {
    yesProb: Math.round((newYes / total) * 100),
    noProb:  Math.round((newNo  / total) * 100),
  }
}

export function BuyForm({ event, usdcCoinId }: Props) {
  const account = useCurrentAccount()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const [side, setSide] = useState<number>(SIDE_YES)
  const [amount, setAmount] = useState('10')
  const [txResult, setTxResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isOpen = event.state === STATE_OPEN
  const numAmount = Number(amount)
  const canBuy = !!account && isOpen && !!usdcCoinId && numAmount > 0

  const totalPool = event.yes_pool + event.no_pool
  const currentYesProb = totalPool > 0 ? Math.round((event.yes_pool / totalPool) * 100) : 50
  const currentNoProb  = 100 - currentYesProb

  const amountMicro = numAmount * 1_000_000
  const impact = useMemo(
    () => calcImpact(event.yes_pool, event.no_pool, amountMicro * 0.9, side),
    [event.yes_pool, event.no_pool, amountMicro, side]
  )
  const deltaYes = impact.yesProb - currentYesProb
  const deltaNo  = impact.noProb  - currentNoProb

  function handleBuy() {
    if (!canBuy || !usdcCoinId) return
    setError(null); setTxResult(null)
    const tx = buildBuyPositionTx(event.id, INVOICE_SYSTEM_ID, TREASURY_ID, usdcCoinId, BigInt(Math.floor(amountMicro)), side)
    signAndExecute({ transaction: tx }, {
      onSuccess: (r) => { setTxResult(r.digest); setAmount('10') },
      onError:   (e) => setError(e.message),
    })
  }

  if (!isOpen) {
    return (
      <div className="rounded-xl border border-black/10 bg-neutral-50 p-4 text-center text-sm text-neutral-500">
        <AlertCircle className="mx-auto mb-1.5 size-4" />
        Buying is closed — event is {event.state === 1 ? 'in proposal period' : 'resolved'}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">Buy Position</h3>
        <span className="text-xs text-neutral-500">Pool: {((totalPool) / 1e6).toFixed(2)} USDC</span>
      </div>

      {/* Side toggle */}
      <div className="flex overflow-hidden rounded-xl border border-black/10">
        <button
          onClick={() => setSide(SIDE_YES)}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            side === SIDE_YES ? 'bg-emerald-600 text-white' : 'bg-white text-neutral-500 hover:bg-emerald-50'
          }`}
        >
          YES · {currentYesProb}%
        </button>
        <button
          onClick={() => setSide(SIDE_NO)}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
            side === SIDE_NO ? 'bg-rose-600 text-white' : 'bg-white text-neutral-500 hover:bg-rose-50'
          }`}
        >
          NO · {currentNoProb}%
        </button>
      </div>

      {/* Amount input */}
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Amount (USDC)</label>
        <div className="flex overflow-hidden rounded-xl border border-black/10">
          <input
            type="number" min="0" step="1" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="flex-1 px-3 py-2.5 text-sm outline-none"
          />
          <span className="flex items-center border-l border-black/10 bg-neutral-50 px-3 text-xs text-neutral-400">USDC</span>
        </div>

        {/* Quick presets */}
        <div className="mt-2 flex gap-1.5">
          {QUICK_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                amount === p ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-black/10 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Impact simulation */}
      {numAmount > 0 && (
        <div className="rounded-xl border border-black/8 bg-neutral-50 p-3 text-[11px]">
          <div className="mb-1.5 flex items-center gap-1 font-semibold text-neutral-700">
            <Zap className="size-3" /> Trade Impact Simulation
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg border p-2 ${side === SIDE_YES ? 'border-emerald-200 bg-emerald-50' : 'border-black/8 bg-white'}`}>
              <div className="font-medium text-emerald-800">After buying YES</div>
              <div className="mt-0.5 text-neutral-600">
                YES {impact.yesProb}% <span className={deltaYes > 0 ? 'text-emerald-600' : 'text-rose-600'}>({deltaYes > 0 ? '+' : ''}{deltaYes}pp)</span>
              </div>
            </div>
            <div className={`rounded-lg border p-2 ${side === SIDE_NO ? 'border-rose-200 bg-rose-50' : 'border-black/8 bg-white'}`}>
              <div className="font-medium text-rose-800">After buying NO</div>
              <div className="mt-0.5 text-neutral-600">
                NO {impact.noProb}% <span className={deltaNo > 0 ? 'text-emerald-600' : 'text-rose-600'}>({deltaNo > 0 ? '+' : ''}{deltaNo}pp)</span>
              </div>
            </div>
          </div>
          <div className="mt-1.5 text-neutral-400">
            90% ({(numAmount * 0.9).toFixed(2)}) → main pool · 10% ({(numAmount * 0.1).toFixed(2)}) → Jackpot + 1 ticket
          </div>
        </div>
      )}

      {/* Submit */}
      {!account ? (
        <div className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/15 py-3 text-sm text-neutral-400">
          <Wallet className="size-4" /> Connect wallet to buy
        </div>
      ) : !usdcCoinId ? (
        <div className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 py-3 text-sm text-amber-600">
          <AlertCircle className="size-4" /> No USDC found — get test tokens first
        </div>
      ) : (
        <button
          onClick={handleBuy}
          disabled={!canBuy || isPending}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            side === SIDE_YES
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-rose-600 text-white hover:bg-rose-700'
          }`}
        >
          <TrendingUp className="size-4" />
          {isPending ? 'Submitting...' : `Buy ${side === SIDE_YES ? 'YES' : 'NO'} · ${amount} USDC`}
        </button>
      )}

      {txResult && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          <span className="break-all">Success: {txResult}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
