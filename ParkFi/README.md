# Parking RWA on Sui

這是一個基於 Sui 網絡構建的停車位 RWA (Real World Asset) 專案。本專案利用 Sui SDK 與 dApp Kit 進行開發。

## 🎯 專案簡介

這是一個將實體停車格資產化（RWA）的系統，讓用戶可以購買停車格 NFT 並獲得停車費收益分潤。

### 核心特性

- **資產所有權明確**: 使用 Move 的物件模型，每個停車格都是獨立的 NFT
- **收益自動分配**: 智能合約自動執行分潤（營運商 80% / 持有者 20%）
- **二級市場流通**: 持有者可以自由設定售價，支持 NFT 買賣轉讓
- **權限控制嚴格**: 只有營運商可以鑄造停車格，只有持有者可以設定價格或轉讓

## 👥 角色定義

### 1. Operator（營運商）
- **職責**: 擁有停車場，鑄造並出售停車格 NFT
- **收益**:
  - 出售停車格 NFT 的收入（一次性）
  - 每筆停車費的 80% 分潤（持續收益）

### 2. 車位持有者（投資者）
- **職責**: 購買停車格 NFT 成為資產持有者
- **收益**: 每筆停車費的 20% 分潤（被動收益）
- **權利**: 可以轉售或贈與停車格 NFT

### 3. 駕駛人（用戶）
- **職責**: 使用停車格並支付停車費
- **費用**: 根據停車時數支付費用

## 📊 業務流程

### 第一階段：初始化與銷售

1. **Operator 創建停車場**
   - 調用 `create_lot()` 創建停車場
   - 設定分潤比例（80% 營運商 / 20% 持有者）

2. **Operator 鑄造停車格 NFT**
   - 調用 `mint_space(lot, "A1", 1 SUI/hr, 10 SUI)`
   - 設定停車費率和售價

3. **投資者購買停車格**
   - 調用 `purchase_space(space_A1)`
   - 支付購買價格（如 10 SUI）
   - 獲得停車格 NFT 所有權

### 第二階段：營運與收益

4. **駕駛人支付停車費**
   - 調用 `pay_for_parking(lot, space_A1, 2)` 停車 2 小時
   - 支付停車費（如 2 SUI）
   - 自動分潤：
     - 80% (1.6 SUI) → Operator
     - 20% (0.4 SUI) → 停車格持有者

### 第三階段：二級市場交易（可選）

5. **持有者出售停車格**
   - 調用 `set_price(space_A1, 15 SUI)` 設定售價
   - 新買家購買後獲得所有權
   - 新買家開始獲得 20% 停車費分潤

## 💰 收益分析示例

### 場景：停車格 A1

**初始設定**:
- 售價: 10 SUI
- 每小時停車費: 1 SUI
- 分潤比例: Operator 80% / 持有者 20%

### 投資者收益

| 階段 | 收入/支出 | 金額 | 累計收益 |
|------|----------|------|---------:|
| 購買階段 | 購買停車格 | -10 SUI | -10 SUI |
| 第 1 次停車 | 停 2 小時（20%） | +0.4 SUI | -9.6 SUI |
| 第 2 次停車 | 停 3 小時（20%） | +0.6 SUI | -9 SUI |
| 第 10 次停車 | 累計約停 25 小時 | +5 SUI | **回本** |
| 持續營運 | 持續獲得 20% 分潤 | ... | 持續獲利 |

**回本週期**: 約需累計停車 50 小時（假設每小時 1 SUI）

## 🔐 安全保障

- ✅ 營運商權限控制（mint_space）
- ✅ 持有者權限驗證（set_price, transfer_space）
- ✅ 支付金額驗證（pay_for_parking, purchase_space）
- ✅ 所有權轉移原子性（不可能出現雙重支付）
- ✅ 事件記錄完整（所有操作可追溯）

## 環境需求

- **Node.js**: 建議使用 v18 或更高版本。
- **套件管理器**: npm, yarn 或 pnpm。
- **Sui CLI**: 用於部署合約，安裝說明請參考 [Sui 官方文件](https://docs.sui.io/guides/developer/getting-started/sui-install)。

## 安裝說明

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd parking-rwa-on-iota
   ```

2. **安裝前端依賴**
   ```bash
   cd frontend && npm install
   ```

## 合約部署

1. **切換至 Sui Testnet**
   ```bash
   sui client switch --env testnet
   ```

2. **發布合約，取得 `PACKAGE_ID`**
   ```bash
   cd move
   sui client publish --gas-budget 100000000
   ```
   從輸出的 `Published Objects` 中複製 `packageId`。

3. **建立停車場，取得 `LOT_ID`**
   ```bash
   sui client call \
     --package <PACKAGE_ID> \
     --module parking_rwa \
     --function create_lot \
     --gas-budget 10000000
   ```
   從輸出的 `Created Objects` 中複製 `ParkingLot` 的 Object ID。

4. **更新前端常數**

   將上述兩個 ID 填入 `frontend/src/constants/ids.ts`：
   ```ts
   export const PACKAGE_ID = "0x...";
   export const LOT_ID = "0x...";
   ```

## 環境變數設定

在 `frontend/` 目錄下建立 `.env.local`：

```bash
VITE_SUI_NETWORK=testnet
```

根據 `.gitignore` 的設定，支援以下環境變數文件：
- `.env` (預設)
- `.env.local`
- `.env.development.local`
- `.env.test.local`
- `.env.production.local`

## 操作說明

- **啟動開發伺服器**：
  ```bash
  cd frontend && npm run dev
  ```

- **建置生產版本**：
  ```bash
  cd frontend && npm run build
  ```

## 技術棧

- **@mysten/sui**: Sui 核心 SDK，用於與節點互動及建構交易。
- **@mysten/dapp-kit**: 用於構建 dApp 前端並整合 Sui 錢包功能。
- **Move (Sui)**: 智能合約語言，合約部署於 Sui Testnet。
