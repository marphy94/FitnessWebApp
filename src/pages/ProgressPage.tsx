import { useMemo, useState } from 'react'
import { LineChart } from '../components/LineChart'
import { useData } from '../data/DataContext'
import { formatDate, formatWeight, toISODate } from '../lib/util'
import { progressFor, trackedExercises } from '../lib/workouts'

const RANGES = [
  { id: '1m', label: '1 M', days: 31 },
  { id: '3m', label: '3 M', days: 92 },
  { id: '1y', label: '1 J', days: 366 },
  { id: 'all', label: 'Alles', days: Infinity },
] as const

export function ProgressPage() {
  const { workouts } = useData()
  const exercises = useMemo(() => trackedExercises(workouts), [workouts])
  const [key, setKey] = useState<string | null>(null)
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('3m')
  const activeKey = key && exercises.some((e) => e.key === key) ? key : exercises[0]?.key

  const entries = useMemo(() => {
    if (!activeKey) return []
    const all = progressFor(workouts, activeKey)
    const days = RANGES.find((r) => r.id === range)!.days
    if (!Number.isFinite(days)) return all
    const from = new Date()
    from.setDate(from.getDate() - days)
    const fromISO = toISODate(from)
    return all.filter((e) => e.date >= fromISO)
  }, [workouts, activeKey, range])

  if (!exercises.length) {
    return (
      <main className="page">
        <header className="page__header">
          <h1>Fortschritt</h1>
        </header>
        <div className="empty">
          <p>Noch keine Daten.</p>
          <p className="muted">Sobald du Sätze im Training abhakst, siehst du hier, wie sich deine Gewichte entwickeln.</p>
        </div>
      </main>
    )
  }

  const first = entries[0]
  const last = entries[entries.length - 1]
  const best = entries.reduce((b, e) => (e.maxWeight > b ? e.maxWeight : b), 0)
  const delta = first && last ? last.maxWeight - first.maxWeight : 0
  const deltaPct = first?.maxWeight ? (delta / first.maxWeight) * 100 : 0
  const name = exercises.find((e) => e.key === activeKey)?.name ?? ''

  return (
    <main className="page">
      <header className="page__header">
        <h1>Fortschritt</h1>
      </header>

      <div className="chips" role="tablist" aria-label="Übung">
        {exercises.map((e) => (
          <button
            key={e.key}
            role="tab"
            aria-selected={e.key === activeKey}
            className={e.key === activeKey ? 'chip is-active' : 'chip'}
            onClick={() => setKey(e.key)}
          >
            {e.name}
          </button>
        ))}
      </div>

      <section className="card">
        <header className="chart-header">
          <h2>{name} · Höchstgewicht</h2>
          <div className="segmented" role="tablist" aria-label="Zeitraum">
            {RANGES.map((r) => (
              <button
                key={r.id}
                role="tab"
                aria-selected={r.id === range}
                className={r.id === range ? 'is-active' : undefined}
                onClick={() => setRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {entries.length ? (
          <>
            <div className="stats stats--inline">
              <div className="stat">
                <strong>{formatWeight(last.maxWeight)}</strong>
                <span>Aktuell</span>
              </div>
              <div className="stat">
                <strong>{formatWeight(best)}</strong>
                <span>Bestwert</span>
              </div>
              <div className="stat">
                <strong className={delta > 0 ? 'up' : delta < 0 ? 'down' : undefined}>
                  {delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : ''}
                  {formatWeight(delta)}
                </strong>
                <span>{deltaPct ? `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(0)} % im Zeitraum` : 'Veränderung'}</span>
              </div>
            </div>
            <LineChart
              points={entries.map((e) => ({ date: e.date, value: e.maxWeight }))}
              label={`Höchstgewicht ${name} von ${formatWeight(first.maxWeight)} auf ${formatWeight(last.maxWeight)}`}
            />
          </>
        ) : (
          <p className="muted">Keine Einträge in diesem Zeitraum.</p>
        )}
      </section>

      {entries.length > 0 && (
        <section className="card">
          <h2>Verlauf</h2>
          <table className="history">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Bester Satz</th>
                <th>Volumen</th>
              </tr>
            </thead>
            <tbody>
              {[...entries].reverse().map((e) => (
                <tr key={e.date}>
                  <td>{formatDate(e.date)}</td>
                  <td>
                    {e.bestSet.reps} × {formatWeight(e.bestSet.weight)}
                  </td>
                  <td>{Math.round(e.volume).toLocaleString('de-DE')} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  )
}
