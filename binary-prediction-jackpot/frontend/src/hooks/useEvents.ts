import { useQuery } from '@tanstack/react-query'
import { suiClient } from '../lib/sui'
import { PACKAGE_ID } from '../lib/constants'
import type { EventData } from '../types'

async function fetchEvents(): Promise<EventData[]> {
  // Query Move events to discover all Event object IDs
  const moveEvents = await suiClient.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::prediction_market::EventCreated` },
    limit: 50,
  })

  const eventIds: string[] = moveEvents.data
    .map((e) => {
      const parsed = e.parsedJson as { event_id?: string }
      return parsed?.event_id ?? ''
    })
    .filter(Boolean)

  if (eventIds.length === 0) return []

  const objects = await suiClient.multiGetObjects({
    ids: eventIds,
    options: { showContent: true },
  })

  return objects
    .filter((o) => o.data?.content?.dataType === 'moveObject')
    .map((o) => {
      const fields = (o.data!.content as { fields: Record<string, unknown> }).fields
      return {
        id: o.data!.objectId,
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
      } as EventData
    })
}

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
    refetchInterval: 10_000,
  })
}
