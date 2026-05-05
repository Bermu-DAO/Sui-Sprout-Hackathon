"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { useState } from "react";
import "@mysten/dapp-kit/dist/index.css";
import { WalletErrorBoundary } from '@/components/WalletErrorBoundary';
import { LanguageProvider } from "@/contexts/LanguageContext";

const { networkConfig } = createNetworkConfig({
  testnet: { url: "https://fullnode.testnet.sui.io:443", network: "testnet" as any },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletErrorBoundary>
          <WalletProvider autoConnect={true}>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </WalletProvider>
        </WalletErrorBoundary>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
