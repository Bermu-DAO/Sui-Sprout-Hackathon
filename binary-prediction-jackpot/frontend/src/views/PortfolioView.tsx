import { useMyInvoices } from "../hooks/useMyInvoices";
import { useMarkets } from "../hooks/useMarkets";
import { useCurrentAccount } from "@mysten/dapp-kit";
import InvoiceCard from "../components/InvoiceCard";
import { Loader2, Wallet } from "lucide-react";

export default function PortfolioView() {
  const account = useCurrentAccount();
  const { data: invoices, isLoading: invoicesLoading } = useMyInvoices();
  const { data: markets, isLoading: marketsLoading } = useMarkets();

  if (!account) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-md">
        <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">
          Please connect your wallet to view your portfolio
        </p>
      </div>
    );
  }

  if (invoicesLoading || marketsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Create a map of market ID to market for quick lookup
  const marketMap = new Map(markets?.map((m) => [m.id, m]) || []);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Wallet className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-900">我的持倉</h1>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-md">
          <p className="text-gray-500 text-lg">
            You don't have any invoices yet. Place a bet to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              market={marketMap.get(invoice.event_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
