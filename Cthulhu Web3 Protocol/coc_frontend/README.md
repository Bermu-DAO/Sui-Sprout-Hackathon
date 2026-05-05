# 🐙 Cthulhu Web3 Protocol (CoC-W3P)

> **「凝視深淵之時，深淵也在區塊鏈上計算你的 SAN 值。」**
> 
> *When you gaze into the abyss, the abyss is calculating your SAN points on the blockchain.*

這是一個將 **「克蘇魯神話 (Call of Cthulhu)」** 跑團體驗與 **Sui Web3 區塊鏈** 深度結合的實驗性互動專案。本專案將 TRPG（桌上角色扮演遊戲）的核心機制（例如角色屬性、裝備資產、機率檢定）無縫搬上區塊鏈，打造一個「無法被竄改的恐怖體驗」。

---

## 🎲 核心特色與架構

本專案分為 **智能合約 (Move)** 與 **前端互動 (React + Sui dApp Kit)** 兩個重要部分，這不只是一個展示畫面，而是真實運作於 Sui 測試網 (Testnet) 的應用程式。

### 1. 錢包優先的去中心化身分 (Wallet-First Auth)
- 放棄傳統的帳號密碼，玩家使用 Web3 錢包（如 Sui Wallet）登入。
- 系統會即時掃描錢包內的 `CoreProfile`（核心個人檔案）與 `Investigator`（探索者/角色卡）NFT。
- 若為新玩家，則會引導至「創建檔案」與「角色鑄造」流程，所有資產都會直接進入玩家錢包。

### 2. 鏈上屬性驅動的劇本引擎 (On-Chain Scenario Engine)
- 玩家的「探索者 (Investigator)」NFT 上面記錄著真實的六圍與屬性（如 `str` 力量、`dex` 敏捷、`san` 理智值）。
- 在進行如同「文字冒險遊戲 / 視覺小說」的「逃離實驗室 (Escape the Lab)」劇本時，選項會嚴格判斷玩家錢包中的角色屬性。
- 例如：需要「力量 > 60」才能強行破門，「理智值 < 30」會看見幻覺。每一次的互動都是真實調用你的鏈上資產。

### 3. 克蘇魯鏈上經濟系統 & 抽獎保險庫 (Asset Manager & Lottery)
- **多幣制經濟**：實作了測試用的 `USDC` 水龍頭（Faucet），並透過鏈上 `Treasury` (國庫) 進行了 1 USDC = 10 TAX_COIN 的兌換機制。
- **鏈上發票 (Invoice protocol)**：購買「生存藥水」等物資時，除了消耗代幣外，還會鑄造出一張「Invoice」物件到錢包中作為彩券。
- **可驗證抽獎**：管理員透過 Sui Random (0x8) 產生鏈上亂數決定中獎號碼，玩家可以在前端即時核對錢包裡的 Invoice 號碼是否中獎（WINNER），若符合條件即可執行 `claim_lottery` 領取豐富獎勵。

---

## 🛠️ 技術堆疊 (Tech Stack)

### 前端 (Frontend)
*   **核心框架**：React 19, TypeScript, Vite
*   **樣式與介面**：Tailwind CSS + 自訂的客製化樣式（Glassmorphism, 復古打字機效果, 血跡微動畫）。
*   **Web3 整合**：`@mysten/dapp-kit`, `@mysten/sui.js`，用於連線錢包與組裝複雜的交易卡（TransactionBlock）。
*   **狀態與圖標**：Radix UI, Lucide React Icons。

### 後端/合約 (Smart Contracts)
*   **語言**：Sui Move
*   **重點模組**：
    *   `profile` & `coc_scenario`：處理角色屬性與事件狀態。
    *   `usdc` & `tax_coin`：實現 Coin 創建、國庫權限與水龍頭。
    *   `invoice`：具有 `Clock` 與 `Random` 機制的收據/彩券抽獎系統。

---

## 🚀 快速上手 (Getting Started)

### 1. 啟動前端開發環境
首先請確保你已安裝 Node.js (v18+)，然後在 `coc_frontend` 目錄下執行：

```bash
npm install
npm run dev
```

### 2. 設定智能合約 Object ID
專案中的 `src/contracts/invoice.ts` 與 `protocol.ts` 內儲存了部署在 Sui Testnet 上的 Shared Object ID 與 Package ID。如果你重新發布了合約，請務必手動替換這些 ID。

### 3. 操作流程建議 (UAT Flow)
1. 連接 Sui 測試網錢包。
2. 切換至 **Asset Vault (資產保險庫)**。
3. Mint 測試用的 USDC。
4. 將 USDC 交換為 TAX 幣。
5. 花費 TAX 幣購買生存物資，獲得一張包含專屬 `invoice_number` 的收據。
6. (管理員限定) 點擊右上角骰子按鈕進行鏈上隨機抽獎。
7. 確認你的收據是否亮起黃金色的 `WINNER`，按下 Claim 領取獎勵！

---

> 📝 **開發筆記：**  
> *"Web3 開發最痛苦的永遠不是寫智能合約，而是把合約接上 React 後看着 Transaction Resolution 各種噴 Error... 但比起 debug，跑團的調查員死得更慘。"* 
