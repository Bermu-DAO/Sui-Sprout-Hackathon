"use client";

// Initialize Buffer polyfill for stable-layer-sdk and pyth-sui-js
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  (globalThis as any).Buffer = Buffer;
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { dAppKit } from '@/config/dapp-kit';
import { useState } from 'react';
import { MockDataProvider } from '@/contexts/MockDataContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <DAppKitProvider dAppKit={dAppKit}>
        <MockDataProvider>{children}</MockDataProvider>
      </DAppKitProvider>
    </QueryClientProvider>
  );
}
