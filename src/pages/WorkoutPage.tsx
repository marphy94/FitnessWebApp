import { useCallback, useEffect, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { RestTimer } from '../components/RestTimer'
import { SwipeableRow } from '../components/SwipeableRow'
import { useSnackbar } from '../components/Snackbar'
import { useData } from '../data/DataContext'
import { goBack, navigate } from '../hooks/useHashRoute'
import { exerciseKey, formatDate, uid, vibrate } from '../lib/util'
import { lastPerformance, summarizeSets } from '../lib/workouts'
import type { Workout, WorkoutExercise, WorkoutSet } from '../types'

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

export function WorkoutPage({ workoutId }: { workoutId: string }) {
  const data = useData()
  const snackbar = useSnackbar()
  const workout = data.workouts.find((w) => w.id === workoutId)
  const [rest, setRest] = useState<Rest | null>(() => loadRest(workoutId))
  const [finishOpen, setFinishOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

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

  const save = (w: Workout) => data.saveWorkout(w)
  const updateExercise = (exId: string, fn: (e: WorkoutExercise) => WorkoutExercise) =>
    save({ ...workout, exercises: workout.exercises.map((e) => (e.id === exId ? fn(e) : e)) })
  const updateSet = (exId: string, setId: string, patch: Partial<WorkoutSet>) =>
    updateExercise(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }))

  const toggleDone = (ex: WorkoutExercise, set: WorkoutSet) => {
    const done = !set.done
    updateSet(ex.id, set.id, { done })
    if (done) {
      vibrate(20)
      if (ex.restSeconds > 0 && !workout.finishedAt) {
        setRest({ workoutId, endsAt: Date.now() + ex.restSeconds * 1000, total: ex.restSeconds })
      }
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

  const removeSet = (ex: WorkoutExercise, set: WorkoutSet) =>
    updateExercise(ex.id, (e) => ({
      ...e,
      sets: e.sets.filter((s) => s.id !== set.id).map((s, i) => ({ ...s, setNumber: i + 1 })),
    }))

  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0)
  const doneSets = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)

  return (
    <main className={rest ? 'page page--with-timer' : 'page'}>
      <header className="page__header page__header--sub">
        <button className="icon-btn" aria-label="Zurück" onClick={() => goBack('plans')}>
          ‹
        </button>
        <div className="page__title">
          <h1>{workout.planName}</h1>
          <span className="muted">
            {formatDate(workout.date)} · {doneSets}/{totalSets} Sätze
            {workout.finishedAt && ' · beendet'}
          </span>
        </div>
      </header>

      <div className="progress-bar" aria-hidden="true">
        <span style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
      </div>

      {workout.exercises.map((ex) => {
        const last = lastPerformance(data.workouts, ex.name, workout.id)
        return (
          <section key={ex.id} className="card workout-ex">
            <header className="workout-ex__header">
              <h2>{ex.name}</h2>
              {last && <span className="muted small">Letztes Mal: {summarizeSets(last)}</span>}
            </header>
            <div className="set-row set-row--head" aria-hidden="true">
              <span>Satz</span>
              <span>kg</span>
              <span>Wdh.</span>
              <span />
            </div>
            <ul className="sets">
              {ex.sets.map((s) => (
                <li key={s.id}>
                  <SwipeableRow onDelete={() => removeSet(ex, s)}>
                    <div className={s.done ? 'set-row is-done' : 'set-row'}>
                      <span className="set-row__num">{s.setNumber}</span>
                      <SetInput
                        label={`Gewicht Satz ${s.setNumber}`}
                        value={s.weight}
                        decimals
                        onChange={(weight) => updateSet(ex.id, s.id, { weight })}
                      />
                      <SetInput
                        label={`Wiederholungen Satz ${s.setNumber}`}
                        value={s.reps}
                        onChange={(reps) => updateSet(ex.id, s.id, { reps })}
                      />
                      <button
                        className="check"
                        aria-pressed={s.done}
                        aria-label={s.done ? 'Satz offen' : 'Satz erledigt'}
                        onClick={() => toggleDone(ex, s)}
                      >
                        ✓
                      </button>
                    </div>
                  </SwipeableRow>
                </li>
              ))}
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
          save({
            ...workout,
            exercises: [
              ...workout.exercises,
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
        onClose={() => setFinishOpen(false)}
        onFinish={(updatePlan) => {
          const finished = { ...workout, finishedAt: new Date().toISOString() }
          data.saveWorkout(finished, { immediate: true })
          const plan = data.plans.find((p) => p.id === workout.planId)
          if (updatePlan && plan) {
            data.savePlan({
              ...plan,
              updatedAt: new Date().toISOString(),
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
          snackbar({ text: 'Training gespeichert 💪' })
          navigate('calendar', { replace: true })
        }}
      />
    </main>
  )
}

function SetInput({
  label,
  value,
  onChange,
  decimals = false,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  decimals?: boolean
}) {
  const [text, setText] = useState(String(value).replace('.', ','))
  useEffect(() => setText(String(value).replace('.', ',')), [value])
  return (
    <input
      className="set-input"
      aria-label={label}
      inputMode={decimals ? 'decimal' : 'numeric'}
      value={text}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const v = parseFloat(text.replace(',', '.'))
        if (Number.isFinite(v) && v >= 0) onChange(decimals ? Math.round(v * 100) / 100 : Math.round(v))
        else setText(String(value).replace('.', ','))
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
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
  onClose,
  onFinish,
}: {
  open: boolean
  workout: Workout
  onClose: () => void
  onFinish: (updatePlan: boolean) => void
}) {
  const [updatePlan, setUpdatePlan] = useState(true)
  const open_ = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0)
  return (
    <BottomSheet open={open} title="Training beenden?" onClose={onClose}>
      <div className="form">
        {open_ > 0 && (
          <p className="muted">
            {open_} {open_ === 1 ? 'Satz ist' : 'Sätze sind'} noch nicht abgehakt und {open_ === 1 ? 'zählt' : 'zählen'} nicht
            zum Fortschritt.
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
