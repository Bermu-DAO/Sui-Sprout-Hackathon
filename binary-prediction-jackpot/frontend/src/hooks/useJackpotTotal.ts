import { useMarkets } from "./useMarkets";

export function useJackpotTotal() {
  const { data: markets, isLoading } = useMarkets();

  const total = markets?.reduce((sum, market) => {
    return sum + parseInt(market.jackpot_pool || "0");
  }, 0) || 0;

  return {
    total,
    isLoading,
  };
}
