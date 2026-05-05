import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { buildCreateMarketTx, buildResolveAndDrawTx } from "../lib/transactions";
import { OUTCOME_YES, OUTCOME_NO, OUTCOME_INVALID, STATUS_OPEN } from "../lib/constants";
import { EventMarket } from "../hooks/useMarkets";
import { PlusCircle, Gavel } from "lucide-react";

interface AdminPanelProps {
  markets: EventMarket[];
}

export default function AdminPanel({ markets }: AdminPanelProps) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateMarket = () => {
    if (!title.trim()) {
      alert("Please enter a market title");
      return;
    }

    setIsLoading(true);
    const tx = buildCreateMarketTx(title);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          alert("Market created successfully!");
          setTitle("");
          setIsLoading(false);
        },
        onError: (error) => {
          console.error("Error creating market:", error);
          alert("Failed to create market. Make sure you have AdminCap.");
          setIsLoading(false);
        },
      }
    );
  };

  const handleResolve = (marketId: string, outcome: number) => {
    if (!confirm(`Are you sure you want to resolve this market with outcome ${outcome}?`)) {
      return;
    }

    setIsLoading(true);
    const tx = buildResolveAndDrawTx(marketId, outcome);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          alert("Market resolved and jackpot drawn successfully!");
          setIsLoading(false);
        },
        onError: (error) => {
          console.error("Error resolving market:", error);
          alert("Failed to resolve market.");
          setIsLoading(false);
        },
      }
    );
  };

  const openMarkets = markets.filter((m) => m.status === STATUS_OPEN);

  return (
    <div className="space-y-8">
      {/* Create Market Form */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <PlusCircle className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">建立事件</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Market Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例如：SUI 會在週五突破 $2 嗎？"
              disabled={isLoading}
            />
          </div>

          <button
            onClick={handleCreateMarket}
            disabled={isLoading || !title.trim()}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "一鍵發布新市場"}
          </button>
        </div>
      </div>

      {/* Resolution Console */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Gavel className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">裁決控制台</h2>
        </div>

        {openMarkets.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No open markets to resolve
          </p>
        ) : (
          <div className="space-y-4">
            {openMarkets.map((market) => (
              <div
                key={market.id}
                className="p-4 border border-gray-200 rounded-lg space-y-3"
              >
                <h3 className="font-semibold text-gray-900">{market.title}</h3>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleResolve(market.id, OUTCOME_YES)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    裁決 YES
                  </button>

                  <button
                    onClick={() => handleResolve(market.id, OUTCOME_NO)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    裁決 NO
                  </button>

                  <button
                    onClick={() => handleResolve(market.id, OUTCOME_INVALID)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    INVALID 退款
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
