export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  creator: string;
  raisedAmount: bigint;
  supporterCount: number;
  totalSupportAmount?: bigint;
  balance?: bigint;
  isActive?: boolean;
  createdAt?: bigint;
  /** The coin type T this project is parameterised over (e.g. 0x…::btc_usdc::BtcUSDC) */
  coinType?: string;
}
