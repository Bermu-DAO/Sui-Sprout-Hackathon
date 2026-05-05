# Sui 台灣樂透

語言：
- 英文版：[README.md](README.md)
- 繁體中文版（本檔）
- 評審操作腳本：[HACKATHON_JUDGE_FLOW.zh-TW.md](HACKATHON_JUDGE_FLOW.zh-TW.md)

這是一個建立在 Sui testnet 上的台灣刮刮樂 demo。
目前遊戲金流改為 **TWD 測試幣**，只有交易 gas 仍使用 SUI testnet 幣。

## 這版功能

- 刮刮樂購買、刮開、揭曉、領獎
- 三種票種：NT$200 / NT$500 / NT$2,000
- 鏈上隨機數採用 Sui 官方 Randomness (`0x8`)
- 前端同時顯示 TWD 餘額與 SUI gas 餘額
- 管理員可發放 TWD、補獎池、提領獎池資金
- 仍保留 onchain_invoice 相關前端工具，作為額外的測試代幣流程

## 票種與獎金

- NT$200：中獎率較低，獎金較小
- NT$500：中間級別，獎金中等
- NT$2,000：較高票價，獎金範圍較大

目前畫面上的獎金範圍已調整為比較接近真實刮刮樂的呈現，不再把所有格子都做成超大獎。

## 技術棧

- 前端：React 18 + TypeScript + Vite
- 鏈上互動：Sui dApp Kit + `@mysten/sui/transactions`
- 智能合約：Move + `sui::random`
- 網路：Sui testnet

## 快速開始

1. 安裝依賴

```bash
npm install
```

2. 建立環境變數檔

```bash
copy .env.example .env
```

3. 填入已部署的 ID

- `VITE_SUI_NETWORK`
- `VITE_SUI_FULLNODE_URL`
- `VITE_SUI_FRAMEWORK_PACKAGE_ID`
- `VITE_SUI_RANDOM_PACKAGE_ID`
- `VITE_LOTTERY_PACKAGE_ID`
- `VITE_LOTTERY_OBJECT_ID`
- `VITE_TWD_BANK_OBJECT_ID`

如果你要用管理員補發測試代幣，也可以一併設定 onchain_invoice 的欄位。

4. 啟動開發伺服器

```bash
npm run dev
```

5. 生產編譯

```bash
npm run build
```

## 智能合約

主合約在 [contracts/lottery/sources/lottery.move](contracts/lottery/sources/lottery.move)。

主要功能：

- `buy_scratch_card()`：用 TWD 買刮卡並在鏈上生成盤面
- `settle_scratch()`：完成領獎結算
- `top_up()`：補獎池 TWD
- `withdraw()`：管理員提領獎池資金
- `claim_test_twd()`：從共享銀行領取測試 TWD

隨機數使用官方模組：

```move
let mut gen = sui::random::new_generator(random, ctx);
let roll = (sui::random::generate_u32(&mut gen) as u64) % 10000;
```

## 前端交易層

交易工具在 [src/utils/transactions.ts](src/utils/transactions.ts)：

- `buildBuyScratchCardTx()`：購買刮卡
- `buildSettleScratchTx()`：領獎結算
- `buildTopUpTx()`：補獎池
- `buildClaimTestTwdTx()`：發放測試 TWD
- `getContractIds()`：讀取部署 ID

主要 UI 在 [src/App.tsx](src/App.tsx)，管理頁在 [src/AdminPanel.tsx](src/AdminPanel.tsx)。

## 環境變數

範例檔案：[.env.example](.env.example)

必要欄位：

- `VITE_SUI_NETWORK`
- `VITE_SUI_FULLNODE_URL`
- `VITE_SUI_FRAMEWORK_PACKAGE_ID`
- `VITE_SUI_RANDOM_PACKAGE_ID`
- `VITE_LOTTERY_PACKAGE_ID`
- `VITE_LOTTERY_OBJECT_ID`
- `VITE_TWD_BANK_OBJECT_ID`

選用欄位：

- `VITE_INVOICE_PACKAGE_ID`
- `VITE_INVOICE_SYSTEM_ID`
- `VITE_INVOICE_TREASURY_ID`
- `VITE_INVOICE_USDC_TREASURY_CAP_ID`
- `VITE_INVOICE_TAX_TREASURY_CAP_ID`
- `VITE_INVOICE_ADMIN_ID`

## 專案結構

```text
.
├── src/
│   ├── App.tsx
│   ├── AdminPanel.tsx
│   ├── main.tsx
│   └── utils/transactions.ts
├── contracts/lottery/
│   ├── Move.toml
│   └── sources/lottery.move
├── .env.example
├── README.md
├── HACKATHON_JUDGE_FLOW.zh-TW.md
└── package.json
```

## 部署步驟

1. 編譯合約

```bash
cd contracts/lottery
sui move build
```

2. 發佈到 testnet

```bash
sui client publish --gas-budget 100000000
```

3. 把 publish 後的 Package ID、Object ID 填回 `.env`

4. 重新編譯前端

```bash
npm run build
```

## 補充

- 這個專案已改成 TWD 優先，SUI 只負責 gas。
- 中獎率與獎金已調整為較接近現實的區間。
- 評審流程可搭配 [HACKATHON_JUDGE_FLOW.zh-TW.md](HACKATHON_JUDGE_FLOW.zh-TW.md) 一起看。