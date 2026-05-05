"use client";

import { useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, REGISTRY_ID } from "@/lib/constants";

export const useOraclePrice = () => {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["oracle-price"],
    queryFn: async () => {
      try {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::multi_oracle_registry::get_oracle_price`,
          arguments: [
            tx.object(REGISTRY_ID),
            tx.pure.string("OC"),
            tx.pure.string("USD"),
          ],
        });

        const result = await suiClient.devInspectTransactionBlock({
          sender: "0x0000000000000000000000000000000000000000000000000000000000000000",
          transactionBlock: tx,
        });

        if (result.results?.[0]?.returnValues?.[0]) {
          const bytes = result.results[0].returnValues[0][0];
          // Oracle 價格使用 8 decimals (參考 price_oracle.move)
          const priceRaw = new DataView(new Uint8Array(bytes).buffer).getBigUint64(0, true);
          const price = Number(priceRaw) / 1e8;
          return price;
        }
        
        // 如果查詢失敗，返回預設值
        return 2.5;
      } catch (error) {
        console.error("Failed to fetch oracle price:", error);
        return 2.5; // 預設價格
      }
    },
    refetchInterval: 10000, // 每 10 秒更新一次
    staleTime: 5000,
  });
};
