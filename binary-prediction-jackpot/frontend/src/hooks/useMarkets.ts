import { useQuery } from "@tanstack/react-query";
import { suiClient } from "../lib/sui";
import { PACKAGE_ID } from "../lib/constants";

export interface EventMarket {
  id: string;
  title: string;
  status: number;
  winning_outcome: number;
  yes_pool: string;
  no_pool: string;
  jackpot_pool: string;
  jackpot_winner: string;
  invoice_count: string;
}

export function useMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      try {
        // Query MarketCreated events
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::event_market::MarketCreated`,
          },
        });

        // Fetch market objects
        const marketIds = events.data.map((event: any) => event.parsedJson.market_id);
        
        const markets = await Promise.all(
          marketIds.map(async (id: string) => {
            const obj = await suiClient.getObject({
              id,
              options: { showContent: true },
            });

            if (obj.data?.content?.dataType === "moveObject") {
              const fields = obj.data.content.fields as any;
              return {
                id,
                title: fields.title,
                status: fields.status,
                winning_outcome: fields.winning_outcome,
                yes_pool: fields.yes_pool,
                no_pool: fields.no_pool,
                jackpot_pool: fields.jackpot_pool,
                jackpot_winner: fields.jackpot_winner,
                invoice_count: fields.invoice_count,
              } as EventMarket;
            }
            return null;
          })
        );

        return markets.filter((m): m is EventMarket => m !== null);
      } catch (error) {
        console.error("Error fetching markets:", error);
        return [];
      }
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}
