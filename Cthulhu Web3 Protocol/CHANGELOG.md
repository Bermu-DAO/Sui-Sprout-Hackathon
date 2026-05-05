# 專案工作日誌 (Changelog)

此檔案用於記錄專案開發過程中的新增、刪除修改事項。

## 2026-04-06

### 新增功能與變更 (Added & Changed)
- ✨ **統一劇本大廳材質 (UI Polish)**：修復了 Scenario Dashboard 中，解鎖與未解鎖卷宗底色不一的問題。現在所有章節檔案都統一採用了 `bg-[#d8ccbb]` 羊皮紙底色，徹底解決之前誤用暗色面板套件導致畫面全黑消失的靈異現象。
- ✨ **屬性重塑互動升級 (Interactive Radar)**：在 `InvestigatorMint.tsx` 內重構了角色卡的 Reroll 體驗。移除了下方擁擠的按鈕群，將重骰功能直接綁定至雷達圖 (Radar Chart) 周圍的屬性文字端點上。現在玩家只要將游標移至屬性端點，即可透過直覺的 Hover 與 Tooltip 提示，點擊發動區塊鏈屬性重塑 (Reroll)。
- ✨ **品牌標識客製化 (Branding)**：全面將登入頁面標誌、導覽列，以及瀏覽器頁籤的 Vite 圖標統一替換為高解析度的 `logo.webp`，增加整體視覺沉浸感。
- ✨ **建立專案防護網 `.gitignore`**：在根目錄新增全域 `gitignore`，阻斷 Sui Move 的 `build/` 目錄、前端的 `node_modules/` 以及底層 AI Agent (`.claude/`, `.planning/`) 的雜亂日誌，確保推播的純淨度。
- ✨ **重寫英文版 GitHub README**：將原本的中文說明轉化並生成英文版的根目錄 `README.md`，提供雙語支援並優化專案社群推廣的可用性。
- ✨ **總結各目錄資源並建立 GitHub README**：綜合了 `coc_web3/WHITEPAPER.md`, `coc_web3/README.md` 以及 `coc_frontend/README.md`，在根目錄下建立了一份適用於 GitHub 的中文版 (`README_CN.md`)。內容包含雙向制衡與信譽系統、靈魂綁定角色卡防太監與跳車機制、鏈上百面骰公平檢驗，以及遊戲代幣的銷毀經濟等四大特色，並提供技術棧與快速上手說明。
- ✨ **專案資源路徑修復 (Vercel Fix)**：修正了在 Vercel 部署後音樂與背景圖消失的問題。將所有靜態資源從 `src/assets` 遷移至 `public/assets`，並更新了 `BgmContext.tsx` 與 `index.css` 中的路徑引用，確保生產環境下能正確加載資源。
- ✨ **本地通關紀錄整合 (Run History)**：在 `ProfileDashboard.tsx` 新增了個人通關歷史區塊。透過 `useLocalRunHistory` Hook 實現了基於錢包地址的 Local Storage 存儲，可追蹤「逃離實驗室」的結局、調查員狀態 (HP/SAN) 與通關時間，並以醒目的印章風格標籤（如 ✅ 生還逃脫、💀 命喪黃泉）呈現。
- ✨ **打字機對話防誤觸優化 (UX Fix)**：重構 `TypewriterModal.tsx`，移除了原先的滑鼠穿透設定，改採「二階段點擊」模式，第一下可快速顯示全文字，第二下才確認關閉。解決玩家因快速連續點擊而穿透對話框誤觸遊戲按鈕而暴斃的問題。
- ✨ **Boss 戰鬥平衡性調整 (Game Balance)**：在 `ScenarioEngine.tsx` 的 Boss 戰鬥中，為 Boss 增加了 60% 的「鬥毆 (Brawl)」命中判定。現在 Boss 必須先擲骰判定成功後才能造成傷害，並在失敗時顯示驚險閃避的敘述。
- ✨ **介面細節優化 (UI Enhancement)**：調高了 `blood-panel` 面板的背景不透明度以提升強對比下的可讀性，並將調查員屬性表全面雷達圖化。

### 移除內容 (Removed/Deleted)
- 無刪除現有功能。
- 移除了調查員數值表清單，改由雷達圖全面取代。
