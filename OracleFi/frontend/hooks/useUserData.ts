"use client";

import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { PACKAGE_ID, POOL_ID, REGISTRY_ID } from "../lib/constants";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";

export const useUserData = () => {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ["userData", account?.address],
    queryFn: async () => {
      if (!account?.address) return { stakeAmount: 0, pendingRewards: 0 };

      const txInfo = new Transaction();
      
      txInfo.moveCall({
        target: `${PACKAGE_ID}::staking_pool::get_stake_amount`,
        arguments: [txInfo.object(POOL_ID), txInfo.pure.address(account.address)],
      });
      
      txInfo.moveCall({
        target: `${PACKAGE_ID}::staking_pool::get_pending_rewards`,
        arguments: [txInfo.object(POOL_ID), txInfo.object(REGISTRY_ID), txInfo.pure.address(account.address)],
      });

      const response = await suiClient.devInspectTransactionBlock({
        sender: account.address,
        transactionBlock: txInfo,
      });

      const results = response.results;
      if (!results) return { stakeAmount: 0, pendingRewards: 0 };

      // Helper to decode u64 from byte array
      const decodeU64 = (bytes?: number[]) => {
        if (!bytes || bytes.length !== 8) return 0;
        try {
          return Number(bcs.U64.parse(new Uint8Array(bytes)));
        } catch {
          let val = BigInt(0);
          for (let i = 0; i < 8; i++) val += BigInt(bytes[i]) << BigInt(i * 8);
          return Number(val);
        }
      };

      const stakeAmountBytes = results[0]?.returnValues?.[0]?.[0];
      const pendingRewardsBytes = results[1]?.returnValues?.[0]?.[0];

      return {
        stakeAmount: decodeU64(stakeAmountBytes),
        pendingRewards: decodeU64(pendingRewardsBytes),
      };
    },
    enabled: !!account?.address,
    refetchInterval: 10000,
  });
};
