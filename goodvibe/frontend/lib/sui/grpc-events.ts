/**
 * gRPC 事件查詢實作 - Surflux gRPC-Web
 * 
 * 在 Sui gRPC 中，事件查詢的方式與 JSON-RPC 不同：
 * - JSON-RPC: 直接查詢事件 (queryEvents)
 * - gRPC: 透過 checkpoint 掃描取得事件
 * 
 * 這個檔案實作了基於 checkpoint 的事件掃描機制
 */

import { getSuiGrpcClient } from './grpc-client';

export interface EventFilter {
  MoveEventType?: string;
  Transaction?: string;
  MoveModule?: { package: string; module: string };
  Sender?: string;
  Object?: string;
}

export interface QueryEventsParams {
  query: EventFilter;
  cursor?: string;
  limit?: number;
  order?: 'ascending' | 'descending';
}

export interface EventResult {
  data: any[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

/**
 * 透過 gRPC 查詢事件（使用 Surflux gRPC-Web）
 * 使用 checkpoint 掃描方式
 */
export async function queryEventsViaGrpc(params: QueryEventsParams): Promise<EventResult> {
  const grpcClient = getSuiGrpcClient();
  
  if (!grpcClient) {
    throw new Error('gRPC client not initialized');
  }

  // 策略：從最新的 checkpoint 往回掃描，尋找符合條件的事件
  const limit = params.limit || 50;
  const events: any[] = [];
  
  try {
    // 取得服務資訊以獲取當前 checkpoint
    const { response: serviceInfo } = await grpcClient.ledgerService.getServiceInfo({});
    const currentCheckpoint = Number(serviceInfo.checkpointHeight ?? 0);
    
    // 從當前 checkpoint 往回掃描
    // 注意：這是簡化版本，實際使用時可能需要更複雜的邏輯
    const checkpointsToScan = 100; // 掃描最近 100 個 checkpoints
    const startCheckpoint = Math.max(0, currentCheckpoint - checkpointsToScan);

    for (let i = currentCheckpoint; i >= startCheckpoint && events.length < limit; i--) {
      try {
        const { response: checkpointResp } = await grpcClient.ledgerService.getCheckpoint({
          checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(i) },
        });
        const checkpointData = checkpointResp.checkpoint;

        // 從 checkpoint 中提取事件
        if (checkpointData?.transactions) {
          for (const tx of checkpointData.transactions) {
            // 取得完整的交易資料（包含事件）
            if (tx.digest) {
              try {
                const { response: txDetail } = await grpcClient.ledgerService.getTransaction({
                  digest: tx.digest,
                });
                const txEvents = txDetail.transaction?.events?.events ?? [];

                // 過濾符合條件的事件
                if (txEvents.length > 0) {
                  const filteredEvents = filterEvents(txEvents, params.query);
                  events.push(...filteredEvents);
                }
              } catch (txError) {
                // 個別交易錯誤不影響整體掃描
                console.warn(`Failed to get transaction ${tx.digest}:`, txError);
              }
            }
          }
        }
      } catch (checkpointError) {
        console.warn(`Failed to get checkpoint ${i}:`, checkpointError);
      }
    }

    return {
      data: events.slice(0, limit),
      nextCursor: events.length >= limit ? String(startCheckpoint) : null,
      hasNextPage: events.length >= limit,
    };
    
  } catch (error) {
    console.error('Error querying events via gRPC:', error);
    throw error;
  }
}

/**
 * 過濾事件
 */
function filterEvents(events: any[], filter: EventFilter): any[] {
  if (!events || events.length === 0) {
    return [];
  }

  return events.filter((event) => {
    // 檢查 MoveEventType
    if (filter.MoveEventType) {
      if (event.type !== filter.MoveEventType) {
        return false;
      }
    }

    // 檢查 MoveModule
    if (filter.MoveModule) {
      const eventType = event.type || '';
      const expectedModule = `${filter.MoveModule.package}::${filter.MoveModule.module}`;
      if (!eventType.startsWith(expectedModule)) {
        return false;
      }
    }

    // 檢查 Sender
    if (filter.Sender) {
      if (event.sender !== filter.Sender) {
        return false;
      }
    }

    // 檢查 Object
    if (filter.Object) {
      // 這個過濾條件需要檢查事件中涉及的物件
      // 實作取決於具體的事件結構
    }

    return true;
  });
}

/**
 * 使用串流方式監聽新事件（使用 Surflux gRPC-Web）
 * 適合即時監控場景
 * 
 * 注意：Surflux 可能不支援串流訂閱，需要使用輪詢作為替代方案
 */
export function subscribeToEvents(
  params: QueryEventsParams,
  onEvent: (event: any) => void,
  onError?: (error: Error) => void
): () => void {
  const grpcClient = getSuiGrpcClient();
  
  if (!grpcClient) {
    throw new Error('gRPC client not initialized');
  }

  // 使用輪詢作為串流的替代方案
  // 每 5 秒檢查一次新事件
  let lastCheckpoint = 0;
  let isActive = true;

  const poll = async () => {
    if (!isActive) return;

    try {
      const { response: serviceInfo } = await grpcClient.ledgerService.getServiceInfo({});
      const currentCheckpoint = Number(serviceInfo.checkpointHeight ?? 0);

      // 如果有新的 checkpoint
      if (currentCheckpoint > lastCheckpoint) {
        // 掃描新的 checkpoints
        for (let i = lastCheckpoint + 1; i <= currentCheckpoint && isActive; i++) {
          try {
            const { response: checkpointResp } = await grpcClient.ledgerService.getCheckpoint({
              checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(i) },
            });
            const checkpointData = checkpointResp.checkpoint;

            // 從 checkpoint 中提取事件
            if (checkpointData?.transactions) {
              for (const tx of checkpointData.transactions) {
                if (tx.digest) {
                  try {
                    const { response: txDetail } = await grpcClient.ledgerService.getTransaction({
                      digest: tx.digest,
                    });
                    const txEvents = txDetail.transaction?.events?.events ?? [];

                    if (txEvents.length > 0) {
                      const filteredEvents = filterEvents(txEvents, params.query);
                      filteredEvents.forEach(onEvent);
                    }
                  } catch (txError) {
                    console.warn(`Failed to get transaction ${tx.digest}:`, txError);
                  }
                }
              }
            }
          } catch (checkpointError) {
            console.warn(`Failed to get checkpoint ${i}:`, checkpointError);
          }
        }

        lastCheckpoint = currentCheckpoint;
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    }

    // 5 秒後再次輪詢
    if (isActive) {
      setTimeout(poll, 5000);
    }
  };

  // 開始輪詢
  poll();

  // 回傳取消訂閱的函數
  return () => {
    isActive = false;
  };
}
