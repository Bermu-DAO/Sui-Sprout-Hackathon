"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { POOL_ID } from "../lib/constants";
import { useQuery } from "@tanstack/react-query";

export const usePoolData = () => {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["poolData", POOL_ID],
    queryFn: async () => {
      const response = await suiClient.getObject({
        id: POOL_ID,
        options: {
          showContent: true,
        },
      });

      const content = response.data?.content as any;
      if (content?.dataType !== "moveObject") {
        throw new Error("Target is not a move object");
      }

      // Read total_staked and reward_balance from Move struct fields
      const fields = content.fields;
      return {
        totalStaked: Number(fields.total_staked) || 0,
        rewardBalance: Number(fields.reward_balance?.fields?.balance || fields.reward_balance || 0),
      };
    },
    refetchInterval: 10000,
  });
};
