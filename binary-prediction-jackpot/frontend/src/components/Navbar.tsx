import { ConnectButton } from "@mysten/dapp-kit";
import { Coins, LayoutDashboard, Wallet, Settings } from "lucide-react";

interface NavbarProps {
  currentView: "lobby" | "portfolio" | "admin";
  onViewChange: (view: "lobby" | "portfolio" | "admin") => void;
}

export default function Navbar({ currentView, onViewChange }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Coins className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">
              Sui Jackpot Market
            </span>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onViewChange("lobby")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === "lobby"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Lobby</span>
            </button>

            <button
              onClick={() => onViewChange("portfolio")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === "portfolio"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Wallet className="w-5 h-5" />
              <span>Portfolio</span>
            </button>

            <button
              onClick={() => onViewChange("admin")}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                currentView === "admin"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Admin</span>
            </button>

            {/* Faucet Button */}
            <a
              href="https://faucet.testnet.sui.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Faucet
            </a>

            {/* Wallet Connect */}
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
