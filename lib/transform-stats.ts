// Maps the Sportmonks per-season player statistics payload to the shape
// the BI 2.0 frontend (`AdvancedStats`) consumes. Two responsibilities:
//   1. translate codified `type.code` strings into named struct fields
//   2. collapse multiple records sharing the same (season, league) — for
//      players who switched club mid-season — into a single sum so the
//      season selector doesn't double-list the same competition.

import type { RawStatDetail, RawStatRecord } from './upstream-stats.js'

export interface AdvancedStats {
  season: string
  league: string
  league_id: number | null
  team_id: number | null
  minutesPlayed: number
  appearances: number
  lineups: number
  shots: {
    goals: number
    shotsTotal: number
    shotsOffTarget: number
    blockedShots: number
    bigChancesCreated: number
    bigChancesMissed: number
  }
  passes: {
    assists: number
    passes: number
    accuratePasses: number
    keyPasses: number
    totalCrosses: number
    accurateCrosses: number
  }
  duels: {
    yellowCards: number
    redCards: number
    fouls: number
    clearances: number
    totalDuels: number
    duelsWon: number
  }
  dribbles: {
    dribbleAttempts: number
    successfulDribbles: number
    dribbledPast: number
    foulsDrawn: number
    dispossessed: number
    bigChancesCreated: number
  }
}

// Most metrics ship as `{total: N}`; a few (rating, percentages) as
// `{average, highest, lowest}` and substitutions as `{in, out}`. For
// the metrics we surface in the BI 2.0 panel, `total` is the only
// meaningful field — fall back to 0 when the upstream omits it.
function num(detail: RawStatDetail | undefined): number {
  if (!detail) return 0
  const v = detail.value
  if (v == null) return 0
  if (typeof v.total === 'number') return v.total
  // `minutes-played` and `rating` sometimes ship as numeric scalar in
  // legacy seasons — accept that too rather than dropping the value.
  if (typeof v.average === 'number') return v.average
  return 0
}

function indexDetails(record: RawStatRecord): Map<string, RawStatDetail> {
  const map = new Map<string, RawStatDetail>()
  for (const d of record.info.details ?? []) {
    if (d.type?.code) map.set(d.type.code, d)
  }
  return map
}

function buildFromRecord(record: RawStatRecord): AdvancedStats {
  const idx = indexDetails(record)
  const get = (code: string) => num(idx.get(code))
  return {
    season: record.info.season?.name ?? '',
    league: record.info.season?.league?.name ?? '',
    league_id: record.info.season?.league?.id ?? null,
    team_id: record.info.team_id ?? null,
    minutesPlayed: get('minutes-played'),
    appearances: get('appearances'),
    lineups: get('lineups'),
    shots: {
      goals: get('goals'),
      shotsTotal: get('shots-total'),
      shotsOffTarget: get('shots-off-target'),
      // Sportmonks splits "shots blocked" two ways: `shots-blocked` is
      // the offensive stat (this player's shots being blocked) and
      // `blocked-shots` is the defensive stat (this player blocking
      // others' shots). The BI 2.0 "Shots" group is offensive-leaning
      // — so we mirror the offensive metric here.
      blockedShots: get('shots-blocked'),
      bigChancesCreated: get('big-chances-created'),
      bigChancesMissed: get('big-chances-missed'),
    },
    passes: {
      assists: get('assists'),
      passes: get('passes'),
      accuratePasses: get('accurate-passes'),
      keyPasses: get('key-passes'),
      totalCrosses: get('total-crosses'),
      accurateCrosses: get('accurate-crosses'),
    },
    duels: {
      yellowCards: get('yellowcards'),
      redCards: get('redcards'),
      fouls: get('fouls'),
      clearances: get('clearances'),
      totalDuels: get('total-duels'),
      duelsWon: get('duels-won'),
    },
    dribbles: {
      dribbleAttempts: get('dribble-attempts'),
      successfulDribbles: get('successful-dribbles'),
      dribbledPast: get('dribbled-past'),
      foulsDrawn: get('fouls-drawn'),
      dispossessed: get('dispossessed'),
      bigChancesCreated: get('big-chances-created'),
    },
  }
}

function addInto(acc: AdvancedStats, b: AdvancedStats): AdvancedStats {
  acc.minutesPlayed += b.minutesPlayed
  acc.appearances += b.appearances
  acc.lineups += b.lineups
  for (const k of Object.keys(acc.shots) as (keyof AdvancedStats['shots'])[]) {
    acc.shots[k] += b.shots[k]
  }
  for (const k of Object.keys(acc.passes) as (keyof AdvancedStats['passes'])[]) {
    acc.passes[k] += b.passes[k]
  }
  for (const k of Object.keys(acc.duels) as (keyof AdvancedStats['duels'])[]) {
    acc.duels[k] += b.duels[k]
  }
  for (const k of Object.keys(acc.dribbles) as (keyof AdvancedStats['dribbles'])[]) {
    acc.dribbles[k] += b.dribbles[k]
  }
  return acc
}

export function transformStats(records: RawStatRecord[]): AdvancedStats[] {
  // Skip empty seasons (Sportmonks returns shells for upcoming seasons
  // before any match is played — has_values=false).
  const playable = records.filter(r => r.info?.has_values !== false)

  const merged = new Map<string, AdvancedStats>()
  for (const r of playable) {
    const built = buildFromRecord(r)
    const key = `${built.season}::${built.league}`
    const existing = merged.get(key)
    if (existing) {
      addInto(existing, built)
    } else {
      merged.set(key, built)
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    // Newest seasons first; within a season, league order is stable
    // because Map preserves insertion order from upstream.
    if (a.season === b.season) return 0
    return a.season < b.season ? 1 : -1
  })
}
