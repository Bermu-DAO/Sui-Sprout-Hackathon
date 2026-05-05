import { useState } from "react";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { buildPlaceBetTx } from "../lib/transactions";
import { OUTCOME_YES, OUTCOME_NO } from "../lib/constants";

interface BetButtonsProps {
  marketId: string;
}

export default function BetButtons({ marketId }: BetButtonsProps) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [amount, setAmount] = useState("1");
  const [isLoading, setIsLoading] = useState(false);

  const handleBet = (outcome: typeof OUTCOME_YES | typeof OUTCOME_NO) => {
    if (!account) {
      alert("Please connect your wallet first");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    const tx = buildPlaceBetTx(marketId, amountNum, outcome);

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: () => {
          alert("Bet placed successfully! You received an invoice.");
          setAmount("1");
          setIsLoading(false);
        },
        onError: (error) => {
          console.error("Error placing bet:", error);
          alert("Failed to place bet. Please try again.");
          setIsLoading(false);
        },
      }
    );
  };

  if (!account) {
    return (
      <div className="text-center py-4 text-gray-500">
        Please connect your wallet to place bets
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bet Amount (SUI)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0.1"
          step="0.1"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter amount"
          disabled={isLoading}
        />
      </div>

      {/* Bet Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleBet(OUTCOME_YES)}
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {isLoading ? "Processing..." : "買入 YES"}
        </button>

        <button
          onClick={() => handleBet(OUTCOME_NO)}
          disabled={isLoading}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {isLoading ? "Processing..." : "買入 NO"}
        </button>
      </div>
    </div>
  );
}
