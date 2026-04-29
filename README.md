# sf-transfers-api

Public REST bridge that exposes player transfer history. Wraps the
`sf-consumer-fe` upstream proxy and returns a clean, sorted, ready-to-render
JSON payload that any external site can consume directly.

## Architecture

```
[external site]
     |  GET /api/players/:playerId/transfers
     v
[sf-transfers-api]   <-- this repo, deployed on Vercel
     |  POST { path: "transfers", payload: { player_id } }
     v
[sf-consumer-fe.vercel.app/api/consumer]
     |
     v
[sf-consumer-be (Laravel) on Fly.io]  -->  Postgres
```

Two existing repos (`sf-consumer-fe`, `sf-consumer-be`) are not touched.

## Endpoints

### `GET /api/players/:playerId/transfers`

Returns the transfer history for an Opta `playerId`, ordered by date
descending.

```bash
curl https://<your-deploy>.vercel.app/api/players/atzboo800gv7gic2rgvgo0kq1/transfers
```

Response shape:

```json
{
  "player_id": "atzboo800gv7gic2rgvgo0kq1",
  "count": 4,
  "data": [
    {
      "date": "2022-07-01",
      "from_team_name": "BV Borussia 09 Dortmund",
      "from_team_image": "https://cdn.sportmonks.com/images/soccer/teams/4/68.png",
      "to_team_name": "Manchester City FC",
      "to_team_image": "https://cdn.sportmonks.com/images/soccer/teams/9/9.png",
      "transfer_type": "Transfer",
      "amount_eur": 60000000,
      "amount_m_eur": 60.0,
      "completed": true
    }
  ]
}
```

### `GET /api/health`

Liveness probe. Returns `200` with the configured upstream URL.

## Local development

```bash
npm install
npm run dev
```

This starts a standalone Node http server on `http://localhost:3000`
(via `tsx`, no Vercel CLI required). Test with:

```bash
curl http://localhost:3000/api/players/atzboo800gv7gic2rgvgo0kq1/transfers
```

The standalone server (`server.ts`) and the Vercel function handlers
(`api/*.ts`) share the same `lib/` helpers, so behaviour is identical
in dev and prod.

If you want to run the project the way Vercel will execute it (full
serverless emulation, edge cache, etc.), install the Vercel CLI and
use `npm run dev:vercel` instead.

## Deploy (Vercel)

Connect the repo to Vercel — it auto-detects the `api/` folder as
serverless functions. No env vars are required for the production
upstream; set `UPSTREAM_URL` only if pointing to a staging proxy.

## CORS

`Access-Control-Allow-Origin: *` is set on the transfers endpoint so any
domain can consume it. The endpoint is read-only and does not handle
credentials, so the open policy is intentional.

## Caching

Responses include `Cache-Control: s-maxage=300, stale-while-revalidate=600`
so Vercel's edge cache absorbs repeat requests for 5 minutes.
