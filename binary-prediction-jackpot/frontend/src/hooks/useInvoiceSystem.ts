import { useQuery } from '@tanstack/react-query'
import { suiClient } from '../lib/sui'
import { INVOICE_SYSTEM_ID, TREASURY_ID } from '../lib/constants'
import type { InvoiceSystemData, TreasuryData } from '../types'

async function fetchInvoiceSystem(): Promise<InvoiceSystemData> {
  const obj = await suiClient.getObject({
    id: INVOICE_SYSTEM_ID,
    options: { showContent: true },
  })
  const fields = (obj.data!.content as { fields: Record<string, unknown> }).fields
  return {
    id: INVOICE_SYSTEM_ID,
    invoice_count: Number(fields.invoice_count),
    winner_number: Number(fields.winner_number),
    jackpot_timestamp: Number(fields.jackpot_timestamp),
  }
}

async function fetchTreasury(): Promise<TreasuryData> {
  const obj = await suiClient.getObject({
    id: TREASURY_ID,
    options: { showContent: true },
  })
  const fields = (obj.data!.content as { fields: Record<string, unknown> }).fields
  const pool = fields.pool as { fields: { balance: string } }
  return {
    id: TREASURY_ID,
    pool_balance: Number(pool?.fields?.balance ?? 0),
  }
}

export function useInvoiceSystem() {
  const system = useQuery({
    queryKey: ['invoiceSystem'],
    queryFn: fetchInvoiceSystem,
    refetchInterval: 10_000,
  })
  const treasury = useQuery({
    queryKey: ['treasury'],
    queryFn: fetchTreasury,
    refetchInterval: 10_000,
  })
  return { system, treasury }
}
