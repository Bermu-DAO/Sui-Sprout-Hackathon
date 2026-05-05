export interface EventData {
  id: string
  question: string
  close_time: number // ms timestamp
  state: number // 0=Open, 1=Proposed, 2=Resolved
  final_outcome: number // 0=Unresolved, 1=Yes, 2=No, 3=Invalid
  proposed_outcome: number
  proposed_at: number
  can_finalize_at: number
  yes_pool: number
  no_pool: number
  total_pool_snapshot: number
  winning_pool_snapshot: number
}

export interface PositionData {
  id: string
  event_id: string
  side: number // 0=YES, 1=NO
  amount: number
}

export interface InvoiceData {
  id: string
  invoice_number: number
  amount: number
  timestamp: number
}

export interface InvoiceSystemData {
  id: string
  invoice_count: number
  winner_number: number
  jackpot_timestamp: number
}

export interface TreasuryData {
  id: string
  pool_balance: number
}
