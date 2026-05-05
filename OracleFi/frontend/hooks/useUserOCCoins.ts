"use client";

import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { COIN_TYPE } from "../lib/constants";
import { useQuery } from "@tanstack/react-query";

export const useUserOCCoins = () => {
  const suiClient = useSuiClient();
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ["userOCCoins", account?.address],
    queryFn: async () => {
      if (!account?.address) return { coins: [], totalBalance: 0 };
      
      const response = await suiClient.getCoins({
        owner: account.address,
        coinType: COIN_TYPE,
      });

      const coins = response.data;
      const totalBalance = coins.reduce((acc, coin) => acc + Number(coin.balance), 0);
      
      return { 
        coins, 
        totalBalance,
        allCoins: coins,
      };
    },
    enabled: !!account?.address,
    refetchInterval: 10000,
  });
};
