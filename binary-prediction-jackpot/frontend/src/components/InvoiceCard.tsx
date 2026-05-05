import { useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Invoice } from "../hooks/useMyInvoices";
import { EventMarket } from "../hooks/useMarkets";
import { formatSUI } from "../lib/sui";
import { buildClaimWinningsTx, buildClaimJackpotTx } from "../lib/transactions";
import { OUTCOME_YES, OUTCOME_NO, STATUS_RESOLVED } from "../lib/constants";
import { Trophy, Ticket } from "lucide-react";

interface InvoiceCardProps {
  invoice: Invoice;
  market?: EventMarket;
}

export default function InvoiceCard({ invoice, market }: InvoiceCardProps) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [isLoading, setIsLoading] = useState(false);

  const isJackpotWinner =
    market && parseInt(invoice.invoice_number) === parseInt(market.jackpot_winner);
  const isResolved = market && market.status === STATUS_RESOLVED;
  const outcomeText = invoice.outcome === OUTCOME_YES ? "YES" : "NO";
  const outcomeColor = invoice.outcome === OUTCOME_YES ? "text-blue-600" : "text-red-600";

  const handleClaimWinnings = () => {
    if (!market) return;

    setIsLoading(true);
    const tx = buildClaimWinningsTx(market.id, invoice.id);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          alert("Winnings claimed successfully!");
          setIsLoading(false);
        },
        onError: (error) => {
          console.error("Error claiming winnings:", error);
          alert("Failed to claim winnings. You may not be a winner.");
          setIsLoading(false);
        },
      }
    );
  };

  const handleClaimJackpot = () => {
    if (!market) return;

    setIsLoading(true);
    const tx = buildClaimJackpotTx(market.id, invoice.id);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          alert("🎉 Jackpot claimed successfully!");
          setIsLoading(false);
        },
        onError: (error) => {
          console.error("Error claiming jackpot:", error);
          alert("Failed to claim jackpot.");
          setIsLoading(false);
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      {/* Jackpot Winner Badge */}
      {isJackpotWinner && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg flex items-center space-x-2">
          <Trophy className="w-6 h-6 text-white" />
          <span className="text-white font-bold">🎉 恭喜中獎 Jackpot!</span>
        </div>
      )}

      {/* Invoice Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Ticket className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">Invoice #</span>
          </div>
          <span className="font-mono font-semibold text-gray-900">
            {invoice.invoice_number}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Market</span>
          <span className="text-sm text-gray-900 truncate max-w-xs">
            {market?.title || "Unknown"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Bet</span>
          <span className={`font-semibold ${outcomeColor}`}>{outcomeText}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Amount</span>
          <span className="font-semibold text-gray-900">
            {formatSUI(invoice.amount)} SUI
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Timestamp</span>
          <span className="text-xs text-gray-500">
            {new Date(parseInt(invoice.timestamp)).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {isResolved && (
        <div className="mt-4 space-y-2">
          {isJackpotWinner && (
            <button
              onClick={handleClaimJackpot}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isLoading ? "Processing..." : "🏆 領取 Jackpot"}
            </button>
          )}

          <button
            onClick={handleClaimWinnings}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "一鍵贖回"}
          </button>
        </div>
      )}
    </div>
  );
}
