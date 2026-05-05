import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ParkingApp from "./components/ParkingApp";
import "@mysten/dapp-kit/dist/index.css";

const queryClient = new QueryClient();
const network = (import.meta.env.VITE_SUI_NETWORK as "testnet" | "mainnet" | "devnet") || "testnet";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={{ [network]: { url: getFullnodeUrl(network) } }} defaultNetwork={network}>
        <WalletProvider autoConnect>
          <ParkingApp />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
