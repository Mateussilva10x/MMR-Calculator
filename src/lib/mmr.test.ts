import { describe, expect, it } from 'vitest'
import { calculateMmr, lpAsymmetryOffset, projectReset, winrateOffset } from './mmr'
import { pointsToRank, rankToPoints } from './ranks'

describe('escala de elos', () => {
  it('converte elo em pontos e volta', () => {
    expect(rankToPoints('GOLD', 4, 0)).toBe(1200)
    expect(rankToPoints('GOLD', 1, 50)).toBe(1550)
    expect(pointsToRank(1550).short).toBe('Ouro I')
    expect(pointsToRank(1550).lp).toBe(50)
    expect(pointsToRank(rankToPoints('IRON', 4, 0)).short).toBe('Ferro IV')
  })

  it('trata Mestre+ sem divisão', () => {
    const r = pointsToRank(rankToPoints('MASTER', 1, 120))
    expect(r.division).toBeNull()
    expect(r.short).toBe('Mestre')
    expect(r.lp).toBe(120)
  })
})

describe('sinal de assimetria de LP', () => {
  it('é neutro quando ganho e perda são iguais', () => {
    expect(lpAsymmetryOffset(20, 20)).toBe(0)
  })

  it('é positivo quando se ganha mais do que se perde', () => {
    expect(lpAsymmetryOffset(30, 10)).toBeGreaterThan(200)
  })

  it('é negativo no caso inverso', () => {
    expect(lpAsymmetryOffset(12, 25)).toBeLessThan(0)
  })

  it('ignora entrada inválida', () => {
    expect(lpAsymmetryOffset(0, 0)).toBeNull()
  })
})

describe('sinal de winrate', () => {
  it('é neutro em 50%', () => {
    expect(winrateOffset(50, 50)).toBeCloseTo(0, 5)
  })

  it('cresce com winrate alta', () => {
    expect(winrateOffset(65, 35)!).toBeGreaterThan(0)
  })

  it('exige amostra mínima', () => {
    expect(winrateOffset(2, 1)).toBeNull()
  })
})

describe('cálculo completo', () => {
  const base = { tier: 'GOLD' as const, division: 2, lp: 40, wins: 60, losses: 40 }

  it('aponta MMR acima do elo com ganhos altos', () => {
    const r = calculateMmr({ ...base, avgGain: 30, avgLoss: 12 })
    expect(r.delta).toBeGreaterThan(100)
    expect(['acima', 'muito-acima']).toContain(r.verdict)
    expect(r.mmrPoints).toBeGreaterThan(r.rankPoints)
  })

  it('aponta MMR alinhado com ganhos simétricos e 50% de winrate', () => {
    const r = calculateMmr({ ...base, wins: 50, losses: 50, avgGain: 20, avgLoss: 20 })
    expect(Math.abs(r.delta)).toBeLessThan(30)
    expect(r.verdict).toBe('alinhado')
  })

  it('aponta MMR abaixo do elo com ganhos baixos e winrate ruim', () => {
    const r = calculateMmr({ ...base, wins: 35, losses: 65, avgGain: 13, avgLoss: 26 })
    expect(r.delta).toBeLessThan(-60)
    expect(['abaixo', 'muito-abaixo']).toContain(r.verdict)
  })

  it('dá mais confiança para amostras maiores', () => {
    const poucas = calculateMmr({ ...base, wins: 4, losses: 3, avgGain: 25, avgLoss: 15 })
    const muitas = calculateMmr({ ...base, wins: 120, losses: 90, avgGain: 25, avgLoss: 15 })
    expect(muitas.confidence).toBeGreaterThan(poucas.confidence)
  })

  it('nunca estoura os limites da escala', () => {
    const r = calculateMmr({
      tier: 'IRON', division: 4, lp: 0, wins: 0, losses: 80, avgGain: 5, avgLoss: 40,
    })
    expect(r.mmrPoints).toBeGreaterThanOrEqual(0)
  })
})

describe('projeção do reset', () => {
  it('sempre devolve um elo igual ou menor que o MMR atual', () => {
    for (const p of [400, 1200, 2000, 2800, 3600]) {
      expect(projectReset(p)).toBeLessThan(p)
    }
  })

  it('mantém a ordem entre jogadores', () => {
    expect(projectReset(2400)).toBeGreaterThan(projectReset(1200))
  })
})
