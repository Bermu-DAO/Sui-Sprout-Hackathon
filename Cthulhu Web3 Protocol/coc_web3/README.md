# 📜 Cthulhu Web3 Protocol (CoC-W3P) Litepaper

## 1. 專案願景 (Vision)
Tabletop RPG（如《克蘇魯的呼喚》）是依賴極高信任與時間成本的遊戲。然而在網路上與陌生人跑團，時常面臨「KP 爛尾」、「玩家中途惡意跳車」等破壞體驗的行為。
**Cthulhu Web3 Protocol** 透過 Sui 區塊鏈的去中心化特性與 DeFi 質押模型，打造一個具備「雙向制衡」與「永久聲譽」的 TRPG 撮合生態圈。

---

## 2. 核心架構 (Architecture)

本協議包含四個核心 Move 智能合約模組：

### 📝 Module 1: `coc_profile` (帳戶與聲譽層)
- **統一押金帳戶 (CoreProfile)**：用戶以 SUI 代幣質押註冊。帳戶內包含 `player_reputation` 與 `kp_reputation` 雙維度評分，並共用全域逃跑次數 `escape_count`。
- **靈魂綁定退坑 (Burn & SBT)**：玩家註銷帳戶時，質押金全額釋放退回，合約依據其生涯成績與自定墓誌銘，自動鍛造出一張不可轉讓的 `CommemorativeSBT` 發還給玩家錢包，做為 Web3 終身成就刺青。

### 🎭 Module 2: `coc_investigator` (角色與規則層)
- **角色卡 NFT (Investigator)**：完整的 8 大屬性與衍生能力值上鏈（HP, SAN, MP）。
- **狀態改變與成長**：提供因應各類檢定的函數操作，包含幕間成長的技能升級、戰鬥的血量扣除，以及面臨恐懼的理智檢定掉 SAN 邏輯。

### 🎲 Module 3: `coc_scenario` (劇本與制衡層)
- **雙向質押 (Dual-Staking)**：KP (守秘人) 發布劇本必須鎖入保證金；玩家入團也需抵押。
- **鎖卡機制 (Locking)**：玩家的 `Investigator` NFT 在入團期間會被沒收進入劇本物件內，達成「禁止雙開」防呆機制。
- **時間鎖與多簽解散 (Time-Lock & Multi-Sig)**：若 KP 惡意消失不結團（超過時間鎖），玩家可投票過半數強制「無損解散」並瓜分 KP 保證金。若在時限內，KP 受時間鎖保護，玩家無權惡意搶劫。
- **GameFi 代幣銷毀 (Token Sink)**：提供消耗代幣購買「理智回復道具」等機制，代幣直接打入 `0x0` 地址銷毀，抑制代幣通膨。

### 🏛 Module 4: `coc_marketplace` (撮合市集層)
- **名譽查核過濾 (Reputation Gate)**：專門負責防禦惡意玩家洗版大廳。合約會嚴格審核 KP 的 `escape_count` 等歷史紀錄，信譽不佳者將觸發 `E_REPUTATION_TOO_LOW`，永遠無法在首頁公開招募。

---

## 3. 下一步與路線圖 (Next Steps)
1. **Frontend DApp (前端去中心化應用程式)**：使用 React + Sui dApp Kit 建立市集大廳、角色卡視覺化介面。
2. **Oracle 整合 (預言機擲骰)**：引進 VRF (可驗證隨機函數) 來確保線上擲骰結果絕對公平且不可竄改。
3. **動態技能擴充 (Dynamic Fields)**：使用 Sui 的 Dynamic Object Fields 讓角色的技能清單可以無限且彈性地增長。
