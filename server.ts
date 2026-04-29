// Standalone Node http server that mirrors the Vercel function handlers.
// Lets contributors run `npm run dev` without installing the Vercel CLI
// or linking the repo to a Vercel account. The Vercel handlers under
// `api/` remain the canonical entry points for production deploys —
// this file only re-uses the same lib/ helpers so behaviour stays in
// sync.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { fetchTransfersFromUpstream } from './lib/upstream.js'
import { transformTransfers } from './lib/transform.js'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

const TRANSFERS_PATH = /^\/api\/players\/([^/]+)\/transfers\/?$/

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(body))
}

async function route(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }).end()
    return
  }

  const url = req.url ?? '/'

  if (req.method === 'GET' && url === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'sf-transfers-api',
      upstream: process.env.UPSTREAM_URL || 'https://sf-consumer-fe.vercel.app/api/consumer',
    })
    return
  }

  const match = url.match(TRANSFERS_PATH)
  if (req.method === 'GET' && match) {
    const playerId = decodeURIComponent(match[1])
    try {
      const records = await fetchTransfersFromUpstream(playerId)
      const transfers = transformTransfers(records)
      sendJson(res, 200, {
        player_id: playerId,
        count: transfers.length,
        data: transfers,
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'unknown_error'
      sendJson(res, 502, { error: 'upstream_failed', detail })
    }
    return
  }

  sendJson(res, 404, { error: 'not_found' })
}

const server = createServer((req, res) => {
  route(req, res).catch(err => {
    const detail = err instanceof Error ? err.message : 'unknown_error'
    sendJson(res, 500, { error: 'internal_error', detail })
  })
})

server.listen(PORT, () => {
  console.log(`sf-transfers-api listening on http://localhost:${PORT}`)
  console.log(`  GET /api/health`)
  console.log(`  GET /api/players/:playerId/transfers`)
})
