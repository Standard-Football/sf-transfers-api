// Stats variant of `lib/upstream.ts` — same proxy endpoint, same auth
// posture, different `path` keyword. Kept in a separate file so the
// raw shapes the upstream returns (deeply nested, very different from
// the transfer payload) don't leak into the transfer types.

const DEFAULT_UPSTREAM = 'https://sf-consumer-fe.vercel.app/api/consumer'

export interface RawStatDetail {
  type_id: number
  type: {
    id: number
    code: string
    name: string
    developer_name: string
    stat_group: string | null
  }
  // Sportmonks uses different shapes per metric:
  //   {total: N}                                 — counters
  //   {in: N, out: N}                            — substitutions
  //   {average: N, highest: N, lowest: N}        — rating, percentages
  //   {home: N, away: N}                         — splits (rare)
  // Keeping the value loose here lets the transformer pick whichever
  // field is meaningful for each metric.
  value: Record<string, number>
}

export interface RawStatRecord {
  id: number
  player_id: string
  info: {
    id: number
    team_id: number | null
    has_values: boolean
    position_id: number | null
    jersey_number: number | null
    season: {
      id: number
      league_id: number | null
      name: string
      starting_at: string | null
      ending_at: string | null
      league: {
        id: number
        name: string
        image_path: string | null
        type: string | null
      }
    }
    details: RawStatDetail[]
  }
}

interface UpstreamResponse {
  data: RawStatRecord[]
  success: boolean
  message: string
  httpStatusCode: number
}

export async function fetchStatsFromUpstream(playerId: string): Promise<RawStatRecord[]> {
  const url = process.env.UPSTREAM_URL || DEFAULT_UPSTREAM

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'statistics', payload: { player_id: playerId } }),
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
