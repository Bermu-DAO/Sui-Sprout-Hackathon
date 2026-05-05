#!/bin/bash

# 下載 Sui gRPC Proto 定義檔案
# 使用方式: npm run download-protos

set -e

echo "📥 Downloading Sui gRPC proto files..."

# 清理舊的 proto 檔案
if [ -d "protos" ]; then
  echo "🧹 Cleaning old proto files..."
  rm -rf protos
fi

# Clone Sui APIs repo
echo "📦 Cloning Sui APIs repository..."
git clone https://github.com/MystenLabs/sui-apis.git --depth=1 sui-apis-temp

# 建立 protos 目錄
mkdir -p protos

# 複製 proto 檔案
echo "📋 Copying proto files..."
cp -r sui-apis-temp/proto protos/

# 清理暫存
echo "🧹 Cleaning up..."
rm -rf sui-apis-temp

echo "✅ Proto files downloaded successfully!"
echo "📁 Location: $(pwd)/protos/proto/"
