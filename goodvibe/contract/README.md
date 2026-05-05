# GoodVibe Smart Contracts

模組化 Move 智能合約，用於基於 Stable Layer 的公益募資平台。

## 模組結構

```
contract/sources/
├── platform.move      - 平台管理和全局統計
├── project.move       - 項目創建、支持記錄、收益捐贈與提取
└── support_record.move - 用戶支持記錄（SupportRecord）
```

## 快速開始

```bash
# 編譯
sui move build

# 測試
sui move test

# 部署
sui client publish
```

## 主要功能

**Platform** - 平台初始化、統計追蹤  
**Project** - 創建項目、支持/捐贈收益、創建者提取、發布更新  
**SupportRecord** - 用戶支持記錄（持有 btcUSDC、捐贈收益給項目）  
**Vault** - 金庫、存款/提款、捐贈比例配置

## 技術特性

- Move 2024 語法
- 模組化架構，職責分明
- 泛型支援多種代幣
- 完整的事件發送
- ProjectCap 權限控制
- 餘額和百分比驗證
