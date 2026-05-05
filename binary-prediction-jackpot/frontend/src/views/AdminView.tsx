import { useCurrentAccount } from "@mysten/dapp-kit";
import { useMarkets } from "../hooks/useMarkets";
import AdminPanel from "../components/AdminPanel";
import { Shield, Loader2 } from "lucide-react";

// Note: In production, you should check if the connected address owns the AdminCap
// For now, we'll show the admin panel to everyone for demo purposes
export default function AdminView() {
  const account = useCurrentAccount();
  const { data: markets, isLoading } = useMarkets();

  if (!account) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-md">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">
          Please connect your wallet to access admin panel
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Shield className="w-8 h-8 text-purple-600" />
        <h1 className="text-3xl font-bold text-gray-900">管理員面板</h1>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ Note: Admin functions require AdminCap ownership. Make sure you have
          deployed the contract and own the AdminCap object.
        </p>
      </div>

      <AdminPanel markets={markets || []} />
    </div>
  );
}
