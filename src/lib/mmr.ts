import {
  MAX_POINTS,
  MIN_POINTS,
  pointsToRank,
  rankToPoints,
  type RankLabel,
  type TierId,
} from './ranks'

export interface MmrInput {
  tier: TierId
  division: number
  lp: number
  /** LP médio ganho por vitória nas últimas partidas. */
  avgGain: number
  /** LP médio perdido por derrota (valor positivo). */
  avgLoss: number
  wins: number
  losses: number
}

export type VerdictLevel = 'muito-acima' | 'acima' | 'alinhado' | 'abaixo' | 'muito-abaixo'

export interface MmrResult {
  rankPoints: number
  mmrPoints: number
  /** mmrPoints - rankPoints, em LP. */
  delta: number
  divisions: number
  rankLabel: RankLabel
  mmrLabel: RankLabel
  verdict: VerdictLevel
  verdictTitle: string
  verdictText: string
  /** 0 a 1. */
  confidence: number
  confidenceLabel: string
  signals: {
    lpOffset: number | null
    winrateOffset: number | null
    winrate: number | null
    games: number
  }
  /** LP que você tende a ganhar/perder quando o MMR encostar no elo. */
  equilibrium: { gain: number; loss: number }
  /** Projeção especulativa de onde o soft reset de 2027 deve te colocar. */
  reset: { label: RankLabel; points: number }
}

/**
 * Quanto a assimetria de LP vale em LP de MMR.
 * +30/-10 (razão 0.75) => +250 LP de MMR, ou seja 2,5 divisões acima do elo.
 */
const LP_ASYMMETRY_SCALE = 1000
const LP_OFFSET_CAP = 600

/** Converte pontos de Elo (fórmula clássica) para a escala de LP do app. */
const ELO_TO_LP = 2
const WINRATE_OFFSET_CAP = 400

/** Nº de partidas em que cada sinal passa a ser considerado confiável. */
const LP_SAMPLE_HALF = 10
const WR_SAMPLE_HALF = 40

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

/**
 * Sinal principal: a Riot ajusta o LP ganho/perdido pela distância entre o seu
 * MMR e o seu elo. Ganhar muito mais do que perde = MMR acima do elo.
 */
export function lpAsymmetryOffset(avgGain: number, avgLoss: number): number | null {
  const total = avgGain + avgLoss
  if (!Number.isFinite(total) || total <= 0) return null
  const ratio = avgGain / total
  return clamp((ratio - 0.5) * LP_ASYMMETRY_SCALE, -LP_OFFSET_CAP, LP_OFFSET_CAP)
}

/**
 * Sinal secundário: o matchmaking tende a te empurrar para 50% de winrate.
 * Winrate sustentada acima disso indica MMR maior do que o elo mostra.
 */
export function winrateOffset(wins: number, losses: number): number | null {
  const games = wins + losses
  if (games < 5) return null
  const wr = clamp(wins / games, 0.03, 0.97)
  const elo = -400 * Math.log10(1 / wr - 1)
  return clamp(elo * ELO_TO_LP, -WINRATE_OFFSET_CAP, WINRATE_OFFSET_CAP)
}

function verdictFor(delta: number): { level: VerdictLevel; title: string; text: string } {
  if (delta >= 175)
    return {
      level: 'muito-acima',
      title: 'Seu MMR está bem acima do seu elo',
      text: 'Você está jogando num nível bem mais alto do que o elo indica. O sistema ainda está te corrigindo pra cima: continue jogando que a subida é rápida e os ganhos de LP seguem altos.',
    }
  if (delta >= 60)
    return {
      level: 'acima',
      title: 'Seu MMR está acima do seu elo',
      text: 'Você tem folga: o elo atual está atrasado em relação ao seu nível real. Dá pra subir sem precisar mudar nada no seu jogo.',
    }
  if (delta > -60)
    return {
      level: 'alinhado',
      title: 'Seu MMR está de acordo com o seu elo',
      text: 'Elo e MMR estão alinhados. Daqui pra frente a subida depende de winrate: só sobe quem ganha mais do que perde.',
    }
  if (delta > -175)
    return {
      level: 'abaixo',
      title: 'Seu MMR está abaixo do seu elo',
      text: 'Você está acima do que o sistema acredita que você vale. Ganha pouco LP e perde muito — é o momento de jogar com cuidado pra não cair.',
    }
  return {
    level: 'muito-abaixo',
    title: 'Seu MMR está bem abaixo do seu elo',
    text: 'O elo está inflado em relação ao MMR (clássico de quem subiu em sequência ou veio de MD/boost). O sistema vai puxar você pra baixo até os dois se encontrarem.',
  }
}

function confidenceLabelFor(c: number): string {
  if (c >= 0.75) return 'Alta'
  if (c >= 0.45) return 'Média'
  return 'Baixa'
}

/**
 * Projeção do soft reset: historicamente a Riot comprime os elos em direção
 * ao meio da ladder e aplica uma queda fixa antes das partidas de colocação.
 */
const RESET_PIVOT = 1400 // ~Ouro II
const RESET_COMPRESSION = 0.8
const RESET_DROP = 250

export function projectReset(mmrPoints: number): number {
  const compressed = RESET_PIVOT + (mmrPoints - RESET_PIVOT) * RESET_COMPRESSION
  return clamp(compressed - RESET_DROP, MIN_POINTS, MAX_POINTS)
}

export function calculateMmr(input: MmrInput): MmrResult {
  const rankPoints = rankToPoints(input.tier, input.division, input.lp)
  const games = Math.max(0, input.wins) + Math.max(0, input.losses)

  const lpOffset = lpAsymmetryOffset(input.avgGain, input.avgLoss)
  const wrOffset = winrateOffset(input.wins, input.losses)
  const winrate = games > 0 ? input.wins / games : null

  // Cada sinal entra com peso proporcional à amostra que o sustenta.
  const lpWeight = lpOffset === null ? 0 : 0.65 * (games > 0 ? games / (games + LP_SAMPLE_HALF) : 0.6)
  const wrWeight = wrOffset === null ? 0 : 0.35 * (games / (games + WR_SAMPLE_HALF))
  const totalWeight = lpWeight + wrWeight

  const offset =
    totalWeight > 0 ? ((lpOffset ?? 0) * lpWeight + (wrOffset ?? 0) * wrWeight) / totalWeight : 0

  const mmrPoints = clamp(rankPoints + offset, MIN_POINTS, MAX_POINTS)
  const delta = mmrPoints - rankPoints

  // Confiança: amostra + os dois sinais apontando para o mesmo lado.
  const sampleConf = games / (games + 25)
  const bothSignals = lpOffset !== null && wrOffset !== null
  const agreement =
    bothSignals && Math.abs(lpOffset) + Math.abs(wrOffset) > 0
      ? 1 - Math.abs(lpOffset - wrOffset) / (Math.abs(lpOffset) + Math.abs(wrOffset) + 200)
      : 0.6
  const confidence = clamp(sampleConf * 0.6 + agreement * 0.4 * (bothSignals ? 1 : 0.7), 0, 1)

  const v = verdictFor(delta)
  const resetPoints = projectReset(mmrPoints)

  // No equilíbrio os ganhos convergem para a média entre ganho e perda atuais.
  const mid = (input.avgGain + input.avgLoss) / 2
  const equilibrium = {
    gain: Math.round(mid > 0 ? mid : 20),
    loss: Math.round(mid > 0 ? mid : 20),
  }

  return {
    rankPoints,
    mmrPoints,
    delta,
    divisions: delta / 100,
    rankLabel: pointsToRank(rankPoints),
    mmrLabel: pointsToRank(mmrPoints),
    verdict: v.level,
    verdictTitle: v.title,
    verdictText: v.text,
    confidence,
    confidenceLabel: confidenceLabelFor(confidence),
    signals: { lpOffset, winrateOffset: wrOffset, winrate, games },
    equilibrium,
    reset: { label: pointsToRank(resetPoints), points: resetPoints },
  }
}
