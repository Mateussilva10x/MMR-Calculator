import { useEffect, useMemo, useState } from 'react'
import { Field } from './components/Field'
import { NumberInput } from './components/NumberInput'
import { ResultCard } from './components/ResultCard'
import { calculateMmr, type MmrInput } from './lib/mmr'
import { ROMAN, TIERS, hasDivisions, type TierId } from './lib/ranks'

const STORAGE_KEY = 'mmr-calculator:v1'

const DEFAULTS: MmrInput = {
  tier: 'GOLD',
  division: 2,
  lp: 45,
  avgGain: 22,
  avgLoss: 18,
  wins: 55,
  losses: 45,
}

function loadSaved(): MmrInput {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return DEFAULTS
  }
}

export default function App() {
  const [input, setInput] = useState<MmrInput>(loadSaved)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input))
    } catch {
      /* modo privado / storage bloqueado */
    }
  }, [input])

  const set = <K extends keyof MmrInput>(key: K, value: MmrInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  const result = useMemo(() => calculateMmr(input), [input])
  const games = input.wins + input.losses
  const withDivisions = hasDivisions(input.tier)

  return (
    <div className="app">
      <header className="hero">
        <p className="kicker">League of Legends · pré-reset 2027</p>
        <h1>
          Calculadora de <span>MMR</span>
        </h1>
        <p className="sub">
          Descubra se o seu MMR está acima, abaixo ou de acordo com o seu elo atual — e onde o reset
          de 2027 deve te deixar.
        </p>
      </header>

      <main className="layout">
        <form className="card form" onSubmit={(e) => e.preventDefault()}>
          <h2 className="card-title">Seus dados</h2>

          <div className="row">
            <Field label="Elo">
              <select
                className="select"
                value={input.tier}
                onChange={(e) => set('tier', e.target.value as TierId)}
              >
                {TIERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>

            {withDivisions && (
              <Field label="Divisão">
                <select
                  className="select"
                  value={input.division}
                  onChange={(e) => set('division', Number(e.target.value))}
                >
                  {ROMAN.map((r, i) => (
                    <option key={r} value={i + 1}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="LP atual">
              <NumberInput
                value={input.lp}
                min={0}
                max={withDivisions ? 100 : 2000}
                onChange={(v) => set('lp', v)}
                suffix="LP"
              />
            </Field>
          </div>

          <div className="divider" />

          <p className="section-hint">
            Olhe seu histórico das últimas ~20 partidas ranqueadas e preencha a média de LP.
          </p>

          <div className="row">
            <Field label="LP médio por vitória" hint="quanto você ganha ao vencer">
              <NumberInput value={input.avgGain} min={1} max={100} onChange={(v) => set('avgGain', v)} suffix="LP" />
            </Field>
            <Field label="LP médio por derrota" hint="valor positivo">
              <NumberInput value={input.avgLoss} min={1} max={100} onChange={(v) => set('avgLoss', v)} suffix="LP" />
            </Field>
          </div>

          <div className="row">
            <Field label="Vitórias na season">
              <NumberInput value={input.wins} min={0} max={2000} onChange={(v) => set('wins', v)} />
            </Field>
            <Field label="Derrotas na season">
              <NumberInput value={input.losses} min={0} max={2000} onChange={(v) => set('losses', v)} />
            </Field>
          </div>

          <p className="games-line">
            {games > 0 ? (
              <>
                {games} partidas · winrate <strong>{((input.wins / games) * 100).toFixed(1)}%</strong>
              </>
            ) : (
              'Preencha vitórias e derrotas para melhorar a precisão.'
            )}
          </p>

          <button type="button" className="reset-btn" onClick={() => setInput(DEFAULTS)}>
            Limpar
          </button>
        </form>

        <ResultCard result={result} />
      </main>

      <section className="card explain">
        <h2 className="card-title">Como a conta é feita</h2>
        <p>
          A Riot <strong>não expõe o MMR publicamente</strong> — nem no cliente, nem pela API. O que
          dá para fazer (e é assim que op.gg e sites parecidos funcionam) é estimar o MMR a partir
          dos efeitos dele, que são visíveis:
        </p>
        <ol>
          <li>
            <strong>Assimetria de LP.</strong> O ganho e a perda de LP são ajustados pela distância
            entre o seu MMR e o seu elo. Ganhar 28 e perder 14 significa que o sistema acha que você
            vale mais do que o elo mostra; ganhar 14 e perder 28, o contrário.
          </li>
          <li>
            <strong>Winrate recente.</strong> O matchmaking empurra todo mundo para perto de 50%.
            Manter winrate bem acima disso por muitas partidas indica MMR acima do elo. Esse sinal
            pesa menos e só conta com amostra razoável.
          </li>
          <li>
            <strong>Amostra.</strong> Os dois sinais são combinados com peso proporcional ao número
            de partidas, e a confiança sobe quando os dois apontam para o mesmo lado.
          </li>
        </ol>
        <p className="disclaimer">
          É uma estimativa, não o número interno da Riot. Serve para responder “meu elo está
          atrasado ou inflado?” com uma margem de cerca de uma divisão.
        </p>
      </section>

      <footer className="footer">
        <p>
          Projeto independente, sem vínculo com a Riot Games. League of Legends é marca registrada da
          Riot Games, Inc.
        </p>
      </footer>
    </div>
  )
}
