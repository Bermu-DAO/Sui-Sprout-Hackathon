import { useQuery } from '@tanstack/react-query'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { suiClient } from '../lib/sui'
import { PACKAGE_ID, ADMIN_CAP_ID } from '../lib/constants'

export type AdminCapInfo = {
  adminCapId: string | null
  isAdmin: boolean
}

/** Checks if the connected wallet owns the AdminCap object. */
export function useAdminCap() {
  const account = useCurrentAccount()

  return useQuery<AdminCapInfo>({
    queryKey: ['adminCap', account?.address],
    queryFn: async (): Promise<AdminCapInfo> => {
      if (!account?.address) return { adminCapId: null, isAdmin: false }

      // Check if the hardcoded ADMIN_CAP_ID is owned by the current wallet
      try {
        const obj = await suiClient.getObject({ id: ADMIN_CAP_ID, options: { showOwner: true } })
        const owner = obj.data?.owner
        if (
          owner &&
          typeof owner === 'object' &&
          'AddressOwner' in owner &&
          (owner as { AddressOwner: string }).AddressOwner === account.address
        ) {
          return { adminCapId: ADMIN_CAP_ID, isAdmin: true }
        }
      } catch {
        // fall through
      }

      // Fallback: scan owned objects for AdminCap type
      try {
        const result = await suiClient.getOwnedObjects({
          owner: account.address,
          filter: { StructType: `${PACKAGE_ID}::prediction_market::AdminCap` },
          options: { showContent: false },
        })
        const found = result.data[0]?.data?.objectId ?? null
        return { adminCapId: found, isAdmin: !!found }
      } catch {
        return { adminCapId: null, isAdmin: false }
      }
    },
    enabled: !!account?.address,
    refetchInterval: 30_000,
  })
}
