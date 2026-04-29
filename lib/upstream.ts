const DEFAULT_UPSTREAM = 'https://sf-consumer-fe.vercel.app/api/consumer'

export interface RawTransferInfo {
  id: number
  date: string | null
  from_team_id: number | null
  to_team_id: number | null
  from_team_name: string | null
  from_team_image: string | null
  to_team_name: string | null
  to_team_image: string | null
  transfer_type: string | null
  amount: number | null
  completed: boolean
  career_ended: boolean
}

export interface RawTransferRecord {
  id: number
  player_id: string
  info: RawTransferInfo
  created_at: string
  updated_at: string
}

interface UpstreamResponse {
  data: RawTransferRecord[]
  success: boolean
  message: string
  httpStatusCode: number
}

export async function fetchTransfersFromUpstream(playerId: string): Promise<RawTransferRecord[]> {
  const url = process.env.UPSTREAM_URL || DEFAULT_UPSTREAM

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'transfers', payload: { player_id: playerId } }),
  })

  if (!response.ok) {
    throw new Error(`upstream HTTP ${response.status}`)
  }

  const json = (await response.json()) as UpstreamResponse
  if (!json.success) {
    throw new Error(`upstream payload not successful: ${json.message}`)
  }

  return Array.isArray(json.data) ? json.data : []
}
