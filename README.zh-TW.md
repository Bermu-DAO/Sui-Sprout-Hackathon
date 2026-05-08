# Sui Sprout: BermuDAO 線上黑客松 — 項目索引

**Sui Sprout: BermuDAO Online Hackathon** General Ecosystem Track 全部 16 件作品的本地存檔。

> 🌐 語言:[English](README.md) · **繁體中文**

下方每個項目連到本 repo 中的對應資料夾,並附上簡短說明。完整技術細節請打開項目資料夾、讀其各自的 `README.md`。

---

## 🎮 遊戲與 GameFi

### [Sui Taiwan Lottery](./%231%20Sui-Taiwan-Lottery/)

把台灣刮刮樂搬上鏈的測試網 dApp。購票、刮獎、結算全部由 Move 合約處理;用 TWD 測試代幣消費,gas 成本接近零,UX 特別針對黑客松評審動線設計。

### [Minesweeper — Bermuda DAO Mines](<./%233 minesweaper/>)

可驗公平的鏈上踩地雷。逐格揭開讓倍率上升、風險也跟著放大;隨時收手鎖定獎金,或繼續挑戰更高回報——踩到地雷則本局歸零。經典遊戲被重塑為純粹策略與膽識的 GameFi。

### [WanderLot](./WanderLot/)

旅遊風 GameFi dApp。在虛擬景點購買紀念品時自動鑄造一張鏈上 Invoice,既可自己持有等開獎,也能存進共享發票池與其他旅人均分風險。一整年的票根就是你公開可分享的鏈上旅遊履歷。

### [Cthulhu Web3 Protocol (CoC-W3P)](<./Cthulhu Web3 Protocol/>)

針對線上 TRPG(如《克蘇魯的呼喚》)開發的實驗性 Web3 協議。雙向質押讓 KP 與玩家都不能輕易跳車、`sui::random` 提供可驗證的 d100 擲骰、退役調查員會鑄造成不可轉讓的 Soulbound 墓誌銘 SBT。把跑團的信任危機寫成鏈上代碼。

---

## 💰 DeFi 與市場

### [OracleFi](./OracleFi/)

APY 隨鏈上預言機代幣價格即時變動的質押協議——幣價越高、收益越高,全部由 Move 合約透明計算。內建公開水龍頭、管理員儀表板、Next.js 雙語 UI。

### [Sui Jackpot Market](./binary-prediction-jackpot/)

帶有「輸家大樂透 (Lossless Lottery)」機制的二元 YES/NO 預測市場。每筆下注都注入 Jackpot 池並鑄造一張 Invoice 抽獎號碼;預測失敗的那一方依然有機會抽走整個獎池。

### [Gamble SUI](./gamble-sui/)

把代幣價格預測做成博彩體驗的 Sui 預測市場。下注注入獎池、結果帶有彩券式的爆發空間,目的是把預測市場從嚴肅的對沖工具,變成像拉霸機一樣的娛樂體驗。包含 Oracle、前端、Move 合約三個子目錄。

### [Robinhood.Pad](./Robinhood-launchpad-final/)

社群優先的去中心化 Launchpad。Priority Pass 競價結合 Jackpot Pool 抽獎池,打破大戶壟斷早期額度——購買 Pass 的 80% 費用回流到抽獎池,讓小資用戶也能共享 Alpha 紅利。

### [BaleenPay](./BaleenPay/)

把訂閱金流轉成生息資產的 Demo 系統。用戶以 BrandUSD 付款;底層 USDC 透過 StableLayer 自動鑄造後送進收益聚合器,商家從儀表板領取累積收益,把閒置現金流變成新的營收來源。

### [GoodVibe](./goodvibe/)

建在 Sui 與 Stable Layer 上的公益募資平台。存入 USDC、鑄造項目的品牌穩定幣,把「收益」捐出來而不動本金——資產始終留在你錢包、流動性不鎖死,讓「不勉強自己也能長期支持公益」變成日常可做的事。

### [SpendBack](./spendback/)

Sui 生態的回饋激勵層。自動偵測你的鏈上活動,把每筆交易鑄成 Invoice NFT(完整收據存在 Walrus),每張 Invoice 同時是抽獎號碼,有機會獨吞整個 USDC 獎池。鏈上越活躍,中獎機率越高。

---

## 🏛️ 實體資產與基礎設施

### [ParkFi](./ParkFi/)

把實體停車格搬上鏈的 RWA 系統。每個停車格是獨立 NFT;營運商鑄造、投資者買賣、駕駛人付費停車——合約把每筆停車費自動 80/20 拆給營運商與 NFT 持有者,基礎設施收益第一次變得可程式化、可流通。

### [PayLock](./payLock/)

去中心化影片託管的 Go 後端。影片存在 Walrus、播放透過 HTTP 重新導向到 Walrus Aggregator;Sui Move 合約負責鏈上付費牆,內建 chain watcher 自動同步付款狀態,FFmpeg pipeline 可選。

### [Octopus](./Octopus/)

OCTOPUS — On-Chain Transaction Obfuscation Protocol Underlying Sui。基於 Groth16 ZK-SNARK 的隱私層:存款變成隱藏金額與幣種的承諾、提款用零知識證明所有權、nullifier 防止雙花、Merkle 樹維護匿名集——讓 Sui 透明帳本擁有可驗證的隱身斗篷。

---

## 🛠️ 工具與工作空間

### [sui client Online](<./%232 sui-client-online/>)

寫給「不想活在 CLI」的人的圖形化 Sui 客戶端。連錢包、執行 Move call、查詢物件、組合 Programmable Transaction Block(PTB),全部在一個瀏覽器面板裡完成,不需要 `sui` 執行檔。

### [CohortVault](./Cohortvault/)

針對敏感研究、策略與憑證設計的 AI 工作空間。角色導向的 Secure Run 流程、不會經過瀏覽器的委派密鑰、每一次工作流執行都附帶簽章 receipt v1 紀錄與完整審計軌跡。

---

## 📁 資料夾結構

```
hackathon/
├── #1 Sui-Taiwan-Lottery/         # 刮刮樂彩券 dApp
├── #2 sui-client-online/          # 瀏覽器版 Sui 客戶端
├── #3 minesweaper/                # 鏈上踩地雷
├── BaleenPay/                     # 訂閱金流 + 收益聚合
├── Cohortvault/                   # 敏感資料 AI 工作空間
├── Cthulhu Web3 Protocol/         # Web3 TRPG 協議
├── Octopus/                       # ZK 隱私層
├── OracleFi/                      # 預言機驅動的動態 APY 質押
├── ParkFi/                        # 停車格 RWA
├── Robinhood-launchpad-final/     # 社群優先 Launchpad
├── WanderLot/                     # 旅遊 GameFi 共享彩券池
├── binary-prediction-jackpot/     # 預測市場 + 輸家大樂透
├── gamble-sui/                    # 遊戲化預測市場
├── goodvibe/                      # 收益型公益募資
├── payLock/                       # Walrus 影片付費牆
└── spendback/                     # 鏈上發票 NFT 彩券
```

---

## 來源

- 黑客松頁面:[DeepSurge — Sui Sprout: BermuDAO Online Hackathon](https://www.deepsurge.xyz/projects?hackathon=8076333e-0888-408e-b7a0-bacd372cee1e)
- 賽道:General Ecosystem Track
- 已存檔項目數:**16**
