interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  suffix?: string
}

export function NumberInput({ value, onChange, min = 0, max = 999, suffix }: Props) {
  return (
    <span className="num-wrap">
      <input
        className="num"
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value)
          onChange(Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min)
        }}
      />
      {suffix && <span className="num-suffix">{suffix}</span>}
    </span>
  )
}
