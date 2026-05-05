/**
 * Sui gRPC 客戶端
 * 優先使用官方 gRPC (fullnode.mainnet.sui.io)，Surflux 作為備援
 */
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport';

const OFFICIAL_GRPC_URL = 'https://fullnode.mainnet.sui.io:443';

function getSurfluxEndpoint(): string {
  if (typeof window !== 'undefined') return '';
  const endpoint = process.env.SUI_GRPC_ENDPOINT || '';
  if (!endpoint) return '';
  if (endpoint.includes(':443')) return `https://${endpoint.replace(':443', '')}`;
  if (endpoint.startsWith('https://')) return endpoint;
  return endpoint ? `https://${endpoint}` : '';
}

function getSurfluxApiKey(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.SUI_GRPC_TOKEN || '';
}

let primaryClient: SuiGrpcClient | null = null;
let fallbackClient: SuiGrpcClient | null = null;

function getPrimaryGrpcClient(): SuiGrpcClient {
  if (!primaryClient) {
    primaryClient = new SuiGrpcClient({
      network: 'mainnet',
      baseUrl: OFFICIAL_GRPC_URL,
    });
  }
  return primaryClient;
}

function getFallbackGrpcClient(): SuiGrpcClient | null {
  const baseUrl = getSurfluxEndpoint();
  const apiKey = getSurfluxApiKey();
  if (!baseUrl || !apiKey) return null;

  if (!fallbackClient) {
    const fetchWithApiKey = (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set('x-api-key', apiKey);
      return fetch(input, { ...init, headers });
    };
    fallbackClient = new SuiGrpcClient({
      network: 'mainnet',
      transport: new GrpcWebFetchTransport({ baseUrl, fetch: fetchWithApiKey }),
    });
  }
  return fallbackClient;
}

/**
 * 取得 Sui gRPC 客戶端（主要用官方，備援用 Surflux）
 */
export function getSuiGrpcClient(): SuiGrpcClient {
  return getPrimaryGrpcClient();
}

/**
 * 取得備援 gRPC 客戶端（Surflux，需設定 SUI_GRPC_ENDPOINT 與 SUI_GRPC_TOKEN）
 */
export function getSurfluxGrpcClient(): SuiGrpcClient | null {
  return getFallbackGrpcClient();
}

/**
 * 是否已設定 Surflux 備援
 */
export function isSurfluxConfigured(): boolean {
  return !!(getSurfluxEndpoint() && getSurfluxApiKey());
}
