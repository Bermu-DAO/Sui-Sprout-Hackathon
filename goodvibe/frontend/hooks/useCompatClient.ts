import { useMemo } from 'react';
import { useCurrentClient } from '@mysten/dapp-kit-react';
import { createCompatClient } from '@/lib/sui/client-compat';
import { getSuiClient, suiClient } from '@/lib/sui/client';

/**
 * 取得相容 queries 格式的 client（用於 getProjectById 等）
 * 優先使用 dApp Kit 的 SuiGrpcClient，queryEvents 由 suiClient 提供
 */
export function useCompatClient() {
  const grpcClient = useCurrentClient();
  return useMemo(() => {
    if (grpcClient) {
      return createCompatClient(grpcClient, suiClient);
    }
    return getSuiClient();
  }, [grpcClient]);
}
