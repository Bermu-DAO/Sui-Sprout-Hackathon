import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import {
  PlusCircle, Clock, AlertCircle, CheckCircle2,
  Wallet, ShieldAlert, Eye, Calendar
} from 'lucide-react'
import { useAdminCap } from '../hooks/useAdminCap'
import { buildCreateEventTx } from '../lib/transactions'
import { INVOICE_SYSTEM_ID } from '../lib/constants'

const DURATION_PRESETS = [
  { label: '1 min',  ms: 60_000 },
  { label: '5 min',  ms: 300_000 },
  { label: '1 hr',   ms: 3_600_000 },
  { label: '1 day',  ms: 86_400_000 },
  { label: '7 days', ms: 604_800_000 },
]

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function CreateEvent() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const { data: adminInfo, isFetching: checkingAdmin } = useAdminCap()

  const [question, setQuestion] = useState('')
  const [durationMs, setDurationMs] = useState(3_600_000)
  const [customDuration, setCustomDuration] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const effectiveDurationMs = customDuration
    ? parseDuration(customDuration)
    : durationMs

  const closeTime = effectiveDurationMs ? Date.now() + effectiveDurationMs : null
  const isReady = !!account && adminInfo?.isAdmin && !!question.trim() && !!closeTime

  function parseDuration(s: string): number | null {
    const m = s.trim().match(/^(\d+(?:\.\d+)?)\s*(s|m|h|d)?$/i)
    if (!m) return null
    const n = parseFloat(m[1])
    const unit = (m[2] ?? 's').toLowerCase()
    const mult: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }
    return Math.floor(n * (mult[unit] ?? 1000))
  }

  function handleCreate() {
    if (!isReady || !adminInfo?.adminCapId || !closeTime) return
    setError(null); setSuccess(null)

    const tx = buildCreateEventTx(adminInfo.adminCapId, INVOICE_SYSTEM_ID, question.trim(), closeTime)
    signAndExecute({ transaction: tx }, {
      onSuccess: (r) => {
        setSuccess(r.digest)
        setQuestion('')
        setTimeout(() => navigate('/'), 2000)
      },
      onError: (e) => setError(e.message),
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Create Event</h1>
        <p className="mt-1 text-sm text-neutral-500">Admin only — create a new binary prediction market</p>
      </div>

      {/* Wallet gate */}
      {!account && (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-black/15 p-5 text-neutral-400">
          <Wallet className="size-5 shrink-0" />
          <p className="text-sm">Connect your wallet to check admin permissions</p>
        </div>
      )}

      {account && checkingAdmin && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-neutral-500">
          Checking admin permissions...
        </div>
      )}

      {account && !checkingAdmin && !adminInfo?.isAdmin && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div>
            <div className="font-semibold text-amber-800">No Permission</div>
            <div className="mt-1 text-sm text-amber-700">Only the admin can create events.</div>
            <div className="mt-1 text-xs text-amber-600">Connected: {shortAddr(account.address)}</div>
          </div>
        </div>
      )}

      {account && adminInfo?.isAdmin && (
        <div className="space-y-4">
          {/* Admin badge */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <CheckCircle2 className="size-3.5" />
            Admin verified · {shortAddr(account.address)}
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm space-y-5">
            {/* Question */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-800">
                Event Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Will ETH exceed $5,000 before end of Q2?"
                rows={3}
                className="w-full resize-none rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
              />
              <div className="mt-1 text-right text-xs text-neutral-400">{question.length} chars</div>
            </div>

            {/* Duration presets */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-800">
                Close Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.ms}
                    onClick={() => { setDurationMs(p.ms); setCustomDuration('') }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      durationMs === p.ms && !customDuration
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-black/10 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="Custom: e.g. 30s, 2h, 3d"
                  className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              {customDuration && !parseDuration(customDuration) && (
                <p className="mt-1 text-xs text-rose-600">Invalid format — use e.g. 30s, 2h, 1d</p>
              )}
            </div>

            {/* Preview */}
            {closeTime && (
              <div className="rounded-xl border border-black/8 bg-neutral-50 p-3 text-xs text-neutral-600 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-700">
                  <Eye className="size-3.5" /> Preview
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  Closes at: {new Date(closeTime).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="size-3" />
                  Can finalize at: {new Date(closeTime + 30_000).toLocaleString()} (after 30s cooldown)
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={!isReady || isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusCircle className="size-4" />
              {isPending ? 'Creating...' : 'Create Event'}
            </button>
          </div>

          {success && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              <span>Event created! Tx: <span className="break-all">{success}</span> — redirecting...</span>
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
