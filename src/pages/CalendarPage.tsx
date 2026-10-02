import { useMemo, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { SwipeableRow } from '../components/SwipeableRow'
import { useData } from '../data/DataContext'
import { navigate } from '../hooks/useHashRoute'
import { useSwipe } from '../hooks/useSwipe'
import { formatDate, parseISODate, toISODate, today, uid } from '../lib/util'
import { startWorkout } from '../lib/workouts'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const monthFmt = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' })

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7 // Montag = 0
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= days; d++) cells.push(toISODate(new Date(year, month, d)))
  while (cells.length % 7) cells.push(null)
  return cells
}

/** Anzahl aufeinanderfolgender Wochen (bis heute) mit mindestens einem Training. */
function weekStreak(dates: Set<string>): number {
  const monday = (d: Date) => {
    const m = new Date(d)
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7))
    return toISODate(m)
  }
  const weeks = new Set([...dates].map((d) => monday(parseISODate(d))))
  let streak = 0
  const cursor = new Date()
  if (!weeks.has(monday(cursor))) cursor.setDate(cursor.getDate() - 7) // laufende Woche zählt noch nicht dagegen
  while (weeks.has(monday(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

export function CalendarPage() {
  const data = useData()
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const todayISO = today()

  const shift = (delta: number) => {
    setDirection(delta > 0 ? 'left' : 'right')
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }
  const swipe = useSwipe({ onSwipeLeft: () => shift(1), onSwipeRight: () => shift(-1) })

  const doneDates = useMemo(
    () => new Set(data.workouts.filter((w) => w.finishedAt).map((w) => w.date)),
    [data.workouts],
  )
  const plannedDates = useMemo(() => new Set(data.schedule.map((d) => d.date)), [data.schedule])

  const cells = monthGrid(cursor.y, cursor.m)
  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`
  const monthCount = [...doneDates].filter((d) => d.startsWith(monthPrefix)).length
  const streak = useMemo(() => weekStreak(doneDates), [doneDates])

  return (
    <main className="page">
      <header className="page__header">
        <h1>Kalender</h1>
      </header>

      <div className="stats">
        <div className="stat">
          <strong>{monthCount}</strong>
          <span>Trainings im Monat</span>
        </div>
        <div className="stat">
          <strong>{streak}</strong>
          <span>Wochen in Folge</span>
        </div>
        <div className="stat">
          <strong>{doneDates.size}</strong>
          <span>Trainingstage gesamt</span>
        </div>
      </div>

      <section className="card calendar" {...swipe}>
        <header className="calendar__header">
          <button className="icon-btn" aria-label="Vorheriger Monat" onClick={() => shift(-1)}>
            ‹
          </button>
          <button
            className="calendar__title"
            onClick={() => {
              setDirection(null)
              setCursor({ y: now.getFullYear(), m: now.getMonth() })
            }}
          >
            {monthFmt.format(new Date(cursor.y, cursor.m, 1))}
          </button>
          <button className="icon-btn" aria-label="Nächster Monat" onClick={() => shift(1)}>
            ›
          </button>
        </header>
        <div className="calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div key={monthPrefix} className={`calendar__grid ${direction ? `slide-${direction}` : ''}`}>
          {cells.map((date, i) =>
            date ? (
              <button
                key={date}
                className={[
                  'calendar__day',
                  date === todayISO && 'is-today',
                  doneDates.has(date) && 'is-done',
                  plannedDates.has(date) && !doneDates.has(date) && 'is-planned',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`${formatDate(date)}${doneDates.has(date) ? ', trainiert' : ''}${plannedDates.has(date) ? ', geplant' : ''}`}
                onClick={() => setSelected(date)}
              >
                {parseISODate(date).getDate()}
              </button>
            ) : (
              <span key={`e${i}`} />
            ),
          )}
        </div>
        <footer className="calendar__legend">
          <span>
            <i className="dot dot--done" /> trainiert
          </span>
          <span>
            <i className="dot dot--planned" /> geplant
          </span>
        </footer>
      </section>
      <p className="hint">Wischen zum Monatswechsel · Tag antippen für Details</p>

      <DaySheet date={selected} onClose={() => setSelected(null)} />
    </main>
  )
}

function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const data = useData()
  const [picking, setPicking] = useState(false)
  if (!date) return null

  const workouts = data.workouts.filter((w) => w.date === date)
  const planned = data.schedule.filter((d) => d.date === date)
  const planName = (id: string | null) => data.plans.find((p) => p.id === id)?.name ?? 'Training'
  const isPastOrToday = date <= today()

  const close = () => {
    setPicking(false)
    onClose()
  }

  return (
    <BottomSheet open title={formatDate(date)} onClose={close}>
      {picking ? (
        <div className="form">
          <p className="muted">Welchen Plan möchtest du einplanen?</p>
          {data.plans.length === 0 && <p className="muted">Lege zuerst einen Plan an.</p>}
          {data.plans.map((p) => (
            <button
              key={p.id}
              className="btn btn--ghost btn--block"
              onClick={() => {
                data.saveScheduledDay({ id: uid(), date, planId: p.id })
                setPicking(false)
              }}
            >
              {p.name}
            </button>
          ))}
          <button className="btn btn--block" onClick={() => setPicking(false)}>
            Abbrechen
          </button>
        </div>
      ) : (
        <div className="form">
          {workouts.length === 0 && planned.length === 0 && <p className="muted">Kein Training an diesem Tag.</p>}

          {workouts.map((w) => {
            const sets = w.exercises.flatMap((e) => e.sets).filter((s) => s.done)
            const volume = sets.reduce((v, s) => v + s.weight * s.reps, 0)
            return (
              <button key={w.id} className="card day-item" onClick={() => navigate(`workout/${w.id}`)}>
                <span>
                  <strong>{w.planName}</strong>
                  <span className="muted small">
                    {w.finishedAt ? `${sets.length} Sätze · ${Math.round(volume).toLocaleString('de-DE')} kg bewegt` : 'läuft …'}
                  </span>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            )
          })}

          {planned.length > 0 && (
            <ul className="list">
              {planned.map((d) => {
                const plan = data.plans.find((p) => p.id === d.planId)
                return (
                  <li key={d.id}>
                    <SwipeableRow onDelete={() => data.deleteScheduledDay(d.id)}>
                      <div className="card day-item day-item--planned">
                        <span>
                          <strong>{planName(d.planId)}</strong>
                          <span className="muted small">geplant</span>
                        </span>
                        {plan && isPastOrToday && plan.exercises.length > 0 && (
                          <button
                            className="btn btn--primary btn--small"
                            onClick={() => {
                              const w = startWorkout(data, plan, date)
                              data.deleteScheduledDay(d.id)
                              navigate(`workout/${w.id}`)
                            }}
                          >
                            Start
                          </button>
                        )}
                      </div>
                    </SwipeableRow>
                  </li>
                )
              })}
            </ul>
          )}

          <button className="btn btn--ghost btn--block" onClick={() => setPicking(true)}>
            + Plan einplanen
          </button>
          {isPastOrToday &&
            data.plans
              .filter((p) => p.exercises.length > 0 && !planned.some((d) => d.planId === p.id))
              .slice(0, 3)
              .map((p) => (
                <button
                  key={p.id}
                  className="btn btn--block"
                  onClick={() => navigate(`workout/${startWorkout(data, p, date).id}`)}
                >
                  „{p.name}“ {date === today() ? 'jetzt starten' : 'nachtragen'}
                </button>
              ))}
        </div>
      )}
    </BottomSheet>
  )
}
