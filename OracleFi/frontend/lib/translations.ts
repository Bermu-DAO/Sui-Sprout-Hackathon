export type StructuredParams = Record<string, string | number>;

export const translations = {
  en: {
    nav: {
      adminDashboard: "Admin Dashboard",
      backToStaking: "Back to Staking Pool",
      oraclefi: "OracleFi",
      connect: "Connect",
    },
    home: {
      title: "Stake OC, Earn Yield",
      subtitle: "Experience the next generation of dynamic APY powered by real-time oracle price feeds on the Sui blockchain.",
    },
    stats: {
      totalStaked: "Total Staked",
      poolWideStaked: "Pool wide staked tokens",
      rewardBalance: "Reward Balance",
      totalRewardsReady: "Total rewards ready",
      myStaked: "My Staked",
      yourActiveStake: "Your active stake",
      pendingRewards: "Pending Rewards",
      yourUnclaimedRewards: "Your unclaimed rewards",
      currentPrice: "Current OC Price",
      oraclePriceFeed: "Oracle price feed",
      live: "Live",
      currentAPY: "Current APY",
      dynamicRate: "Dynamic rate",
      priceDriven: "Price-driven",
    },
    stake: {
      title: "Stake OC",
      available: "Available",
      objects: "objects",
      amount: "Amount",
      max: "Max",
      stakeAction: "Stake",
      success: "Staked successfully!",
      failed: "Failed to stake",
      connectWallet: "Connect Wallet",
      staking: "Staking...",
    },
    withdraw: {
      title: "Withdraw OC",
      stakedBalance: "Staked Balance",
      amount: "Amount",
      max: "Max",
      withdrawAction: "Withdraw",
      success: "Withdrawn successfully!",
      failed: "Failed to withdraw",
      connectWallet: "Connect Wallet",
      withdrawing: "Withdrawing...",
    },
    claim: {
      title: "Rewards",
      claimPending: "Claim your pending yield",
      claimAction: "Claim Rewards",
      success: "Rewards claimed successfully!",
      failed: "Failed to claim rewards",
    },
    admin: {
      title: "OracleFi Admin Dashboard",
      subtitle: "Manage staking pool, token supply, and price oracle",
      demoMode: "Demo Mode",
      demoModeSubtitle: "You are currently in demo mode. Actual operations require the AdminCap NFT. This page demonstrates the full admin interface design.",
      accessGranted: "Admin Access Granted",
      accessGrantedSubtitle: "You hold the AdminCap NFT and can perform all management operations.",
      holdCaps: "Holding",
      adminCaps: "AdminCaps",
      missingCapTitle: "Missing AdminCap",
      missingCapSubtitle: "You might experience transaction failures as you do not hold the required capabilities.",
      fundPool: "Fund Reward Pool",
      fundPoolDesc: "Inject more OC into the staking reward pool.",
      amount: "Amount",
      fundAction: "Fund Rewards",
      updatePrice: "Update OC Price",
      updatePriceDesc: "Update the Oracle price feed for OC/USD",
      newPrice: "New Price (USD)",
      updateAction: "Update Price",
      mintOC: "Mint OC Tokens",
      mintOCDesc: "Admin action to mint new Oracle Coins",
      limitWarning: "⚠️ Note: Maximum 1,000,000,000 OC per transaction",
      recipient: "Recipient Address",
      mintAmount: "Mint Amount",
      mintAction: "Mint",
    },
    toasts: {
      txSuccessful: "Transaction successful",
      txFailed: "Transaction failed",
      insufficientBalance: "Insufficient balance",
      connectWallet: "Please connect wallet",
      processing: "Processing transaction...",
      enterAmount: "Please enter a valid amount",
      priceUpdated: "Price updated successfully!",
      rewardFunded: "Reward funded successfully!",
      ocMinted: "OC minted successfully!",
      amountExceedsLimit: "Amount exceeds limit",
    },
    faucet: {
      button: "Get {amount} Test OC",
      claiming: "Claiming...",
      connectFirst: "Please connect wallet first",
      waitMinutes: "Please wait {minutes} minute(s) before next claim",
      success: "{amount} OC claimed successfully!",
      failed: "Claim failed. Please try again."
    }
  },
  zh: {
    nav: {
      adminDashboard: "管理後台",
      backToStaking: "返回質押池",
      oraclefi: "OracleFi",
      connect: "連接錢包",
    },
    home: {
      title: "質押 OC，賺取收益",
      subtitle: "體驗由 Sui 區塊鏈上即時預言機價格驅動的新世代動態年化收益率。",
    },
    stats: {
      totalStaked: "池總質押量",
      poolWideStaked: "資金池全域質押代幣",
      rewardBalance: "獎勵餘額",
      totalRewardsReady: "目前可用獎勵總額",
      myStaked: "我的質押",
      yourActiveStake: "您目前的活躍質押",
      pendingRewards: "待領獎勵",
      yourUnclaimedRewards: "您尚未領取的獎勵",
      currentPrice: "當前 OC 價格",
      oraclePriceFeed: "預言機價格推播",
      live: "即時",
      currentAPY: "當前年化收益率",
      dynamicRate: "動態費率",
      priceDriven: "價格驅動",
    },
    stake: {
      title: "質押 OC",
      available: "可用餘額",
      objects: "個物件",
      amount: "數量",
      max: "最大",
      stakeAction: "質押",
      success: "質押成功！",
      failed: "質押失敗",
      connectWallet: "連接錢包",
      staking: "質押中...",
    },
    withdraw: {
      title: "提取 OC",
      stakedBalance: "已質押餘額",
      amount: "數量",
      max: "最大",
      withdrawAction: "提取",
      success: "提取成功！",
      failed: "提取失敗",
      connectWallet: "連接錢包",
      withdrawing: "提取中...",
    },
    claim: {
      title: "收益獎勵",
      claimPending: "領取您目前的待領取收益",
      claimAction: "領取獎勵",
      success: "獎勵領取成功！",
      failed: "獎勵領取失敗",
    },
    admin: {
      title: "OracleFi 管理後台",
      subtitle: "管理質押池、代幣供應和價格預言機",
      demoMode: "展示模式",
      demoModeSubtitle: "你目前處於展示模式。實際操作需要持有 AdminCap NFT。此頁面展示完整的管理員介面設計。",
      accessGranted: "管理員授權通過",
      accessGrantedSubtitle: "你持有 AdminCap NFT，可以執行所有管理操作。",
      holdCaps: "持有",
      adminCaps: "個 AdminCap",
      missingCapTitle: "缺少權限",
      missingCapSubtitle: "您並未持有合規的權限物件，可能導致交易失敗。",
      fundPool: "注資獎勵池",
      fundPoolDesc: "將更多 OC 註入質押獎勵池中。",
      amount: "數量",
      fundAction: "注資獎勵",
      updatePrice: "更新 OC 價格",
      updatePriceDesc: "更新 OC/USD 的預言機價格",
      newPrice: "新價格 (USD)",
      updateAction: "更新價格",
      mintOC: "鑄造 OC 代幣",
      mintOCDesc: "管理員鑄造新的 Oracle Coin",
      limitWarning: "⚠️ 注意：單次最高上限 1,000,000,000 OC",
      recipient: "接收地址",
      mintAmount: "鑄造數量",
      mintAction: "確認鑄造",
    },
    toasts: {
      txSuccessful: "交易成功",
      txFailed: "交易失敗",
      insufficientBalance: "餘額不足",
      connectWallet: "請先連接錢包",
      processing: "交易處理中...",
      enterAmount: "請輸入有效的數量",
      priceUpdated: "價格更新成功！",
      rewardFunded: "獎勵注資成功！",
      ocMinted: "OC 鑄造成功！",
      amountExceedsLimit: "超過鑄造上限",
    },
    faucet: {
      button: "領取 {amount} 測試 OC",
      claiming: "領取中...",
      connectFirst: "請先連接錢包",
      waitMinutes: "請等待 {minutes} 分鐘後再次領取",
      success: "成功領取 {amount} OC！",
      failed: "領取失敗，請重試"
    }
  }
};

type NestedKeyOf<ObjectType extends object> = 
  {[Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
  }[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof translations.en>;

export const getTranslation = (lang: 'en' | 'zh', key: string, params?: Record<string, string | number>): string => {
  const keys = key.split('.');
  let current: any = translations[lang];
  for (const k of keys) {
    if (current[k] === undefined) {
      return key; // fallback to key
    }
    current = current[k];
  }

  let result = current as string;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{${k}}`, 'g'), String(v));
    });
  }

  return result;
};
