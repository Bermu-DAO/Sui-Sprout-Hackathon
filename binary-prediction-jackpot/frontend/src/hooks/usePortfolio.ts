import { useQuery } from '@tanstack/react-query'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { suiClient } from '../lib/sui'
import { POSITION_TYPE, STATE_RESOLVED, OUTCOME_YES, OUTCOME_NO, OUTCOME_INVALID } from '../lib/constants'
import type { PositionData, EventData } from '../types'

export type PortfolioSummary = {
  totalPositions: number
  totalValue: number   // sum of position amounts in micro-USDC
  claimable: number    // positions that can be redeemed
  participated: number // distinct events
}

async function fetchPortfolio(owner: string, events: EventData[]): Promise<PortfolioSummary> {
  const result = await suiClient.getOwnedObjects({
    owner,
    filter: { StructType: POSITION_TYPE },
    options: { showContent: true },
  })

  const positions: PositionData[] = result.data
    .filter((o) => o.data?.content?.dataType === 'moveObject')
    .map((o) => {
      const fields = (o.data!.content as { fields: Record<string, unknown> }).fields
      return {
        id: o.data!.objectId,
        event_id: fields.event_id as string,
        side: Number(fields.side),
        amount: Number(fields.amount),
      }
    })

  let claimable = 0
  const eventIds = new Set<string>()

  for (const pos of positions) {
    eventIds.add(pos.event_id)
    const ev = events.find((e) => e.id === pos.event_id)
    if (!ev || ev.state !== STATE_RESOLVED) continue
    if (ev.final_outcome === OUTCOME_INVALID) { claimable++; continue }
    if (ev.final_outcome === OUTCOME_YES && pos.side === 0) { claimable++; continue }
    if (ev.final_outcome === OUTCOME_NO  && pos.side === 1) { claimable++; continue }
  }

  return {
    totalPositions: positions.length,
    totalValue: positions.reduce((s, p) => s + p.amount, 0),
    claimable,
    participated: eventIds.size,
  }
}

export function usePortfolio(events: EventData[]) {
  const account = useCurrentAccount()
  return useQuery({
    queryKey: ['portfolio', account?.address],
    queryFn: () => fetchPortfolio(account!.address, events),
    enabled: !!account?.address && events.length > 0,
    refetchInterval: 15_000,
  })
}
