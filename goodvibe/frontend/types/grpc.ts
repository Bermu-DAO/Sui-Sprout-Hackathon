/**
 * gRPC 相關的 TypeScript 型別定義
 */

// Sui gRPC 服務型別
export type SuiGrpcServiceType = 
  | 'ledger'
  | 'state'
  | 'transaction'
  | 'subscription'
  | 'movePackage'
  | 'signatureVerification'
  | 'nameService';

// gRPC 設定
export interface GrpcConfig {
  endpoint: string;
  token?: string;
  useSsl?: boolean;
}

// gRPC 請求選項
export interface GrpcCallOptions {
  timeout?: number;
  metadata?: Record<string, string>;
}

// Object 查詢選項（對應 proto FieldMask）
export interface ObjectReadOptions {
  showType?: boolean;
  showOwner?: boolean;
  showPreviousTransaction?: boolean;
  showDisplay?: boolean;
  showContent?: boolean;
  showBcs?: boolean;
  showStorageRebate?: boolean;
}

// 事件過濾器
export interface GrpcEventFilter {
  MoveEventType?: string;
  Transaction?: string;
  MoveModule?: {
    package: string;
    module: string;
  };
  Sender?: string;
  Object?: string;
  TimeRange?: {
    start_time: string;
    end_time: string;
  };
}

// Checkpoint 查詢參數
export interface CheckpointQuery {
  sequence_number?: number;
  digest?: string;
}

// 分頁參數
export interface PaginationParams {
  cursor?: string;
  limit?: number;
  order?: 'ascending' | 'descending';
}

// 通用回應格式
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

// Ledger Service 請求/回應型別
export namespace LedgerServiceTypes {
  export interface GetObjectRequest {
    object_id: string;
    version?: number;
    read_mask?: string[];
  }

  export interface GetTransactionRequest {
    digest: string;
  }

  export interface GetCheckpointRequest {
    checkpoint_id?: string;
    sequence_number?: number;
  }

  export interface GetServiceInfoResponse {
    chain_id?: string;
    chain?: string;
    epoch?: number;
    checkpoint_height?: number;
    timestamp?: string;
    lowest_available_checkpoint?: number;
    lowest_available_checkpoint_objects?: number;
    server?: string;
  }
}

// State Service 請求/回應型別
export namespace StateServiceTypes {
  export interface ListOwnedObjectsRequest {
    owner: string;
    filter?: any;
    cursor?: string;
    limit?: number;
  }

  export interface GetBalanceRequest {
    owner: string;
    coin_type?: string;
  }

  export interface GetBalanceResponse {
    coin_type?: string;
    coin_object_count?: number;
    total_balance?: string;
    locked_balance?: {
      epoch_id?: number;
      number?: string;
    };
  }

  export interface ListBalancesRequest {
    owner: string;
    cursor?: string;
    limit?: number;
  }
}

// Transaction Execution Service 型別
export namespace TransactionExecutionServiceTypes {
  export interface ExecuteTransactionRequest {
    transaction: Uint8Array;
    signatures: Uint8Array[];
    request_type?: 'WAIT_FOR_LOCAL_EXECUTION' | 'WAIT_FOR_EFFECTS_CERT';
  }
}

// Subscription Service 型別
export namespace SubscriptionServiceTypes {
  export interface SubscribeCheckpointsRequest {
    start_sequence_number?: number;
  }

  export interface SubscribeTransactionsRequest {
    filter?: any;
  }
}

// 錯誤型別
export interface GrpcError {
  code: number;
  message: string;
  details?: any;
}

// 串流控制器
export interface StreamController {
  cancel: () => void;
  pause?: () => void;
  resume?: () => void;
}
