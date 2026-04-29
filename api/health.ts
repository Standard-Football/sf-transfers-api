import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json({
    status: 'ok',
    service: 'sf-transfers-api',
    upstream: process.env.UPSTREAM_URL || 'https://sf-consumer-fe.vercel.app/api/consumer',
  })
}
