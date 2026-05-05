# 🐙 Cthulhu Web3 Protocol (CoC-W3P)

> **「凝視深淵之時，深淵也在區塊鏈上計算你的 SAN 值。」**
> 
> *When you gaze into the abyss, the abyss is calculating your SAN points on the blockchain.*

傳統在網路上跑 TRPG（例如《克蘇魯的呼喚》），遇到野團最痛苦的莫過於守秘人（KP）惡意斷更、或是玩家中途無故跳車了。
這是一個將 **桌上角色扮演遊戲體驗** 與 **Sui 區塊鏈** 深度結合的去中心化實驗專案。我們試圖透過區塊鏈的經濟制衡與信任機制，打造一個「無法被竄改且保證結局」的 TRPG 撮合生態系。

---

## 🌟 核心理念與特色

### 1. ⚖️ 雙向制衡與信譽系統 (Dual-Staking & Reputation)
系統導入了 DeFi 質押機制，KP 發布劇本和玩家入團都需要抵押代幣（如 SUI）。
- **玩家防跳車**：在劇本未結算前，你的角色卡（Investigator NFT）會被沒收並鎖定，物理上杜絕「雙開」問題。
- **KP 防太監**：若超過結團時間鎖（Time-Lock）且 KP 惡意消失，玩家可發起連署多簽（Multi-sig）強制解散，甚至能瓜分 KP 留在合約內的保證金作為心靈賠償。

### 2. 🎭 去中心化身分與永久墓誌銘 (Wallet-first & SBT)
- 拋棄傳統帳密登入，透過錢包即可綁定個人的 `CoreProfile`。
- 退坑時銷毀帳號可全額退回押金，智能合約還會依照你的生涯戰績與墓誌銘，為你鑄造一張不可轉讓的「靈魂綁定紀念碑 (SBT)」，作為永恆的 Web3 刺青。

### 3. 🎲 絕對公平的鏈上百面骰 (On-Chain VRF)
傳統的骰子機器人或網頁都有後端可能被竄改的風險。我們整合了原生的 `sui::random`，每次的技能檢定都在鏈上即時生成隨機數，確保完全透明防作弊。

### 4. 💎 GameFi 與代幣銷毀經濟 (Token Sink)
系統內建 USDC 與 TAX_COIN 退換機制，玩家可以在跑團過程中購買緊急醫療箱等補給體驗。消費的代幣將會被打入黑洞地址 (`0x0`) 全面銷毀，抑制通膨。而在消費時會產生「Invoice」，還可以利用鏈上隨機數進行摸彩！

---

## 📁 專案架構 (Project Structure)

本專案分為兩大核心目錄：

```text
Sui_Cathulu/
├── coc_web3/          # 🧠 Sui Move 智能合約
│   ├── sources/
│   │   ├── coc_profile.move       # 管理帳戶與靈魂綁定退坑證明 (SBT)
│   │   ├── coc_investigator.move  # 管理角色 NFT、能力值轉換、掉 SAN 等邏輯
│   │   ├── coc_scenario.move      # 劇本雙向質押、時間鎖對抗系統
│   │   └── ...                    # 其他周邊模組
│   ├── README.md
│   └── WHITEPAPER.md              # 系統白皮書與經濟學論述
│
└── coc_frontend/      # 🖥️ 前端 DApp (沈浸式克蘇魯終端介面)
    ├── src/
    ├── package.json
    └── README.md
```

### 技術堆疊 (Tech Stack)
- **智能合約**: Sui Move, Sui Framework (`sui::random`, `sui::clock`)
- **前端開發**: Vite, React 19, TypeScript
- **Web3 整合**: `@mysten/dapp-kit`, `@mysten/sui.js`
- **UI 與互動**: Tailwind CSS, Radix UI, 自訂 Glassmorphism 復古克蘇魯風格

---

## 🚀 快速上手 (Getting Started)

要完整跑起這個專案，你需要同時發布合約與啟動前端。

### 1. 部署智能合約
請確保本機已安裝 Sui CLI 且擁有充足的 Testnet 測試幣：
```bash
cd coc_web3
sui client publish --gas-budget 1000000000
```
部署完成後，請記下產生的 `Package ID` 以及部分共享物件 (Shared Object) 的 ID。

### 2. 啟動前端環境
接著進入前端專案，並確保你的 Node 環境 (v18+) 正常：
```bash
cd ../coc_frontend

# 安裝依賴
npm install

# (重要) 啟動前，請將剛剛部署獲得的 Package ID 填寫到 `src/contracts/...` 相關配置中。

# 啟動終端
npm run dev
```

接著你就能在本地打開瀏覽器，連結你的 Sui 測試網錢包，開始這場瘋狂與理智交織的區塊鏈冒險了！

---

> 📝 **Developer Notes:**
> 「每次處理智能合約與前端 React TransactionBlock 的非同步除錯時，我就感覺又一次在進行理智檢定......但比起 debug，跑團的探索者死得更慘，這也就是人生吧哈哈。」
> 
> 歡迎探索此專案代碼，或提供針對前端與 Move 合約的改進建議！
