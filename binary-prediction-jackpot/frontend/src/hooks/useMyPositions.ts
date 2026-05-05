import { useQuery } from '@tanstack/react-query'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { suiClient } from '../lib/sui'
import { POSITION_TYPE } from '../lib/constants'
import type { PositionData } from '../types'

async function fetchPositions(owner: string): Promise<PositionData[]> {
  const result = await suiClient.getOwnedObjects({
    owner,
    filter: { StructType: POSITION_TYPE },
    options: { showContent: true },
  })

  return result.data
    .filter((o) => o.data?.content?.dataType === 'moveObject')
    .map((o) => {
      const fields = (o.data!.content as { fields: Record<string, unknown> }).fields
      return {
        id: o.data!.objectId,
        event_id: fields.event_id as string,
        side: Number(fields.side),
        amount: Number(fields.amount),
      } as PositionData
    })
}

export function useMyPositions() {
  const account = useCurrentAccount()
  return useQuery({
    queryKey: ['positions', account?.address],
    queryFn: () => fetchPositions(account!.address),
    enabled: !!account?.address,
    refetchInterval: 10_000,
  })
}
