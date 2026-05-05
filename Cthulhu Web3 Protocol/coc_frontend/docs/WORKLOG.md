# 📝 工作日誌 (WORKLOG)

> 這是本專案的核心紀錄檔案。**請每次進行任何程式碼新增、修改、刪除後，務必在此更新日誌。**

---

## [2026-03-31] 

### 🟢 增加功能 (Added)
- 新增 `docs/SDD.md`，定義克蘇魯 Web3 專案的軟體架構、資料模型與元件樹，幫助 Stitch 梳理接下來的開發脈絡。
- 新增 `docs/UI-SPEC.md`，制定專案深海克蘇魯視覺風格，統一色彩計畫(Deep Abyss, Eldritch Green)、打字機字體及特製的 Web3 等待動效規範。
- 新增此 `WORKLOG.md` 檔案建立工作日誌機制。

### 🔴 刪除功能 (Removed)
- 無。(初始化結構建立階段)

--- 
## [2026-03-31] (Update)

### 🟢 增加功能 (Added)
- 根據 `SDD.md` 與 `UI-SPEC.md` 的指引，在 Stitch 專案中成功生成「首頁/故事引言」畫面的第一版 (V1)，並套用玻璃擬物化與深海克蘇魯視覺風格。
- 根據 `SDD.md`，在 Stitch 專案生成「Identity (角色卡)」畫面，實作六圍雷達圖概念與 Mint 按鈕。
- 根據 `SDD.md` 與 `UI-SPEC.md`，在 Stitch 專案生成「Scenario (互動逃離劇本)」畫面，實作文字冒險對話框與屬性判定按鈕 (成功與失敗狀態展示)。
- 根據使用者指示，在 Stitch 專案生成「Vault (資產保險庫)」畫面，實作物資購買區與發票抽獎 (Gold Winner 發光效果) 設計。
- 根據使用者指示，在 Stitch 專案生成「Scenario Lobby (劇本大廳)」畫面，以調查員桌面上的神祕機密卷宗為概念設計。
- 將 Stitch 端的設計系統 (Deep Abyss, Eldritch Green, Old Paper) 具象化寫入前端專案，調整了 `index.css` 核心色票，並於 `App.tsx` 與 `WalletConnect.tsx` 套入玻璃擬物化與字體動效。
- **微調優化：** 在 `index.css` 將全域根字體縮放提高 30% (font-size: 130%) 以符合閱讀體驗，並為 `🔥 逃離實驗室` 加入 `nav_play` 的 i18n 中英切換。
- **微調優化：** 修正 `ScenarioEngine.tsx` 劇本介紹畫面中寫死的像素字級限制 (如 `text-[11px]`)，全部改為流暢響應式的 `text-sm` 或 `text-base` 讓字體順利隨全域等比放大。
- **多語系切換 (i18n)：** 將 `ScenarioEngine.tsx` 內近 30 處戰鬥與屬性判定日誌字串，全數抽象成 `engine_log_*` 等 i18n key 並完成中英雙語對齊。而 `scenario_escape_lab.ts` 本身內的劇情文本也已完全支援透過 Getter `getScenarioEvents`，動態引入 `scenario_escape_lab_en.ts` 的英文資料。

### 🔴 刪除功能 (Removed)
- 無。

---

## [2026-04-04]

### 🟢 增加功能 (Added)
- **`ActiveScenario.tsx`**：
  - 新增 `InGameCharacterPanel` 元件：取代所有硬編碼假資料（Randolph Carter / 45 SAN），改接 `useMyInvestigators` Hook 真實鏈上角色卡（STR/DEX/POW/CON/INT/EDU + SAN 血條）。
  - 新增 `InvestigatorSelector` 元件：持有多張角色卡時，可在進場前切換選擇要出場的角色。
  - Contract Safeguards 的 Staking Guarantee 金額改為動態顯示 `scenario.deposit`。
  - `KPReport.players` 從固定的 `Randolph Carter` 改為動態帶入目前選中的 `activeInv`。

- **`InvestigatorMint.tsx`**：
  - 修正 `reroll_attribute` 鏈上呼叫：補入缺少的 `tx.object(invObjectId)` 參數（`&mut Investigator`）。
  - Reroll 成功後新增 `await refetch()` 從鏈上同步最新屬性值。
  - `InvestigatorCard` 新增個別屬性 Reroll 按鈕（3×3 格），對已 Mint 的 NFT 發起真正的鏈上 reroll 交易。
  - `DiceRoller` 的 `onReroll` 改為本地預覽模式，語義區隔：Mint 前 = 本地亂數預覽，Mint 後 = 真實鏈上 reroll。

### 🔴 刪除功能 (Removed)
- **`ActiveScenario.tsx`**：移除所有硬編碼假角色資料。


### 🔧 Bug 修正 (Fixed)
- 修正 `DiceRoller onReroll` 的 TypeScript 型別錯誤，`tsc --noEmit` 零錯誤。

---

## [2026-04-04] (Session 2)

### 🟢 增加功能 (Added)
- **`useOnChainData.ts`**：新增 `useSettleSessionWithDApp` Hook 與 `SettleStatus` 型別。
  - 呼叫合約 `profile::record_escape(&mut CoreProfile, investigator_name, status, obituary, ctx)`，將劇本結局寫回鏈上 CoreProfile。
  - 同時將 `useDAppKit` / `Transaction` / `COC_PACKAGE_ID` 的 import 移至檔案頂層（原本只有 `useCurrentAccount` / `useCurrentClient`）。

- **`ScenarioEngine.tsx`**：
  - 所有結局觸發（`escaped` / `escaped_with_evidence` / `boss_defeated` / `died_inside`）現在會自動呼叫 `useSettleSessionWithDApp.settle()`，將角色名、結局狀態、自動產生的墓誌銘寫回鏈上。
  - 結局畫面新增「鏈上結算狀態」區塊（pending / success / error 三態顯示）。
  - 新增 `useCoreProfile` 引用以取得 `profile.objectId`（結算必要參數）。

### 🔴 刪除功能 (Removed)
- **`CreateProfile.tsx`**：移除危險的 mock success fallback（任何非使用者拒絕的錯誤都會顯示真實錯誤訊息，不再靜默進入主介面）。

### 🔧 Bug 修正 (Fixed)
- **`CreateProfile.tsx`**：修正 catch 型別從 `any` 改為 `unknown`，消除 eslint `@typescript-eslint/no-explicit-any` 警告。
- 確認 `src/contracts/invoice.ts` 的所有 Shared Object ID 已填寫，無 TODO 殘留，`AssetManager` 可正常運作。
- `tsc --noEmit` 全域零錯誤。

---

## [2026-04-04] (Session 3)

### 🟢 增加功能 (Added)
- **`KPReport.tsx`** — 全面改寫，加入真實鏈上結算：
  - 新增 `sessionObjectId` prop（選填），有值時呼叫 `profile::kp_add_hosted_game` 合約。
  - 新增三態 UI：pending / success（自動跳轉）/ error（Retry + Skip & Exit 按鈕）。
  - 所有 `any` 型別改為 `unknown`。

- **`useScenarios.ts`** — 全新 Hook：
  - 從 `COC_MARKETPLACE_ID` 讀取鏈上 GameSession 清單。
  - 備援：監聽 `session::SessionCreated` 事件作為第二來源。
  - 鏈上無資料時 fallback 到 3 個 Demo 劇本。
  - 用 `SuiClientCompat` 介面替代所有 `any`。

- **`ScenarioDashboard.tsx`** — 接入 `useScenarios` Hook：
  - 移除所有硬編碼 `useState<Scenario[]>`。
  - 新增「Live / Demo」小標籤與 Refresh 按鈕。

### 🔴 刪除功能 (Removed)
- `ScenarioDashboard.tsx`：移除本地 `Scenario` interface，改由 `useScenarios.ts` 統一匯出。

### 🔧 Bug 修正 (Fixed)
- `tsc --noEmit` 全域零錯誤。

---

## [2026-04-04] (Session 4)

### 🟢 增加功能 (Added)
- **多語系切換 (i18n)**：在 `ActiveScenario.tsx` 中實作 i18n 翻譯支援，包含「In-Game Status」、「Live Dashboard」、「Settle Session」及其他控制元件的切換。
- **雷達圖套用**：在 `ActiveScenario.tsx` 與 `ScenarioEngine.tsx` 中的角色狀態展示區與選擇器，全部升級為與 Investigator Mint 畫面相同的 `SmallRadarChart` 六圍（神祕學九圍）雷達圖，提升視覺一致性與代入感。
- **動態場景背景 (Dynamic Backgrounds)**：建立五種專屬場景背景樣式（Landing Page、角色與劇本大廳、劇本遊玩中、打王與不同結局的宇宙感），依據 `App.tsx` 與 `ScenarioEngine.tsx` 中的遊戲進度完美進行無縫切換，進階提升畫面沉浸感。

### 🔴 刪除功能 (Removed)
- 無

### 🔧 Bug 修正 (Fixed)
- **`useOnChainData.ts`**：修正 `record_escape` 的參數錯誤問題，對齊鏈上的 `profile::record_escape` 只接受 `CoreProfile` 的規定。
- **`useOnChainData.ts`**：解決了登入後短時間內出現無差別要求「Mint Profile」與 Loading 畫面閃爍的問題，現在能正確顯示載入完畢的結果。
- **`AssetManager.tsx`**：修正了 Tax Coin 與開獎按鈕的問題，將抽籤權限解放讓一般玩家 UI 可以點擊（受鏈上保護），並對 Tax Coin 購買新增了管理員提醒。
- **劇本邏輯 (`scenario_escape_lab.ts` / `en.ts`)**：修正逃離實驗室中老闆 (Boss) 的血量從 20 調整至 7。
