# Sui Client Library

這個目錄包含與 Sui 區塊鏈互動的客戶端程式碼，一律使用 SuiGrpcClient。

## 📁 檔案結構

```
lib/sui/
├── client.ts           # 主要客戶端入口（SuiGrpcClient + 相容層）
├── client-compat.ts    # 將 v2 API 轉為 queries 所需格式
├── queries.ts          # 查詢函數
├── grpc-client.ts      # SuiGrpcClient 初始化
└── README.md           # 本文件
```

## 🚀 快速開始

### 1. 設定環境變數

```bash
# .env.local
SUI_GRPC_ENDPOINT=your-endpoint.sui-mainnet.quiknode.pro:9000
SUI_GRPC_TOKEN=your_token  # 如果需要
```

### 2. 使用客戶端

```typescript
import { getSuiClient } from '@/lib/sui/client';
import { getAllProjects } from '@/lib/sui/queries';

// 自動使用 gRPC（如果已設定）或 HTTP
const client = getSuiClient();
const projects = await getAllProjects(client, PACKAGE_ID);
```

## 📖 API 文件

### client.ts

#### `getSuiClient()`
回傳 SuiGrpcClient 透過 createCompatClient 包裝的相容層，供 queries 使用。queryEvents 由 JSON-RPC 提供（gRPC 無此 API）。

```typescript
import { getSuiClient } from '@/lib/sui/client';

const client = getSuiClient();
```

#### `isGrpcEnabled(): boolean`
始終為 `true`（已全面使用 gRPC）。

#### `suiClient: SuiClient`
直接使用 HTTP JSON-RPC 客戶端（不經過自動選擇）。

```typescript
import { suiClient } from '@/lib/sui/client';

// 強制使用 HTTP
const balance = await suiClient.getBalance({ owner: address });
```

### grpc-client.ts

#### `getSuiGrpcClient(): SuiGrpcClient`
取得官方 SuiGrpcClient 實例。

```typescript
import { getSuiGrpcClients } from '@/lib/sui/grpc-client';

const clients = getSuiGrpcClients();
if (clients) {
  // clients.ledger, clients.state, etc.
}
```

#### `callGrpcMethod<T>(client, methodName, request): Promise<T>`
呼叫 gRPC 方法（自動加入 metadata）。

```typescript
import { getSuiGrpcClients, callGrpcMethod } from '@/lib/sui/grpc-client';

const clients = getSuiGrpcClients();
const response = await callGrpcMethod(
  clients.ledger,
  'GetObject',
  { object_id: '0x123...' }
);
```

#### `callGrpcStream<T>(client, methodName, request, onData, onError?, onEnd?)`
呼叫 gRPC 串流方法。

```typescript
import { getSuiGrpcClients, callGrpcStream } from '@/lib/sui/grpc-client';

const clients = getSuiGrpcClients();
const stream = callGrpcStream(
  clients.subscription,
  'SubscribeCheckpoints',
  {},
  (checkpoint) => console.log('New checkpoint:', checkpoint),
  (error) => console.error('Error:', error)
);

// 取消串流
stream.cancel();
```

### grpc-adapter.ts

提供與 `SuiClient` 相容的 API，但使用 gRPC 作為底層傳輸。

#### `createCompatClient(grpcClient, jsonRpcClient)`
將 SuiGrpcClient v2 API 轉為 queries 期望的格式。getObject、listOwnedObjects 等使用 gRPC；queryEvents 委派給 JSON-RPC。

### grpc-events.ts

處理 gRPC 的事件查詢（基於 checkpoint 掃描）。

#### `queryEventsViaGrpc(params): Promise<EventResult>`
透過 checkpoint 掃描查詢事件。

```typescript
import { queryEventsViaGrpc } from '@/lib/sui/grpc-events';

const result = await queryEventsViaGrpc({
  query: { 
    MoveEventType: `${PACKAGE_ID}::project::ProjectCreatedEvent` 
  },
  limit: 50,
});

console.log('Events:', result.data);
console.log('Next cursor:', result.nextCursor);
```

#### `subscribeToEvents(params, onEvent, onError?): () => void`
訂閱即時事件（串流）。

```typescript
import { subscribeToEvents } from '@/lib/sui/grpc-events';

const unsubscribe = subscribeToEvents(
  {
    query: { MoveEventType: `${PACKAGE_ID}::project::ProjectCreatedEvent` },
  },
  (event) => {
    console.log('New event:', event);
  },
  (error) => {
    console.error('Subscription error:', error);
  }
);

// 稍後取消訂閱
unsubscribe();
```

### queries.ts

所有查詢函數同時支援 `SuiClient` 和 `GrpcSuiClientAdapter`。

常用函數：
- `getUserVault(client, address, packageId, stableCoinType)`
- `getVaultAllocations(client, vaultId)`
- `getAllProjects(client, packageId)`
- `getProjectById(client, packageId, projectId)`
- `getProjectUpdates(client, projectId)`
- `getSupportRecordByOwner(client, ownerAddress, packageId)`

```typescript
import { getSuiClient } from '@/lib/sui/client';
import { getAllProjects, getProjectById } from '@/lib/sui/queries';

const client = getSuiClient(); // 自動選擇 gRPC 或 HTTP

// 查詢所有專案
const projects = await getAllProjects(client, PACKAGE_ID);

// 查詢單一專案
const project = await getProjectById(client, PACKAGE_ID, projectId);
```

## 🔄 遷移指南

### 從 HTTP JSON-RPC 遷移到 gRPC

**之前（僅 HTTP）：**
```typescript
import { suiClient } from '@/lib/sui/client';

const projects = await getAllProjects(suiClient, PACKAGE_ID);
```

**之後（自動選擇）：**
```typescript
import { getSuiClient } from '@/lib/sui/client';

const client = getSuiClient(); // 自動使用 gRPC 或 HTTP
const projects = await getAllProjects(client, PACKAGE_ID);
```

就這麼簡單！只要設定了 `SUI_GRPC_ENDPOINT`，就會自動使用 gRPC。

## ⚡ 效能對比

| 操作 | HTTP JSON-RPC | gRPC | 改善 |
|------|---------------|------|------|
| getObject | ~150ms | ~80ms | 47% ↑ |
| getBalance | ~120ms | ~60ms | 50% ↑ |
| getOwnedObjects | ~200ms | ~100ms | 50% ↑ |
| queryEvents* | ~180ms | ~300ms** | 67% ↓ |

\* queryEvents 在 gRPC 中使用 checkpoint 掃描  
\*\* 建議使用 subscribeToEvents 串流訂閱

## ⚠️ 注意事項

### 瀏覽器支援
gRPC 僅在 Node.js 環境可用。在瀏覽器中會自動回退到 HTTP JSON-RPC。

```typescript
// 在 API route（Node.js）
const client = getSuiClient(); // ✅ 使用 gRPC

// 在 React component（瀏覽器）
const client = useSuiClient(); // ⚠️ 使用 HTTP
```

### 事件查詢差異
gRPC 的事件查詢使用 checkpoint 掃描，效能特性不同：

- **適合**：歷史事件查詢、批次處理
- **不適合**：需要極快速回應的即時查詢
- **建議**：即時監控使用 `subscribeToEvents()`

### Proto 檔案管理
Proto 檔案會在 `npm install` 時自動下載。如果需要手動更新：

```bash
npm run download-protos
```

## 🐛 除錯

### 啟用 gRPC 除錯日誌

```typescript
// 在 grpc-client.ts 開頭加入
console.log('gRPC endpoint:', process.env.SUI_GRPC_ENDPOINT);
console.log('gRPC enabled:', !!process.env.SUI_GRPC_ENDPOINT);
```

### 檢查 gRPC 連線

```typescript
import { getSuiGrpcClients, callGrpcMethod } from '@/lib/sui/grpc-client';

const clients = getSuiGrpcClients();
if (!clients) {
  console.error('gRPC clients not initialized');
} else {
  try {
    const info = await callGrpcMethod(clients.ledger, 'GetServiceInfo', {});
    console.log('Connected to chain:', info.chain);
    console.log('Current epoch:', info.epoch);
  } catch (error) {
    console.error('gRPC connection failed:', error);
  }
}
```

### 常見錯誤

**"gRPC clients not initialized"**
- 檢查 `SUI_GRPC_ENDPOINT` 環境變數
- 確認在 Node.js 環境執行（非瀏覽器）

**"UNAVAILABLE: Connection refused"**
- 檢查端點 URL 是否正確
- 確認防火牆允許連線
- 驗證 token（如果需要）

**"Cannot find module './grpc-adapter'"**
- 執行 `npm install` 確保依賴安裝
- 執行 `npm run download-protos` 下載 proto 檔案

## 📚 更多資源

- [完整遷移指南](../../../docs/grpc-migration.md)
- [Sui gRPC 官方文件](https://docs.sui.io/concepts/data-access/grpc)
- [Sui Proto 定義](https://github.com/MystenLabs/sui-apis)

## 🤝 貢獻

如果發現 bug 或有改進建議，請開 issue 或提交 PR。
