import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import Navbar from "./components/Navbar";
import LobbyView from "./views/LobbyView";
import PortfolioView from "./views/PortfolioView";
import AdminView from "./views/AdminView";
import "@mysten/dapp-kit/dist/index.css";
import "./App.css";

// Configure network
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
});

const queryClient = new QueryClient();

type View = "lobby" | "portfolio" | "admin";

function App() {
  const [currentView, setCurrentView] = useState<View>("lobby");

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <div className="min-h-screen bg-gray-50">
            <Navbar currentView={currentView} onViewChange={setCurrentView} />
            
            <main className="container mx-auto px-4 py-8">
              {currentView === "lobby" && <LobbyView />}
              {currentView === "portfolio" && <PortfolioView />}
              {currentView === "admin" && <AdminView />}
            </main>
          </div>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
