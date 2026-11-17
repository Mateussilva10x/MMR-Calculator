import type { MmrResult } from '../lib/mmr'

const fmtDelta = (d: number) => `${d >= 0 ? '+' : '−'}${Math.abs(Math.round(d))} LP`

const fmtDiv = (d: number) => {
  const abs = Math.abs(d)
  const dir = d > 0 ? 'acima' : 'abaixo'
  if (abs < 0.15) return 'praticamente no mesmo ponto'
  if (abs < 1) return `menos de uma divisão ${dir}`
  return `${abs.toFixed(1)} divisões ${dir}`
}

export function ResultCard({ result }: { result: MmrResult }) {
  const { delta, verdict, rankLabel, mmrLabel, confidence } = result
  const barPct = Math.min(Math.max((delta + 400) / 800, 0), 1) * 100

  return (
    <section className={`result verdict-${verdict}`} aria-live="polite">
      <div className="result-head">
        <span className="badge">MMR estimado</span>
        <h2 className="mmr-value">{mmrLabel.full}</h2>
        <p className="delta">
          {fmtDelta(delta)} em relação a <strong>{rankLabel.full}</strong> — {fmtDiv(result.divisions)}
        </p>
      </div>

      <div className="gauge" role="img" aria-label={`MMR ${fmtDelta(delta)} em relação ao elo`}>
        <div className="gauge-track">
          <span className="gauge-center" />
          <span className="gauge-marker" style={{ left: `${barPct}%` }} />
        </div>
        <div className="gauge-legend">
          <span>MMR abaixo do elo</span>
          <span>alinhado</span>
          <span>MMR acima do elo</span>
        </div>
      </div>

      <h3 className="verdict-title">{result.verdictTitle}</h3>
      <p className="verdict-text">{result.verdictText}</p>

      <dl className="stats">
        <div>
          <dt>Elo atual</dt>
          <dd>{rankLabel.full}</dd>
        </div>
        <div>
          <dt>Elo equivalente ao MMR</dt>
          <dd>{mmrLabel.full}</dd>
        </div>
        <div>
          <dt>Winrate considerada</dt>
          <dd>
            {result.signals.winrate !== null
              ? `${(result.signals.winrate * 100).toFixed(1)}% em ${result.signals.games} partidas`
              : '—'}
          </dd>
        </div>
        <div>
          <dt>Confiança da estimativa</dt>
          <dd>
            {result.confidenceLabel} ({Math.round(confidence * 100)}%)
          </dd>
        </div>
      </dl>

      <div className="signals">
        <h4>De onde vem o número</h4>
        <ul>
          <li>
            <span>Assimetria de LP (sinal principal)</span>
            <strong>
              {result.signals.lpOffset !== null ? fmtDelta(result.signals.lpOffset) : 'sem dados'}
            </strong>
          </li>
          <li>
            <span>Winrate recente (sinal secundário)</span>
            <strong>
              {result.signals.winrateOffset !== null
                ? fmtDelta(result.signals.winrateOffset)
                : 'amostra pequena'}
            </strong>
          </li>
          <li>
            <span>LP por partida quando estabilizar</span>
            <strong>
              +{result.equilibrium.gain} / −{result.equilibrium.loss}
            </strong>
          </li>
        </ul>
      </div>

      <div className="reset-box">
        <h4>Projeção para o reset de 2027</h4>
        <p>
          Com esse MMR, um soft reset nos moldes dos anteriores deve te colocar por volta de{' '}
          <strong>{result.reset.label.short}</strong> depois das partidas de colocação — e o MMR
          preservado faz você subir de volta rápido.
        </p>
        <small>
          A Riot ainda não publicou as regras do reset de 2027. Essa projeção assume compressão da
          ladder em direção ao meio e queda de ~2,5 divisões, como nos resets passados.
        </small>
      </div>
    </section>
  )
}
