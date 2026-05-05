import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 根據 OC/USD 價格計算動態 APY
 * 參考 staking_pool.move 的 calculate_dynamic_rate 邏輯
 * 
 * @param price OC/USD 價格（美元）
 * @returns APY 百分比（例如 12.5 代表 12.5%）
 */
export function calculateDynamicAPY(price: number): number {
  const MIN_RATE = 500;   // 5% (basis points: 500 = 5%)
  const MAX_RATE = 2000;  // 20%
  const MIN_PRICE = 0.5;  // $0.5
  const MAX_PRICE = 5.0;  // $5.0

  // 價格超過上限，返回最高利率
  if (price >= MAX_PRICE) {
    return MAX_RATE / 100;
  }
  
  // 價格低於下限，返回最低利率
  if (price <= MIN_PRICE) {
    return MIN_RATE / 100;
  }

  // 線性插值計算
  const rate = MIN_RATE + 
    ((price - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * (MAX_RATE - MIN_RATE);
  
  return rate / 100;
}

/**
 * 格式化 APY 顯示
 * @param apy APY 數值
 * @returns 格式化字串（例如 "12.50%"）
 */
export function formatAPY(apy: number): string {
  return `${apy.toFixed(2)}%`;
}
