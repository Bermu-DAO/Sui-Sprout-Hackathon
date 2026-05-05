# Hackathon 評審玩家操作流程（5-8 分鐘）

這份文件給評審直接照著操作，快速完成一輪「購票 -> 刮卡 -> 領獎」，並驗證官方加分整合。

線上評測站：
https://sui-taiwan-lottery-review.vercel.app

## 目標

1. 完成一輪鏈上刮刮樂交易
2. 若中獎，完成領獎交易
3. 驗證官方模組整合證據（Randomness 0x8 + onchain_invoice）

## 前置條件（1 分鐘）

1. 錢包切到 Sui Testnet
2. 錢包有至少 0.05 SUI gas
3. 進入線上評測站並連接錢包

## 評審操作流程

1. 連接錢包
- 點 Connect Wallet
- 預期：右上角顯示地址、SUI 與 TWD 餘額

2. 領可玩資金
- 點上方「補 1000 台幣」
- 如 SUI gas 不足，先點「領 SUI 測試幣」

3. 購買一張票
- 任選 NT$200 / NT$500 / NT$2000
- 點購買並在錢包簽名
- 預期：彈出刮卡視窗

4. 刮卡與結算
- 刮開到 56% 以上自動揭曉
- 若中獎，點「領取獎金」並簽名

## 30 秒加分驗證清單（重點）

請評審在錢包或 explorer 檢查同一輪操作至少看到下列交易呼叫：

1. 主遊戲交易
- scratch::buy_scratch_card

2. 官方加分流程（購票後自動嘗試）
- onchain_invoice::usdc::faucet
- onchain_invoice::tax_coin::buy_quota
- onchain_invoice::invoice::init_invoice

註：如果評審使用的是一般玩家錢包，這段加分交易會自動跳過，不影響主遊戲。
若要實際看到它成功，請用 owner 錢包示範一次。

3. 若中獎再看
- scratch::settle_scratch

## 評審可貼上的證據欄位

1. 買票交易 digest：____________
2. 發票 one-stop 交易 digest：____________
3. 領獎交易 digest（可選）：____________
4. Explorer 截圖連結（可選）：____________

## 官方整合基準（本專案）

1. 官方 Randomness：0x8
2. 官方 onchain_invoice Package：
0xd491b1d70980b0efba4bc6664956baf18eede0b60dc67ee440af8ae82d9009bc
3. 已設定並使用的關鍵物件：
- invoice::System
0xb020d9487d1d7506fb920f5a3fb0657b9f2031351f44a5d822901b983e39cf09
- treasury::Treasury
0x27da9319228bb1e6c53b822cca29245119e9986dccfbe7855ca0d9130a481a00

## 常見狀況與排查

1. 發放失敗
- 先確認錢包在 Testnet
- 先確認有 SUI gas

2. 管理按鈕沒顯示
- 需使用合約 owner 錢包

3. 發票流程失敗
- 不阻斷主遊戲
- 可先完成主遊戲交易，再補查 one-stop 發票交易
- 一般玩家錢包會自動跳過 owner-only 的 bonus demo，這是預期行為

## 評審快速結論模板

1. 已完成錢包連線、購票、刮卡流程
2. 已看到鏈上 buy_scratch_card 呼叫
3. 已看到或成功重現 onchain_invoice 一站式流程呼叫
4. 已確認專案整合官方 package 與可操作性
