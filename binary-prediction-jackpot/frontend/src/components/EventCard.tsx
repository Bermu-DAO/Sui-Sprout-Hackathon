import { EventMarket } from "../hooks/useMarkets";
import { formatSUI } from "../lib/sui";
import { STATUS_OPEN, STATUS_RESOLVED } from "../lib/constants";
import BetButtons from "./BetButtons";

interface EventCardProps {
  market: EventMarket;
}

export default function EventCard({ market }: EventCardProps) {
  const yesPool = parseInt(market.yes_pool || "0");
  const noPool = parseInt(market.no_pool || "0");
  const totalPool = yesPool + noPool;

  const yesPercentage = totalPool > 0 ? (yesPool / totalPool) * 100 : 50;
  const noPercentage = totalPool > 0 ? (noPool / totalPool) * 100 : 50;

  const getStatusBadge = () => {
    if (market.status === STATUS_OPEN) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          🟢 進行中
        </span>
      );
    } else if (market.status === STATUS_RESOLVED) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          ⚪ 已結算
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex-1">
            {market.title}
          </h3>
          {getStatusBadge()}
        </div>

        {/* Pool Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
          <div>
            <span className="font-medium">Total Pool:</span>{" "}
            <span className="text-gray-900 font-semibold">
              {formatSUI(totalPool)} SUI
            </span>
          </div>
          <div>
            <span className="font-medium">Jackpot:</span>{" "}
            <span className="text-yellow-600 font-semibold">
              {formatSUI(market.jackpot_pool)} SUI
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blue-600">
              YES {yesPercentage.toFixed(1)}%
            </span>
            <span className="font-medium text-red-600">
              NO {noPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${yesPercentage}%` }}
            />
            <div
              className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-500 to-red-600 transition-all duration-500"
              style={{ width: `${noPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatSUI(yesPool)} SUI</span>
            <span>{formatSUI(noPool)} SUI</span>
          </div>
        </div>
      </div>

      {/* Bet Buttons */}
      {market.status === STATUS_OPEN && (
        <div className="p-6 bg-gray-50">
          <BetButtons marketId={market.id} />
        </div>
      )}
    </div>
  );
}
