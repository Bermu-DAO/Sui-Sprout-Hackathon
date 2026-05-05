# 🎨 CoC-W3P - UI-SPEC (for Stitch)

> 本文件供前端設計與 MCP Stitch 參考，確保產出的 UI 符合克蘇魯與跑團 (TRPG) 的核心體驗。

## 1. 核心風格 (Visual Identity)
- **玻璃擬物化 (Glassmorphism)**: UI 在深邃背景上呈現半透明毛玻璃質感。
- **懸疑/恐怖氛圍**: 色調極度偏暗，對比強烈的紅色或螢光綠作為警示或特別獎勵。
- **復古報告文件**: 檔案、收據、對話框應呈現出打字機時代或舊泛黃紙張的氛圍。

## 2. 色彩計畫 (Color Palette)

請在 Tailwind / CSS 變數中使用以下色系：

*   **Deep Abyss (背景底色)**: `#050914` (深藍黑，像是沒有光的海底)
*   **Eldritch Green (主色調/成功)**: `#1F8A70` 或 `#00FF9D` (不可名狀的詭異綠光，用於按鈕 Hover、成功檢定)
*   **Sanity Blood (警告/失敗/受傷)**: `#8A151B` (乾涸的血色，用於 SAN 值下降、血量低、Transaction 失敗)
*   **Old Paper (文字主色/收據背景)**: `#E8DEC8` 到 `#D4C4A8` (陳舊羊皮紙色，取代純白文字)
*   **Gold Winner (中獎)**: `#FFD700` (閃耀金，專門用於 Invoice Lottery 中獎的 `WINNER` 提示)

## 3. 字體規範 (Typography)

*   **標題型字體 (Heading)**: `Special Elite` 或 `Courier Prime` (復古打字機風格)
*   **內文字體 (Body)**: `Inter` 搭配適當字距，或是無襯線但易讀的黑體。
*   *Stitch 提示*: 如果沒有辦法載入特殊字體，至少要求使用 `font-mono`。

## 4. 關鍵組件 UI 規範 (Component Specs)

### 4.1 對話/劇本視窗 (Scenario Dialogue)
- 仿造舊文字冒險遊戲介面。
- 邊框帶有些微雜訊 (Noise overlay) 或 scanline。
- 文字要有**打字機浮現效果 (Typing animation)**。

### 4.2 屬性按鈕 (Attribute Checks)
- 如果該按鈕需要「力量 > 60」且玩家**未達標**，按鈕應呈現：
  - 透明度降低 (Opacity 0.5)
  - 出現刮痕 (Scratches)
  - Hover 時顯示 `[判定失敗: 力量不足]`，且鼠標變成 `not-allowed`。

### 4.3 抽獎收據 (Invoice Ticket)
- 呈現方式應像一張真實的復古電影票或收銀機發票，邊緣有鋸齒狀 (Zig-zag edges)。
- 如果是中獎票 (WINNER)，邊框應套用緩慢發光的黃金呼吸燈動畫 (CSS Pulse Animation)。

## 5. 動效指導 (Micro-Animations)
1. **理智檢定 (SAN Check) 失敗 / Error**: 
   螢幕輕微震動 (`shake` animation) 搭配邊緣閃爍 `Sanity Blood` 的紅色內陰影 (inset shadow)。
2. **區塊鏈交易等待 (Transaction Pending)**: 
   不要用傳統 Loader，使用像是眼睛緩慢睜開/閉上，或者神秘學符號旋轉的動畫。
