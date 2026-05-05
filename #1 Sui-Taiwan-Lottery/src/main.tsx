import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import './index.css'
import '@mysten/dapp-kit/dist/index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

function normalizeSuiNetworkName(raw?: string): 'testnet' | 'mainnet' | 'devnet' | 'localnet' {
  const cleaned = (raw ?? 'testnet').trim().toLowerCase()

  if (cleaned === 'testnet' || cleaned === 'mainnet' || cleaned === 'devnet' || cleaned === 'localnet') {
    return cleaned
  }

  if (cleaned === 'sui:testnet' || cleaned === 'sui:mainnet' || cleaned === 'sui:devnet' || cleaned === 'sui:localnet') {
    return cleaned.replace('sui:', '') as 'testnet' | 'mainnet' | 'devnet' | 'localnet'
  }

  return 'testnet'
}

const selectedNetwork = normalizeSuiNetworkName(import.meta.env.VITE_SUI_NETWORK)
const fullnodeUrl = (import.meta.env.VITE_SUI_FULLNODE_URL ?? 'https://fullnode.testnet.sui.io:443').trim()

const networks = {
  [selectedNetwork]: { url: fullnodeUrl },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork={selectedNetwork}>
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </StrictMode>,
)
