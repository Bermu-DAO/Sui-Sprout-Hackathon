# 🐙 Call of Cthulhu Web3 Protocol (CoC-W3P) - SDD

> **「這是一份紀錄不可名狀體驗的檔案，閱讀前請過一個理智檢定 (SAN check)。」**

## 1. 專案概述 (Project Overview)
本專案為結合 Sui 區塊鏈與克蘇魯神話 (Call of Cthulhu) 跑團機制的互動型去中心化應用程式 (dApp)。
玩家透過 Web3 錢包持有屬性（Investigator NFT）、花費 Token 購買物資（生存藥水），並透過 Invoice 功能進行鏈上抽獎，來體驗不可竄改的劇本流程。

## 2. 系統架構 (System Architecture)
- **前端框架**: React 19 + TypeScript + Vite
- **Web3 連線**: `@mysten/dapp-kit` (負責錢包連接、交易組裝)
- **佈景與樣式**: Tailwind CSS (使用 `index.css` 與客製化變數)
- **鏈上合約**: Sui Move (Profile 屬性卡, Tax_Coin, USDC 水龍頭, Invoice 抽獎系統)

## 3. 核心實體模型 (Core Data Models)
前端需解讀來自合約的以下兩種主要 Object：

1. `CoreProfile` / `Investigator`:
   - 記錄玩家能力值 (STR, DEX, SAN) 與基本狀態 (Health)。
   - 劇本抉擇依賴這些數據進行判定 (如判定 STR 是否大於 50 才能開門)。
2. `Invoice` (Receipt/Ticket):
   - 玩家交易成功後產生的收據。
   - 具備 `invoice_number`，可參與練上可驗證亂數抽獎。

## 4. 關鍵頁面與組件樹 (Component Tree Recommendation)
給 Stitch 等 UI 生成工具的參考結構：

```
App (Root)
├── WalletProvider (Sui dApp Kit)
└── Layout (全螢幕佈景覆蓋，克蘇魯濾鏡)
    ├── Header
    │   ├── 標題 (CoC-W3P)
    │   └── WalletConnectButton
    │
    └── MainRoutes
        ├── Home (入口/故事引言)
        ├── Identity (角色卡/探索者屬性)
        │   ├── MintProfileButton (新建角色)
        │   └── StatRadarChart (六圍圖表)
        │
        ├── Scenario (逃離實驗室劇本)
        │   ├── DialogueBox (如視覺小說的對話框)
        │   └── ActionOptions (依據屬性決定是否能點擊的按鈕)
        │
        └── Vault (資產保險庫 & 抽獎)
            ├── Faucet (USDC/TEX)
            ├── ItemShop (兌換物資)
            └── LotteryTerminal (抽出 Invoice 並驗證 WINNER)
```

## 5. UI/UX 狀態定義 (State Definitions)
- **連線狀態 (Wallet Status)**: Disconnected (顯示迷霧)、Connecting (觸手動畫)、Connected (顯示理智值)。
- **交易狀態 (Transaction Status)**: Pending (施法/撰寫符文)、Success (古神賜咒)、Error (理智受損/紅色閃爍)。
