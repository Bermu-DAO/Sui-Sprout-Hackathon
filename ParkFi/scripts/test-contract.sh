#!/bin/bash

# 停車場 RWA 合約測試腳本
# 使用方法: ./scripts/test-contract.sh

set -e

# 自動讀取 .env 檔案
if [ -f .env ]; then
    echo "📄 正在讀取 .env 設定..."
    set -a # 自動 export 讀取到的變數
    source .env
    set +a
fi

echo "🚀 停車場 RWA 系統測試腳本"
echo "================================"
echo ""
echo "📋 角色說明："
echo "  - Operator: 營運商（鑄造並出售停車格）"
echo "  - Alice: 用戶（購買停車格獲得收益）"
echo "  - Bob: 駕駛人（支付停車費）"
echo ""

# 檢查環境變數
if [ -z "$PACKAGE_ID" ]; then
    echo "❌ 請先設置環境變數"
    echo ""
    echo "範例："
    echo "  export PACKAGE_ID=0x..."
    echo "  export OPERATOR_ADDRESS=0x..."
    echo "  export ALICE_ADDRESS=0x..."
    echo "  export BOB_ADDRESS=0x..."
    exit 1
fi

echo "📦 合約資訊："
echo "  PACKAGE_ID: $PACKAGE_ID"
echo "  OPERATOR: $OPERATOR_ADDRESS"
echo "  ALICE: $ALICE_ADDRESS"
echo "  BOB: $BOB_ADDRESS"
echo ""

read -p "按 Enter 開始測試..."
echo ""

# ============================================
# 步驟 1: Operator 創建停車場
# ============================================
echo "1️⃣ [Operator] 創建停車場 (ParkingLot)..."
echo "--------------------------------------------"

CREATE_LOT_OUTPUT=$(sui client call \
    --package "$PACKAGE_ID" \
    --module parking_rwa \
    --function create_lot \
    --gas-budget 10000000 2>&1)

echo "$CREATE_LOT_OUTPUT"
echo ""

# 嘗試自動提取 LOT_ID（查找 Created Objects 部分）
if [ -z "$LOT_ID" ]; then
    echo "🔍 正在嘗試自動提取 LOT_ID..."
    # 提取 objectId（通常在 Created Objects 部分）
    EXTRACTED_LOT_ID=$(echo "$CREATE_LOT_OUTPUT" | grep -A 5 "Created Objects" | grep "objectId" | head -1 | sed 's/.*objectId": "\([^"]*\)".*/\1/')

    if [ -n "$EXTRACTED_LOT_ID" ]; then
        LOT_ID=$EXTRACTED_LOT_ID
        echo "✅ 自動提取到 LOT_ID: $LOT_ID"
    else
        echo "⚠️  無法自動提取 LOT_ID"
        echo "   請手動從上面的輸出中複製 ParkingLot 的 Object ID"
        echo ""
        read -p "請輸入 LOT_ID: " LOT_ID

        if [ -z "$LOT_ID" ]; then
            echo "❌ LOT_ID 不能為空"
            exit 1
        fi
    fi
else
    echo "✅ 使用環境變數中的 LOT_ID: $LOT_ID"
fi

echo ""

# ============================================
# 步驟 2: Operator 鑄造停車格並設定售價
# ============================================
echo "2️⃣ [Operator] 鑄造停車格 NFT（位置：A1，售價：10 IOTA）..."
echo "--------------------------------------------"
echo "說明："
echo "  - 停車格位置: A1"
echo "  - 每小時停車費: 1 IOTA (1,000,000,000 MIST)"
echo "  - 初始售價: 10 IOTA (10,000,000,000 MIST)"
echo ""

MINT_OUTPUT=$(sui client call \
    --package "$PACKAGE_ID" \
    --module parking_rwa \
    --function mint_space \
    --args "$LOT_ID" "A1" 1000000000 10000000000 \
    --gas-budget 10000000 2>&1)

echo "$MINT_OUTPUT"
echo ""

# 嘗試自動提取 SPACE_ID
if [ -z "$SPACE_ID" ]; then
    echo "🔍 正在嘗試自動提取 SPACE_ID..."
    # 提取 objectId（ParkingSpace）
    EXTRACTED_SPACE_ID=$(echo "$MINT_OUTPUT" | grep -A 5 "Created Objects" | grep "objectId" | head -1 | sed 's/.*objectId": "\([^"]*\)".*/\1/')

    if [ -n "$EXTRACTED_SPACE_ID" ]; then
        SPACE_ID=$EXTRACTED_SPACE_ID
        echo "✅ 自動提取到 SPACE_ID: $SPACE_ID"
    else
        echo "⚠️  無法自動提取 SPACE_ID"
        echo "   請手動從上面的輸出中複製 ParkingSpace 的 Object ID"
        echo ""
        read -p "請輸入 SPACE_ID: " SPACE_ID

        if [ -z "$SPACE_ID" ]; then
            echo "❌ SPACE_ID 不能為空"
            exit 1
        fi
    fi
else
    echo "✅ 使用環境變數中的 SPACE_ID: $SPACE_ID"
fi

echo ""

# ============================================
# 步驟 3: Alice 購買停車格
# ============================================
echo "3️⃣ [Alice] 購買停車格（支付 10 IOTA 給 Operator）..."
echo "--------------------------------------------"
echo "說明："
echo "  - Alice 支付 10 IOTA"
echo "  - Operator 收到 10 IOTA"
echo "  - Alice 成為停車格所有者，開始獲得收益分潤"
echo ""

echo "⚠️  請切換到 Alice 的錢包執行以下命令："
echo ""
echo "sui client ptb \\"
echo "  --split-coins gas '[10000000000]' \\"
echo "  --assign payment \\"
echo "  --move-call $PACKAGE_ID::parking_rwa::purchase_space @$SPACE_ID payment \\"
echo "  --gas-budget 20000000"
echo ""
read -p "執行完成後按 Enter 繼續..."
echo ""

# ============================================
# 步驟 4: Bob 支付停車費（2小時）
# ============================================
echo "4️⃣ [Bob] 支付停車費（2 小時）..."
echo "--------------------------------------------"
echo "說明："
echo "  - Bob 支付 2 IOTA (2小時 × 1 IOTA/小時)"
echo "  - 1.6 IOTA (80%) 給 Operator"
echo "  - 0.4 IOTA (20%) 給 Alice"
echo ""

echo "⚠️  請切換到 Bob 的錢包執行以下命令："
echo ""
echo "sui client ptb \\"
echo "  --split-coins gas '[2000000000]' \\"
echo "  --assign payment \\"
echo "  --move-call $PACKAGE_ID::parking_rwa::pay_for_parking @$LOT_ID @$SPACE_ID 2 payment \\"
echo "  --gas-budget 20000000"
echo ""
read -p "執行完成後按 Enter 繼續..."
echo ""

# ============================================
# 步驟 5: 查詢停車格狀態
# ============================================
echo "5️⃣ 查詢停車格當前狀態..."
echo "--------------------------------------------"
sui client object "$SPACE_ID"
echo ""

# ============================================
# 測試完成
# ============================================
echo "✅ 測試流程完成！"
echo ""
echo "📊 測試摘要："
echo "  1. Operator 創建停車場並鑄造停車格 ✅"
echo "  2. Alice 購買停車格成為所有者 ✅"
echo "  3. Bob 支付停車費，收益自動分潤 ✅"
echo ""
echo "💰 收益分配："
echo "  - Operator: 獲得 10 IOTA (銷售) + 1.6 IOTA (80%% 分潤)"
echo "  - Alice: 獲得 0.4 IOTA (20%% 分潤)"
echo ""

# 儲存 ID 到 .env（如果不存在的話）
if [ -f .env ]; then
    echo "📝 更新 .env 檔案..."
    # 備份原有的 .env
    cp .env .env.backup

    # 更新或添加 PACKAGE_ID
    if grep -q "^PACKAGE_ID=" .env; then
        sed -i.bak "s|^PACKAGE_ID=.*|PACKAGE_ID=$PACKAGE_ID|" .env
    else
        echo "PACKAGE_ID=$PACKAGE_ID" >> .env
    fi

    # 添加 LOT_ID（如果不存在）
    if ! grep -q "^LOT_ID=" .env; then
        echo "LOT_ID=$LOT_ID" >> .env
    fi

    # 添加 SPACE_ID（如果不存在）
    if ! grep -q "^SPACE_ID=" .env; then
        echo "SPACE_ID=$SPACE_ID" >> .env
    fi

    rm -f .env.bak
    echo "✅ .env 檔案已更新"
else
    echo "⚠️  .env 檔案不存在，跳過儲存"
fi

echo ""
echo "📝 重要資訊："
echo "  PACKAGE_ID: $PACKAGE_ID"
echo "  LOT_ID: $LOT_ID"
echo "  SPACE_ID: $SPACE_ID"
echo ""
echo "🔧 請將以下資訊更新到 frontend/src/constants/ids.ts:"
echo ""
echo "export const PACKAGE_ID = \"$PACKAGE_ID\";"
echo "export const LOT_ID = \"$LOT_ID\";"
echo ""
