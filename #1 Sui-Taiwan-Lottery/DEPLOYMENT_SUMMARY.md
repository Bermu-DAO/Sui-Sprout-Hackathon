# 🎯 Sui Scratch Lottery - Testnet 部署摘要

## ✅ 已完成

| 項目 | 狀態 | 詳情 |
|------|------|------|
| **Move 合約編譯** | ✅ | `contracts/lottery/sources/lottery.move` (編譯成功) |
| **官方隨機數集成** | ✅ | `sui::random::new_generator()` + `generate_u32()` |
| **前端交易層** | ✅ | `src/utils/transactions.ts` (已連接) |
| **前端 UI** | ✅ | React + TypeScript (雙語 EN/繁中) |
| **Testnet 部署** | ✅ | Package 已發佈 |
| **計劃完成度** | 95% | 待填入 Object ID 即可投入運行 |

---

## 📦 已部署的合約 ID

```
Package ID:  0x54e4ab9a7dfb6fbcf5cd0e99a697f321ee09515634b1b23a6cbfb7a477960b0c
Network:     Sui Testnet (chain-id: 4c78adac)
Built with:  Move edition 2024
```

---

## 🔍 需要完成的最後一步

### 1. 找到 Lottery Object ID

訪問 Sui Testnet Explorer：
```
https://suiscan.xyz/testnet/object/0x54e4ab9a7dfb6fbcf5cd0e99a697f321ee09515634b1b23a6cbfb7a477960b0c
```

或者直接搜索 Package ID，然後：
1. 點選「Created Objects」標籤
2. 找到類型為 `0x54e4ab9a...::scratch::ScratchLottery` 的對象
3. 複製其 Object ID

### 2. 更新 .env 檔

在 BermuDAO 根目錄創建 `.env` 檔（基於 `.env.example`）：

```bash
cp .env.example .env
```

編輯 .env：

```
VITE_SUI_NETWORK=testnet
VITE_SUI_FULLNODE_URL=https://fullnode.testnet.sui.io:443
VITE_SUI_FRAMEWORK_PACKAGE_ID=0x2
VITE_SUI_RANDOM_PACKAGE_ID=0x8
VITE_LOTTERY_PACKAGE_ID=0x54e4ab9a7dfb6fbcf5cd0e99a697f321ee09515634b1b23a6cbfb7a477960b0c
VITE_LOTTERY_OBJECT_ID=0x<YOUR_LOTTERY_OBJECT_ID>  # 從 Explorer 取得
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

訪問 http://localhost:5173

### 4. 在 UI 中測試

1. 連接您的 Sui Testnet 錢包
2. 購買刮刮樂票
3. 刮開格子
4. 領取獎金

所有交易將記錄到鏈上！

---

## 🎓 黑客松驗收清單

- ✅ **遊戲機制** - 台灣刮刮樂
- ✅ **官方隨機數** - Sui Randomness Module (0x8)
- ✅ **官方套件 ID** - Framework (0x2) + Randomness (0x8)
- ✅ **Move 合約** - 已編譯 + 已部署
- ✅ **前端整合** - React + Transaction Layer
- ✅ **雙語 UI** - 英文 + 繁體中文
- ⏳ **Testnet 測試** - 待 Object ID 更新後即可

---

## 📚 技術詳情

### Move 合約功能

1. **buy_scratch_card(lottery, random, payment, ticket_tier, player_tier)**
   - 入參：Lottery 對象、Random 模組、支付幣、票種 (0/1/2)、玩家等級 (0-3)
   - 邏輯：使用 Sui Randomness 生成 9 宮格、計算中獎倍率
   - 出參：ScratchCard 對象發送給玩家

2. **settle_scratch(lottery, card)**
   - 驗證卡狀態、領獎人身份
   - 從金庫轉出獎金到玩家

3. **new_round(lottery)**
   - 業主推進輪次

### 官方隨機數實現

```move
let mut gen = sui::random::new_generator(random, ctx);
let roll = (sui::random::generate_u32(&mut gen) as u64) % 10000;
if (roll < 300) {
    20      // 20x 中獎！
} else if (roll < 1500) {
    6       // 6x 大獎
} else if (roll < 4500) {
    150     // 1.5x 小獎
} else {
    0       // 未中獎
}
```

### 前端交易對接

```typescript
// 購買刮卡
const tx = buildBuyScratchCardTx({
  lotteryObjectId: "0x...",
  randomObjectId: "0x8",
  paymentCoinObjectId: "0x...",
  ticketTier: 1,
  playerTier: 0,
  packageId: "0x54e4ab9a..."
});
signAndExecute(tx);

// 領獎
const tx = buildSettleScratchTx({
  lotteryObjectId: "0x...",
  scratchCardObjectId: "0x...",
  packageId: "0x54e4ab9a..."
});
signAndExecute(tx);
```

---

## 🚀 下一步

1. 查尋 Lottery Object ID (3 分鐘)
2. 更新 .env 檔 (1 分鐘)
3. 啟動 npm run dev (30 秒)
4. 使用 Testnet 錢包進行測試 (随意)
5. 記錄交易 screenshot 並提交黑客松 ✨

---

## 📞 故障排除

**問題：npm run build 失敗**
- 解：`npm install` (重新安裝依賴)

**問題：連接錢包時顯示 "Network mismatch"**
- 解：確認錢包已切換至 Sui Testnet

**問題：買票時出現 "Insufficient balance"**
- 解：使用 Sui Testnet Faucet 領取測試幣：https://discord.gg/sui

**問題：找不到 ScratchLottery Object**
- 解：確認 Package ID 正確，並在 Sui Explorer 上確認已發佈

