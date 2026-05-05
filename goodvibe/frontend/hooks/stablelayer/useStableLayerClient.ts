'use client';

import { useCallback, useRef, useState } from 'react';
import type * as StableLayerSdk from 'stable-layer-sdk';

export type StableLayerClientModule = {
  StableLayerClient: {
    initialize(config: {
      network: 'mainnet' | 'testnet';
      sender: string;
      baseUrl?: string;
      mockFarmRegistryId?: string;
      mockFarmPackageId?: string;
      mockUsdbCoinType?: string;
    }): Promise<StableLayerSdk.StableLayerClient>;
  };
};

const GRPC_URLS: Record<string, string> = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
};

export function useStableLayerClient(
  account: string | null,
  network: 'mainnet' | 'testnet',
) {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const cacheRef = useRef<{
    account: string;
    network: 'mainnet' | 'testnet';
    client: StableLayerSdk.StableLayerClient;
  } | null>(null);

  const getClient = useCallback(async (): Promise<StableLayerSdk.StableLayerClient | null> => {
    if (!account || !network) return null;

    if (
      cacheRef.current &&
      cacheRef.current.account === account &&
      cacheRef.current.network === network
    ) {
      return cacheRef.current.client;
    }

    setIsInitializing(true);
    setInitError(null);
    try {
      const mod = (await import('stable-layer-sdk')) as unknown as StableLayerClientModule;
      const mockFarmRegistryId =
        network === 'testnet'
          ? process.env.NEXT_PUBLIC_MOCK_FARM_REGISTRY_TESTNET?.trim() || undefined
          : undefined;
      const mockUsdbCoinType =
        network === 'testnet'
          ? process.env.NEXT_PUBLIC_MOCK_USDB_TYPE_TESTNET?.trim() || undefined
          : undefined;
      const mockFarmPackageId =
        network === 'testnet'
          ? process.env.NEXT_PUBLIC_MOCK_FARM_PACKAGE_ID?.trim() || undefined
          : undefined;
      const client = await mod.StableLayerClient.initialize({
        network,
        sender: account,
        baseUrl: GRPC_URLS[network] ?? GRPC_URLS.mainnet,
        ...(mockFarmRegistryId ? { mockFarmRegistryId } : {}),
        ...(mockFarmPackageId ? { mockFarmPackageId } : {}),
        ...(mockUsdbCoinType ? { mockUsdbCoinType } : {}),
      });
      cacheRef.current = { account, network, client };
      return client;
    } catch (e) {
      setInitError(e instanceof Error ? e : new Error(String(e)));
      return null;
    } finally {
      setIsInitializing(false);
    }
  }, [account, network]);

  const clearCache = useCallback(() => {
    cacheRef.current = null;
  }, []);

  return { getClient, isInitializing, initError, clearCache };
}
