# Sui Jackpot Market (MVP)

一個部署在 Sui 區塊鏈上的二元預測市場，融合「輸家大樂透 (Lossless Lottery)」機制。

## 功能特色

- 🎯 二元預測市場（YES/NO）
- 🎰 輸家大樂透機制（5% 手續費進入 Jackpot 池）
- 🎫 自動發票系統（每次下注獲得抽獎號碼）
- 🏆 隨機抽獎（使用 Sui Random）
- 💰 公平分潤（贏家按比例分配主池）
- 🎨 Polymarket 專業視覺設計

## 技術棧

### 智能合約
- Sui Move
- sui::random（官方隨機數）
- sui::clock（時間戳）

### 前端
- React + Vite
- TypeScript
- Tailwind CSS
- @mysten/dapp-kit
- @mysten/sui

## 快速開始

### 1. 編譯合約

```bash
cd binary-prediction-jackpot
sui move build
```

### 2. 部署合約

```bash
sui client publish --gas-budget 100000000
```

記錄輸出的：
- Package ID
- AdminCap Object ID

### 3. 更新前端配置

編輯 `frontend/src/lib/constants.ts`：

```typescript
export const PACKAGE_ID = "YOUR_PACKAGE_ID";
export const ADMIN_CAP_ID = "YOUR_ADMIN_CAP_ID";
```

### 4. 啟動前端

```bash
cd frontend
npm install
npm run dev
```

訪問 http://localhost:5173

## 使用流程

### 用戶流程

1. **連接錢包** - 點擊右上角 "Connect Wallet"
2. **領取測試幣** - 點擊 "Faucet" 按鈕領取測試 SUI
3. **選擇市場** - 在 Lobby 查看所有預測事件
4. **下注** - 選擇 YES 或 NO，輸入金額，點擊下注
5. **獲得發票** - 自動獲得一張帶有抽獎號碼的發票
6. **查看持倉** - 切換到 Portfolio 查看所有發票
7. **等待結算** - Admin 裁決結果後自動開獎
8. **領取獎勵** - 點擊「一鍵贖回」領取贏家分潤或 Jackpot

### Admin 流程

1. **連接 Admin 錢包** - 使用持有 AdminCap 的地址
2. **建立事件** - 在 Admin 面板輸入標題，點擊「一鍵發布新市場」
3. **裁決結果** - 事件結束後，選擇 YES/NO/INVALID
4. **自動開獎** - 系統自動從輸家中抽出 Jackpot 贏家

## 資金分配

- **95%** → 主池（yes_pool 或 no_pool）
- **5%** → Jackpot 池

## 合約接口

### 用戶函式

- `place_bet(market, coin, outcome, clock)` - 下注
- `claim_winnings(market, invoice)` - 領取贏家獎勵
- `claim_jackpot(market, invoice)` - 領取 Jackpot

### Admin 函式

- `create_market(admin_cap, title)` - 建立市場
- `resolve_and_draw(admin_cap, market, outcome, random, clock)` - 裁決與開獎

### 查詢函式

- `get_title(market)` - 獲取標題
- `get_status(market)` - 獲取狀態
- `get_yes_pool(market)` - 獲取 YES 池
- `get_no_pool(market)` - 獲取 NO 池
- `get_jackpot_pool(market)` - 獲取 Jackpot 池
- `get_jackpot_winner(market)` - 獲取中獎號碼

## Demo 腳本

### 事前準備
1. 部署合約至測試網
2. Admin 創建事件："SUI 會在週五突破 $2 嗎？"

### 評審體驗
1. 進入網頁
2. 點擊 Faucet 領取測試 SUI
3. 點擊「買入 YES」
4. 錢包簽名確認
5. 提示「下注成功，您已獲得預測發票」

### 高潮展示
1. Admin 點擊「裁決 NO」
2. 系統自動開獎
3. 評審切換至「我的持倉」
4. 發現雖然猜錯，但發票號碼幸運抽中 Jackpot
5. 點擊贖回抱走大獎 🎉

## 開發

### 測試合約

```bash
sui move test
```

### 前端開發

```bash
cd frontend
npm run dev
```

### 構建前端

```bash
cd frontend
npm run build
```

## 部署

### Vercel 部署

1. 推送代碼到 GitHub
2. 連接 Vercel
3. 設置構建命令：`cd frontend && npm run build`
4. 設置輸出目錄：`frontend/dist`

## 授權

MIT License
