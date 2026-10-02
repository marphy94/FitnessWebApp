import { useEffect, useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  min?: number
  max?: number
  unit?: string
  decimals?: number
}

/** Zahlenfeld mit großen +/- Tasten für die Bedienung mit dem Daumen. */
export function NumberStepper({ label, value, onChange, step, min = 0, max = 9999, unit, decimals = 0 }: Props) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const clamp = (v: number) => Math.min(max, Math.max(min, Number(v.toFixed(decimals || 0))))
  const commit = (raw: string) => {
    const v = parseFloat(raw.replace(',', '.'))
    if (Number.isFinite(v)) onChange(clamp(v))
    else setText(String(value))
  }

  return (
    <label className="stepper">
      <span className="stepper__label">{label}</span>
      <span className="stepper__row">
        <button type="button" aria-label={`${label} verringern`} onClick={() => onChange(clamp(value - step))}>
          −
        </button>
        <input
          inputMode={decimals ? 'decimal' : 'numeric'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {unit && <span className="stepper__unit">{unit}</span>}
        <button type="button" aria-label={`${label} erhöhen`} onClick={() => onChange(clamp(value + step))}>
          +
        </button>
      </span>
    </label>
  )
}
