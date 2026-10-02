import { useEffect, useState } from 'react'
import { formatDuration, vibrate } from '../lib/util'

interface Props {
  /** Zeitpunkt (ms), an dem die Pause endet */
  endsAt: number
  total: number
  onChange: (endsAt: number) => void
  onDone: () => void
}

/** Pausen-Countdown. Basiert auf einem Endzeitpunkt, läuft also auch im Hintergrund korrekt weiter. */
export function RestTimer({ endsAt, total, onChange, onDone }: Props) {
  const [now, setNow] = useState(Date.now())
  const remaining = Math.max(0, (endsAt - now) / 1000)

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (remaining > 0) return
    vibrate([200, 100, 200])
    onDone()
  }, [remaining, onDone])

  const progress = total > 0 ? 1 - remaining / total : 1

  return (
    <div className="rest-timer" role="timer" aria-live="polite">
      <div className="rest-timer__bar" style={{ transform: `scaleX(${progress})` }} />
      <span className="rest-timer__label">Pause</span>
      <strong className="rest-timer__time">{formatDuration(remaining)}</strong>
      <div className="rest-timer__actions">
        <button onClick={() => onChange(endsAt - 15000)}>−15s</button>
        <button onClick={() => onChange(endsAt + 15000)}>+15s</button>
        <button className="primary" onClick={onDone}>
          Weiter
        </button>
      </div>
    </div>
  )
}
