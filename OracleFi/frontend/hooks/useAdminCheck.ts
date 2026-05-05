"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { ORIGINAL_PACKAGE_ID } from "@/lib/constants";

// Cap type strings — use ORIGINAL_PACKAGE_ID because types are bound to original package
const POOL_ADMIN_CAP_TYPE = `${ORIGINAL_PACKAGE_ID}::staking_pool::PoolAdminCap`;
const ORACLE_ADMIN_CAP_TYPE = `${ORIGINAL_PACKAGE_ID}::price_oracle::AdminCap`;

export interface AdminStatus {
  isAdmin: boolean;
  poolAdminCapId: string | null;    // for FundRewardForm & MintOCForm
  oracleAdminCapId: string | null;  // for UpdatePriceForm
  method: string;
}

export const useAdminCheck = () => {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["admin-check", account?.address],
    queryFn: async (): Promise<AdminStatus> => {
      if (!account?.address) {
        return { isAdmin: false, poolAdminCapId: null, oracleAdminCapId: null, method: 'no_wallet' };
      }

      try {
        // Query 1: Find PoolAdminCap
        const poolCapResult = await suiClient.getOwnedObjects({
          owner: account.address,
          filter: { StructType: POOL_ADMIN_CAP_TYPE },
          options: { showType: true },
        });

        const poolAdminCapId = poolCapResult.data.length > 0
          ? poolCapResult.data[0]?.data?.objectId ?? null
          : null;

        // Query 2: Find Oracle AdminCap
        const oracleCapResult = await suiClient.getOwnedObjects({
          owner: account.address,
          filter: { StructType: ORACLE_ADMIN_CAP_TYPE },
          options: { showType: true },
        });

        const oracleAdminCapId = oracleCapResult.data.length > 0
          ? oracleCapResult.data[0]?.data?.objectId ?? null
          : null;

        const isAdmin = poolAdminCapId !== null || oracleAdminCapId !== null;

        console.log('🔍 Admin check:', {
          poolAdminCapId,
          oracleAdminCapId,
          isAdmin,
        });

        return {
          isAdmin,
          poolAdminCapId,
          oracleAdminCapId,
          method: 'query',
        };
      } catch (error) {
        console.error("❌ Error checking admin status:", error);
        return { isAdmin: false, poolAdminCapId: null, oracleAdminCapId: null, method: 'error' };
      }
    },
    enabled: !!account?.address,
    refetchInterval: 30000,
  });
};
