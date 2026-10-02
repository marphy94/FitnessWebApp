import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { RestTimer } from '../components/RestTimer'
import { SwipeableRow } from '../components/SwipeableRow'
import { useSnackbar } from '../components/Snackbar'
import { useData } from '../data/DataContext'
import { goBack, navigate } from '../hooks/useHashRoute'
import { useNow } from '../hooks/useNow'
import { exerciseKey, formatClock, formatDate, formatDuration, formatMinutes, uid, vibrate } from '../lib/util'
import { lastPerformance, summarizeSets } from '../lib/workouts'
import type { PlanExercise, Workout, WorkoutExercise } from '../types'

const TIMER_KEY = 'fitness-webapp:rest-timer'

interface Rest {
  workoutId: string
  endsAt: number
  total: number
}

function loadRest(workoutId: string): Rest | null {
  try {
    const r = JSON.parse(sessionStorage.getItem(TIMER_KEY) ?? 'null') as Rest | null
    return r && r.workoutId === workoutId && r.endsAt > Date.now() ? r : null
  } catch {
    return null
  }
}

const isComplete = (ex: WorkoutExercise) => ex.sets.length > 0 && ex.sets.every((s) => s.done)
const fmtKg = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })

export function WorkoutPage({ workoutId }: { workoutId: string }) {
  const data = useData()
  const snackbar = useSnackbar()
  const workout = data.workouts.find((w) => w.id === workoutId)
  const [rest, setRest] = useState<Rest | null>(() => loadRest(workoutId))
  const [finishOpen, setFinishOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const cardRefs = useRef(new Map<string, HTMLElement>())

  // Immer auf dem neuesten Stand arbeiten – auch wenn mehrere Änderungen direkt hintereinander passieren
  // (z. B. Gewicht eintippen und sofort den Haken setzen).
  const latest = useRef(workout)
  latest.current = workout

  useEffect(() => {
    try {
      if (rest) sessionStorage.setItem(TIMER_KEY, JSON.stringify(rest))
      else sessionStorage.removeItem(TIMER_KEY)
    } catch {
      /* ignorieren */
    }
  }, [rest])

  const stopRest = useCallback(() => setRest(null), [])

  if (!workout) {
    return (
      <main className="page">
        <div className="empty">
          <p>Training nicht gefunden.</p>
          <button className="btn btn--ghost" onClick={() => navigate('plans', { replace: true })}>
            Zu den Plänen
          </button>
        </div>
      </main>
    )
  }

  const plan = data.plans.find((p) => p.id === workout.planId)
  const targetFor = (ex: WorkoutExercise): PlanExercise | undefined =>
    plan?.exercises.find((pe) => exerciseKey(pe.name) === exerciseKey(ex.name))

  const save = (w: Workout) => {
    latest.current = w
    data.saveWorkout(w)
  }
  const updateExercise = (exId: string, fn: (e: WorkoutExercise) => WorkoutExercise) => {
    const w = latest.current!
    save({ ...w, exercises: w.exercises.map((e) => (e.id === exId ? fn(e) : e)) })
  }

  /** Neuer Wert für einen Satz – offene Folgesätze mit gleichem Wert werden mitgezogen. */
  const changeValue = (exId: string, setId: string, field: 'weight' | 'reps', value: number) =>
    updateExercise(exId, (e) => {
      const idx = e.sets.findIndex((s) => s.id === setId)
      const old = e.sets[idx][field]
      return {
        ...e,
        sets: e.sets.map((s, i) =>
          i === idx || (i > idx && !s.done && s[field] === old) ? { ...s, [field]: value } : s,
        ),
      }
    })

  const toggleDone = (exId: string, setId: string) => {
    const ex = latest.current!.exercises.find((e) => e.id === exId)!
    const done = !ex.sets.find((s) => s.id === setId)!.done
    updateExercise(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, done } : s)) }))
    if (!done) return
    vibrate(20)
    const updated = latest.current!.exercises
    const exNow = updated.find((e) => e.id === exId)!
    if (ex.restSeconds > 0 && !workout.finishedAt) {
      setRest({ workoutId, endsAt: Date.now() + ex.restSeconds * 1000, total: ex.restSeconds })
    }
    // Übung fertig → zur nächsten offenen Übung scrollen.
    if (isComplete(exNow)) {
      const next = updated.find((e) => !isComplete(e))
      if (next) window.setTimeout(() => scrollTo(next.id), 250)
    }
  }

  const addSet = (ex: WorkoutExercise) => {
    const last = ex.sets[ex.sets.length - 1]
    updateExercise(ex.id, (e) => ({
      ...e,
      sets: [
        ...e.sets,
        { id: uid(), setNumber: e.sets.length + 1, reps: last?.reps ?? 10, weight: last?.weight ?? 0, done: false },
      ],
    }))
  }

  const removeSet = (exId: string, setId: string) =>
    updateExercise(exId, (e) => ({
      ...e,
      sets: e.sets.filter((s) => s.id !== setId).map((s, i) => ({ ...s, setNumber: i + 1 })),
    }))

  const scrollTo = (exId: string) =>
    cardRefs.current.get(exId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const allSets = workout.exercises.flatMap((e) => e.sets)
  const doneSets = allSets.filter((s) => s.done)
  const volume = doneSets.reduce((v, s) => v + s.weight * s.reps, 0)
  const doneExercises = workout.exercises.filter(isComplete).length
  // Aktuelle Übung = erste mit offenem Satz; darin ist der erste offene Satz „dran“.
  const current = workout.finishedAt ? undefined : workout.exercises.find((e) => !isComplete(e))
  const currentSetId = current?.sets.find((s) => !s.done)?.id

  return (
    <main className={rest ? 'page page--with-timer' : 'page'}>
      <header className="workout-top">
        <div className="workout-top__bar">
          <button className="icon-btn" aria-label="Zurück" onClick={() => goBack('plans')}>
            ‹
          </button>
          <div className="page__title">
            <h1>{workout.planName}</h1>
            <span className="muted">{formatDate(workout.date)}</span>
          </div>
          <ElapsedClock startedAt={workout.startedAt} finishedAt={workout.finishedAt} />
        </div>

        <div className="progress-bar" aria-hidden="true">
          <span style={{ width: `${allSets.length ? (doneSets.length / allSets.length) * 100 : 0}%` }} />
        </div>

        {workout.exercises.length > 1 && (
          <nav className="exercise-nav" aria-label="Übungen">
            {workout.exercises.map((ex, i) => (
              <button
                key={ex.id}
                className={[
                  'exercise-nav__item',
                  isComplete(ex) && 'is-done',
                  ex.id === current?.id && 'is-current',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => scrollTo(ex.id)}
              >
                <span className="exercise-nav__num">{isComplete(ex) ? '✓' : i + 1}</span>
                {ex.name}
              </button>
            ))}
          </nav>
        )}
      </header>

      <dl className="workout-stats">
        <div>
          <dt>Sätze</dt>
          <dd>
            {doneSets.length}/{allSets.length}
          </dd>
        </div>
        <div>
          <dt>Übungen</dt>
          <dd>
            {doneExercises}/{workout.exercises.length}
          </dd>
        </div>
        <div>
          <dt>Volumen</dt>
          <dd>{Math.round(volume).toLocaleString('de-DE')} kg</dd>
        </div>
      </dl>

      {workout.exercises.map((ex, i) => {
        const last = lastPerformance(data.workouts, ex.name, workout.id)
        const target = targetFor(ex)
        const complete = isComplete(ex)
        const exDone = ex.sets.filter((s) => s.done).length
        return (
          <section
            key={ex.id}
            ref={(el) => {
              if (el) cardRefs.current.set(ex.id, el)
              else cardRefs.current.delete(ex.id)
            }}
            className={['card', 'workout-ex', complete && 'is-done', ex.id === current?.id && 'is-current']
              .filter(Boolean)
              .join(' ')}
          >
            <header className="workout-ex__header">
              <span className="workout-ex__badge" aria-hidden="true">
                {complete ? '✓' : i + 1}
              </span>
              <div className="workout-ex__title">
                <h2>{ex.name}</h2>
                <span className="muted small">
                  {exDone}/{ex.sets.length} Sätze
                  {ex.restSeconds > 0 && ` · Pause ${formatDuration(ex.restSeconds)}`}
                </span>
              </div>
            </header>

            <div className="workout-ex__info">
              {target && (
                <span>
                  <b>Ziel</b> {target.sets} × {target.reps} @ {fmtKg(target.weight)} kg
                </span>
              )}
              {last && (
                <span>
                  <b>Letztes Mal</b> {summarizeSets(last)}
                </span>
              )}
            </div>

            <div className="set-row set-row--head" aria-hidden="true">
              <span>Satz</span>
              <span>Gewicht (kg)</span>
              <span>Wdh.</span>
              <span>Fertig</span>
            </div>
            <ul className="sets">
              {ex.sets.map((s) => {
                const isCurrent = s.id === currentSetId
                return (
                  <li key={s.id}>
                    <SwipeableRow onDelete={() => removeSet(ex.id, s.id)}>
                      <div className={['set-row', s.done && 'is-done', isCurrent && 'is-current'].filter(Boolean).join(' ')}>
                        <span className="set-row__num">
                          {s.setNumber}
                          {isCurrent && <small>jetzt</small>}
                        </span>
                        <SetInput
                          label={`Gewicht Satz ${s.setNumber} in kg`}
                          value={s.weight}
                          step={2.5}
                          decimals
                          onChange={(v) => changeValue(ex.id, s.id, 'weight', v)}
                        />
                        <SetInput
                          label={`Wiederholungen Satz ${s.setNumber}`}
                          value={s.reps}
                          step={1}
                          onChange={(v) => changeValue(ex.id, s.id, 'reps', v)}
                        />
                        <button
                          className="check"
                          aria-pressed={s.done}
                          aria-label={s.done ? `Satz ${s.setNumber} wieder öffnen` : `Satz ${s.setNumber} erledigt`}
                          onClick={() => toggleDone(ex.id, s.id)}
                        >
                          ✓
                        </button>
                      </div>
                    </SwipeableRow>
                  </li>
                )
              })}
            </ul>
            <button className="btn btn--ghost btn--small" onClick={() => addSet(ex)}>
              + Satz
            </button>
          </section>
        )
      })}

      <button className="btn btn--ghost btn--block" onClick={() => setAddOpen(true)}>
        + Übung hinzufügen
      </button>

      {workout.finishedAt ? (
        <button
          className="btn btn--danger btn--block"
          onClick={() => {
            data.deleteWorkout(workout.id)
            snackbar({ text: 'Training gelöscht', actionLabel: 'Rückgängig', onAction: () => data.saveWorkout(workout) })
            goBack('calendar')
          }}
        >
          Training löschen
        </button>
      ) : (
        <button className="btn btn--primary btn--block" onClick={() => setFinishOpen(true)}>
          Training beenden
        </button>
      )}

      <p className="hint">Gewicht &amp; Wiederholungen nach jedem Satz eintragen und abhaken · Satz nach links wischen zum Löschen</p>

      {rest && (
        <RestTimer
          endsAt={rest.endsAt}
          total={rest.total}
          onChange={(endsAt) => setRest({ ...rest, endsAt })}
          onDone={stopRest}
        />
      )}

      <AddExerciseSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(name) => {
          const w = latest.current!
          save({
            ...w,
            exercises: [
              ...w.exercises,
              {
                id: uid(),
                name,
                restSeconds: 90,
                sets: [{ id: uid(), setNumber: 1, reps: 10, weight: 0, done: false }],
              },
            ],
          })
          setAddOpen(false)
        }}
      />

      <FinishSheet
        open={finishOpen}
        workout={workout}
        volume={volume}
        onClose={() => setFinishOpen(false)}
        onFinish={(updatePlan) => {
          const finishedAt = new Date().toISOString()
          data.saveWorkout({ ...latest.current!, finishedAt }, { immediate: true })
          if (updatePlan && plan) {
            data.savePlan({
              ...plan,
              updatedAt: finishedAt,
              exercises: plan.exercises.map((pe) => {
                const done = workout.exercises
                  .filter((we) => exerciseKey(we.name) === exerciseKey(pe.name))
                  .flatMap((we) => we.sets.filter((s) => s.done))
                return done.length ? { ...pe, weight: Math.max(...done.map((s) => s.weight)) } : pe
              }),
            })
          }
          setRest(null)
          setFinishOpen(false)
          vibrate([30, 60, 30])
          const duration = Date.parse(finishedAt) - Date.parse(workout.startedAt)
          snackbar({ text: `Training gespeichert · ${formatMinutes(duration)} 💪` })
          navigate('calendar', { replace: true })
        }}
      />
    </main>
  )
}

/** Große Stoppuhr seit Trainingsbeginn; nach dem Beenden steht die Gesamtdauer. */
function ElapsedClock({ startedAt, finishedAt }: { startedAt: string; finishedAt: string | null }) {
  const now = useNow(1000, !finishedAt)
  const end = finishedAt ? Date.parse(finishedAt) : now
  return (
    <div className={finishedAt ? 'elapsed is-finished' : 'elapsed'} role="timer" aria-label="Trainingsdauer">
      <span className="elapsed__label">
        {!finishedAt && <span className="elapsed__live" aria-hidden="true" />}
        {finishedAt ? 'Dauer' : 'Trainingszeit'}
      </span>
      <strong className="elapsed__time">{formatClock(end - Date.parse(startedAt))}</strong>
    </div>
  )
}

/** Zahlenfeld für einen Satz mit kleinen −/+ Tasten. */
function SetInput({
  label,
  value,
  onChange,
  step,
  decimals = false,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  decimals?: boolean
}) {
  const fmt = (v: number) => String(v).replace('.', ',')
  const [text, setText] = useState(fmt(value))
  useEffect(() => setText(fmt(value)), [value])
  const clean = (v: number) => Math.max(0, decimals ? Math.round(v * 100) / 100 : Math.round(v))

  return (
    <div className="set-input">
      <button type="button" tabIndex={-1} aria-label={`${label} verringern`} onClick={() => onChange(clean(value - step))}>
        −
      </button>
      <input
        aria-label={label}
        inputMode={decimals ? 'decimal' : 'numeric'}
        value={text}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const v = parseFloat(text.replace(',', '.'))
          if (Number.isFinite(v) && v >= 0) {
            if (clean(v) !== value) onChange(clean(v))
            else setText(fmt(value))
          } else setText(fmt(value))
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <button type="button" tabIndex={-1} aria-label={`${label} erhöhen`} onClick={() => onChange(clean(value + step))}>
        +
      </button>
    </div>
  )
}

function AddExerciseSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState('')
  useEffect(() => {
    if (open) setName('')
  }, [open])
  return (
    <BottomSheet open={open} title="Übung hinzufügen" onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onAdd(name.trim())
        }}
      >
        <label className="field">
          <span>Name</span>
          <input value={name} autoFocus placeholder="z. B. Dips" onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn btn--primary btn--block" type="submit" disabled={!name.trim()}>
          Hinzufügen
        </button>
      </form>
    </BottomSheet>
  )
}

function FinishSheet({
  open,
  workout,
  volume,
  onClose,
  onFinish,
}: {
  open: boolean
  workout: Workout
  volume: number
  onClose: () => void
  onFinish: (updatePlan: boolean) => void
}) {
  const [updatePlan, setUpdatePlan] = useState(true)
  const now = useNow(1000, open)
  const sets = workout.exercises.flatMap((e) => e.sets)
  const openSets = sets.filter((s) => !s.done).length
  return (
    <BottomSheet open={open} title="Training beenden?" onClose={onClose}>
      <div className="form">
        <dl className="workout-stats workout-stats--summary">
          <div>
            <dt>Dauer</dt>
            <dd>{formatClock(now - Date.parse(workout.startedAt))}</dd>
          </div>
          <div>
            <dt>Sätze</dt>
            <dd>
              {sets.length - openSets}/{sets.length}
            </dd>
          </div>
          <div>
            <dt>Volumen</dt>
            <dd>{Math.round(volume).toLocaleString('de-DE')} kg</dd>
          </div>
        </dl>
        {openSets > 0 && (
          <p className="muted">
            {openSets} {openSets === 1 ? 'Satz ist' : 'Sätze sind'} noch nicht abgehakt und{' '}
            {openSets === 1 ? 'zählt' : 'zählen'} nicht zum Fortschritt.
          </p>
        )}
        {workout.planId && (
          <label className="toggle">
            <input type="checkbox" checked={updatePlan} onChange={(e) => setUpdatePlan(e.target.checked)} />
            <span>Erreichte Gewichte in den Plan übernehmen</span>
          </label>
        )}
        <button className="btn btn--primary btn--block" onClick={() => onFinish(updatePlan && !!workout.planId)}>
          Beenden &amp; speichern
        </button>
        <button className="btn btn--ghost btn--block" onClick={onClose}>
          Weiter trainieren
        </button>
      </div>
    </BottomSheet>
  )
}
