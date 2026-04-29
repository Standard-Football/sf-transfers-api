import type { RawTransferRecord } from './upstream.js'

export interface PublicTransfer {
  date: string | null
  from_team_name: string | null
  from_team_image: string | null
  to_team_name: string | null
  to_team_image: string | null
  transfer_type: string | null
  amount_eur: number | null
  amount_m_eur: number | null
  completed: boolean
}

export function transformTransfers(records: RawTransferRecord[]): PublicTransfer[] {
  return records
    .map(r => ({
      date: r.info.date,
      from_team_name: r.info.from_team_name,
      from_team_image: r.info.from_team_image,
      to_team_name: r.info.to_team_name,
      to_team_image: r.info.to_team_image,
      transfer_type: r.info.transfer_type,
      amount_eur: r.info.amount,
      amount_m_eur: r.info.amount != null ? r.info.amount / 1_000_000 : null,
      completed: r.info.completed,
    }))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}
