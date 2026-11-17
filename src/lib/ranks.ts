export type TierId =
  | 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  | 'EMERALD' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER'

export interface Tier {
  id: TierId
  label: string
  /** Pontos (escala interna de LP absoluto) no LP 0 da divisão mais baixa do elo. */
  base: number
  /** Elos de Mestre pra cima não têm divisões. */
  divisions: number
  color: string
}

/**
 * Escala interna: 1 ponto = 1 LP. Cada divisão = 100 LP, cada elo com
 * divisões = 400 LP. Ferro IV 0 LP = 0 pontos.
 */
export const TIERS: Tier[] = [
  { id: 'IRON',        label: 'Ferro',       base: 0,    divisions: 4, color: '#6b5f55' },
  { id: 'BRONZE',      label: 'Bronze',      base: 400,  divisions: 4, color: '#a16f4a' },
  { id: 'SILVER',      label: 'Prata',       base: 800,  divisions: 4, color: '#9aa8b4' },
  { id: 'GOLD',        label: 'Ouro',        base: 1200, divisions: 4, color: '#e0a940' },
  { id: 'PLATINUM',    label: 'Platina',     base: 1600, divisions: 4, color: '#4ab5a8' },
  { id: 'EMERALD',     label: 'Esmeralda',   base: 2000, divisions: 4, color: '#3fb46a' },
  { id: 'DIAMOND',     label: 'Diamante',    base: 2400, divisions: 4, color: '#6b83e0' },
  { id: 'MASTER',      label: 'Mestre',      base: 2800, divisions: 1, color: '#9b59d0' },
  { id: 'GRANDMASTER', label: 'Grão-Mestre', base: 3300, divisions: 1, color: '#d4455b' },
  { id: 'CHALLENGER',  label: 'Desafiante',  base: 4000, divisions: 1, color: '#49c3f0' },
]

export const TIER_BY_ID: Record<TierId, Tier> = Object.fromEntries(
  TIERS.map((t) => [t.id, t]),
) as Record<TierId, Tier>

export const ROMAN = ['I', 'II', 'III', 'IV'] as const

export const MIN_POINTS = 0
export const MAX_POINTS = 5000

export function hasDivisions(tier: TierId): boolean {
  return TIER_BY_ID[tier].divisions > 1
}

/**
 * Converte elo + divisão + LP para a escala interna de pontos.
 * Divisão I é a mais alta, então ela fica no topo do intervalo do elo.
 */
export function rankToPoints(tier: TierId, division: number, lp: number): number {
  const t = TIER_BY_ID[tier]
  if (!hasDivisions(tier)) return t.base + lp
  const d = Math.min(Math.max(division, 1), 4)
  return t.base + (4 - d) * 100 + lp
}

export interface RankLabel {
  tier: Tier
  division: number | null
  lp: number
  short: string
  full: string
}

/** Inverso de rankToPoints: transforma pontos de volta em elo legível. */
export function pointsToRank(points: number): RankLabel {
  const p = Math.min(Math.max(points, MIN_POINTS), MAX_POINTS)
  let tier = TIERS[0]
  for (const t of TIERS) if (p >= t.base) tier = t

  if (!hasDivisions(tier.id)) {
    const lp = Math.round(p - tier.base)
    return {
      tier,
      division: null,
      lp,
      short: tier.label,
      full: `${tier.label} ${lp} LP`,
    }
  }

  const inside = Math.min(p - tier.base, 399)
  const division = 4 - Math.floor(inside / 100)
  const lp = Math.round(inside % 100)
  const roman = ROMAN[division - 1]
  return {
    tier,
    division,
    lp,
    short: `${tier.label} ${roman}`,
    full: `${tier.label} ${roman} · ${lp} LP`,
  }
}

/** Diferença em divisões (100 LP = 1 divisão). */
export function pointsToDivisions(delta: number): number {
  return delta / 100
}
