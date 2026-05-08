# GoodVibe

## Description

建立在 Sui 與 Stable Layer 上的公益募資平台。存入 USDC、鑄造心儀項目的品牌穩定幣,等於用穩定幣的「收益」支持公益——本金完全不動,資產始終留在你自己的錢包,流動性也不會被鎖死。項目方可隨時 claim 累積收益、發布進度更新,也能匯出捐贈者名單做後續追蹤或延伸空投。讓「不勉強自己,也能長期支持公益」成為一件可以日常做的事。

基於 Stable Layer 的 DeFi 公益募資平台。專案方可發行自己的品牌穩定幣，支持者持有該穩定幣（資產留在自己錢包），透過「支持」登記要贊助的項目與金額，存款收益自動作為公益捐贈，同時保持資金流動性。收益由項目方 claim，合約僅記錄支持關係與接收捐贈，不託管用戶資產。

## 設計核心思想

當我們看見公益項目、非營利研究或需要幫助的人，心裡想出一份力，卻也得把自己的生活顧好，未必有餘裕拿出本金去捐助。若本金不多，把資金放進 DeFi 協議賺取的利息，對個人生活的改善也相當有限。

GoodVibe 的核心想法是：**既不勉強自己，也能長期支持**。你仍持有穩定幣、資產留在自己的錢包，只需透過鏈上登記，將存款收益匯聚到你認同的專案。許多人小小的利息，就能累積成可持續的影響力。

## 主要功能

### 品牌穩定幣發行
- 專案方可透過 Stable Layer 發行自己的品牌穩定幣（如 gvUSD、finalUSDC）
- 每個專案綁定一個品牌穩定幣，支持者 mint 該幣即產生 yield
- 幣的建立整合在 Create Project 流程中，也可獨立使用

### 專案管理（ProjectCreatorCap）
- 平台管理員發放 `ProjectCreatorCap` 給審核通過的專案方
- 持有 Cap 的地址可自行建立專案、綁定品牌穩定幣
- 專案方可更新進度、匯出支持者名單、領取 yield

### 對於支持者
1. **探索專案**：瀏覽公益項目，閱讀介紹與進度更新
2. **登記支持**：選擇專案，輸入金額，自動 mint 對應品牌穩定幣並登記支持
3. **保持彈性**：隨時增減支持金額或完全退出，資金不鎖定
4. **追蹤進展**：查看專案動態、支持者人數與募資狀況

### 對於專案方
1. **建立專案**：填寫資訊 + 選擇/建立品牌穩定幣，一站完成
2. **領取 yield**：claim 支持者穩定幣產生的收益
3. **發佈更新**：分享進度、成果或感謝訊息
4. **回饋支持者**：匯出支持者名單，作為發放 NFT、空投等鏈上回饋的依據

---

## 技術棧

**前端**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, @mysten/dapp-kit-react, stable-layer-sdk 3.1, @mysten/move-bytecode-template  
**合約**: Sui Move 2024（模組：platform、project、support_record）  
**鏈上**: Sui Mainnet，合約已升級至 V3

### 合約架構
- `Project<T>` — 泛型專案，綁定品牌穩定幣 type `T`
- `ProjectCap` — 專案所有權證明
- `ProjectCreatorCap` — 專案建立權限（admin 發放）
- `SupportRecord` — 支持者的支持紀錄（owned object）

**AI 工具揭露**：開發過程使用 AI 工具輔助，詳見 [AI_DISCLOSURE.md](./AI_DISCLOSURE.md)。

## 快速開始

```bash
# 前端開發
cd frontend
cp .env.local.example .env.local   # 複製範例，再編輯 .env.local 填入實際值
npm install
npm run dev
```

必填的 `.env.local` 變數：

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_SUI_NETWORK` | `mainnet` 或 `testnet` |
| `NEXT_PUBLIC_PACKAGE_ID` | 原始 V1 合約 Package ID（用於 type 查詢） |
| `NEXT_PUBLIC_PACKAGE_ID_LATEST` | 最新升級 Package ID（用於呼叫新函數） |
| `NEXT_PUBLIC_PLATFORM_ID` | DonationPlatform shared object ID |
| `NEXT_PUBLIC_ADMIN_CAP_ID` | PlatformAdminCap object ID |
| `NEXT_PUBLIC_STABLE_REGISTRY` | Stable Layer registry（mainnet） |

其餘見 [docs/deployment.md](./docs/deployment.md)。  
**gRPC（可選）**：若需啟用 [Surflux](https://surflux.dev) gRPC，在 `.env.local` 設定 `SUI_GRPC_ENDPOINT` 與 `SUI_GRPC_TOKEN`（勿用 `NEXT_PUBLIC_`）。

```bash
# 合約編譯與升級
cd contract
sui move build
sui client upgrade --upgrade-capability <UPGRADE_CAP_ID>
```

## 文檔

- **[黑客松開發 Prompt](./HACKATHON_PROMPT.md)** - 原始需求討論、技術要求與產品決策過程
- 開發紀錄與設計文檔見 [docs/](./docs/README.md)。
