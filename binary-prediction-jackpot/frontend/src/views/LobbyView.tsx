import { useMarkets } from "../hooks/useMarkets";
import { useJackpotTotal } from "../hooks/useJackpotTotal";
import EventCard from "../components/EventCard";
import { formatSUI } from "../lib/sui";
import { Loader2, Trophy } from "lucide-react";

export default function LobbyView() {
  const { data: markets, isLoading: marketsLoading } = useMarkets();
  const { total: jackpotTotal, isLoading: jackpotLoading } = useJackpotTotal();

  if (marketsLoading || jackpotLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Jackpot Total Banner */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl shadow-xl p-8 text-center">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <Trophy className="w-10 h-10 text-white" />
          <h1 className="text-4xl font-bold text-white">🎰 Jackpot 總獎金</h1>
        </div>
        <p className="text-6xl font-extrabold text-white mt-4">
          {formatSUI(jackpotTotal)} SUI
        </p>
        <p className="text-white text-lg mt-2 opacity-90">
          猜錯也有機會抱走大獎！
        </p>
      </div>

      {/* Markets Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          預測市場
        </h2>

        {!markets || markets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-md">
            <p className="text-gray-500 text-lg">
              No markets available yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => (
              <EventCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
