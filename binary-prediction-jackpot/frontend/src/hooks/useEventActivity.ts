import { useQuery } from '@tanstack/react-query'
import { suiClient } from '../lib/sui'
import { PACKAGE_ID } from '../lib/constants'

export type ActivityKind =
  | 'event_created'
  | 'position_bought'
  | 'resolution_proposed'
  | 'resolution_finalized'
  | 'redeemed'
  | 'invoice_minted'
  | 'jackpot_claimed'

export type ActivityItem = {
  kind: ActivityKind
  eventId: string | null
  account: string | null
  amount: number | null
  side: number | null
  yesPool: number | null
  noPool: number | null
  outcome: number | null
  txDigest: string
  timestampMs: number
}

async function fetchActivities(eventId?: string): Promise<ActivityItem[]> {
  const kinds: ActivityKind[] = [
    'event_created',
    'position_bought',
    'resolution_proposed',
    'resolution_finalized',
    'redeemed',
    'invoice_minted',
    'jackpot_claimed',
  ]

  const moveEventTypes = kinds.map((k) => `${PACKAGE_ID}::prediction_market::${toPascalCase(k)}`)

  const results = await Promise.allSettled(
    moveEventTypes.map((t) =>
      suiClient.queryEvents({ query: { MoveEventType: t }, limit: 20 })
    )
  )

  const items: ActivityItem[] = []
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return
    r.value.data.forEach((e) => {
      const p = e.parsedJson as Record<string, unknown>
      const evId = (p.event_id as string) ?? null
      if (eventId && evId !== eventId) return
      items.push({
        kind: kinds[i],
        eventId: evId,
        account: (p.user as string) ?? (p.creator as string) ?? (p.proposer as string) ?? null,
        amount: p.collateral_in ? Number(p.collateral_in) : p.payout ? Number(p.payout) : null,
        side: p.side !== undefined ? Number(p.side) : null,
        yesPool: p.yes_pool ? Number(p.yes_pool) : null,
        noPool: p.no_pool ? Number(p.no_pool) : null,
        outcome: p.outcome !== undefined ? Number(p.outcome) : null,
        txDigest: e.id.txDigest,
        timestampMs: Number(e.timestampMs ?? 0),
      })
    })
  })

  return items.sort((a, b) => b.timestampMs - a.timestampMs)
}

function toPascalCase(s: string) {
  return s.replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase())
}

export function useEventActivity(eventId?: string) {
  return useQuery({
    queryKey: ['activity', eventId ?? 'all'],
    queryFn: () => fetchActivities(eventId),
    refetchInterval: 15_000,
  })
}
