import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchTransfersFromUpstream } from '../../../lib/upstream.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const raw = req.query.playerId
  const playerId = Array.isArray(raw) ? raw[0] : raw
  if (!playerId || typeof playerId !== 'string') {
    return res.status(400).json({ error: 'playerId_required' })
  }

  try {
    const records = await fetchTransfersFromUpstream(playerId)

    const transfers = records
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

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json({
      player_id: playerId,
      count: transfers.length,
      data: transfers,
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown_error'
    return res.status(502).json({ error: 'upstream_failed', detail })
  }
}
