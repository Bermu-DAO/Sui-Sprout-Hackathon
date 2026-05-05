'use client';

import { createDAppKit } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const GRPC_URLS = {
	localnet: 'http://127.0.0.1:9000',
	testnet: 'https://fullnode.testnet.sui.io:443',
	mainnet: 'https://fullnode.mainnet.sui.io:443',
} as const;

type NetworkName = keyof typeof GRPC_URLS;

export const dAppKit = createDAppKit({
	networks: Object.keys(GRPC_URLS) as NetworkName[],
	createClient: (network) =>
		new SuiGrpcClient({
			network,
			baseUrl: GRPC_URLS[network],
		}),
	defaultNetwork: 'testnet',
	slushWalletConfig: null,
});

declare module '@mysten/dapp-kit-react' {
	interface Register {
		dAppKit: typeof dAppKit;
	}
}
