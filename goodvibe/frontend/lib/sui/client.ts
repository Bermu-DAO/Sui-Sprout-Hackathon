import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { NETWORKS, SUI_NETWORK } from '@/config/sui';
import { getSuiGrpcClient } from './grpc-client';
import { createCompatClient } from './client-compat';

function getClientUrl() {
  const net = SUI_NETWORK as keyof typeof NETWORKS;
  if (net in NETWORKS && NETWORKS[net]) {
    return (NETWORKS[net] as { url: string }).url;
  }
  return getJsonRpcFullnodeUrl(SUI_NETWORK as 'mainnet' | 'testnet' | 'devnet' | 'localnet');
}

/** HTTP JSON-RPC 客戶端（僅用於 queryEvents，gRPC 不支援） */
export const suiClient = new SuiJsonRpcClient({
  url: getClientUrl(),
  network: SUI_NETWORK as 'mainnet' | 'testnet' | 'devnet' | 'localnet',
});

let compatInstance: ReturnType<typeof createCompatClient> | null = null;

/**
 * 取得 Sui 客戶端（SSR / API routes 用）
 * 一律使用 SuiGrpcClient，透過 createCompatClient 轉為 queries 所需格式
 * queryEvents 由 JSON-RPC 提供（gRPC 無此 API）
 */
export function getSuiClient() {
  if (!compatInstance) {
    compatInstance = createCompatClient(getSuiGrpcClient(), suiClient);
  }
  return compatInstance;
}

/** 僅供相容性：gRPC 已為預設 */
export function isGrpcEnabled(): boolean {
  return true;
}

export default suiClient;
