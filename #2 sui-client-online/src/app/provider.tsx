'use client';

import type { ReactNode } from 'react';
import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { dAppKit } from './dapp-kit';

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>
		</QueryClientProvider>
	);
}