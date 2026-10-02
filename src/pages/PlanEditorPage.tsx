import { useEffect, useRef, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet'
import { NumberStepper } from '../components/NumberStepper'
import { SwipeableRow } from '../components/SwipeableRow'
import { useSnackbar } from '../components/Snackbar'
import { useData } from '../data/DataContext'
import { goBack, navigate } from '../hooks/useHashRoute'
import { formatDuration, uid, vibrate } from '../lib/util'
import { startWorkout } from '../lib/workouts'
import type { Plan, PlanExercise } from '../types'

const SUGGESTIONS = [
  'Bankdrücken',
  'Kniebeugen',
  'Kreuzheben',
  'Schulterdrücken',
  'Rudern',
  'Klimmzüge',
  'Latziehen',
  'Beinpresse',
  'Bizepscurls',
  'Trizepsdrücken',
  'Ausfallschritte',
  'Wadenheben',
]

const newExercise = (): PlanExercise => ({ id: uid(), name: '', sets: 3, reps: 10, weight: 20, restSeconds: 90 })

export function PlanEditorPage({ planId }: { planId: string }) {
  const data = useData()
  const snackbar = useSnackbar()
  const stored = data.plans.find((p) => p.id === planId)
  const [plan, setPlan] = useState<Plan>(
    () =>
      stored ?? {
        id: planId,
        name: '',
        exercises: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
  )
  const [editing, setEditing] = useState<PlanExercise | null>(null)
  const isNew = !stored

  // Automatisch speichern (leicht verzögert), sobald der Plan Inhalt hat.
  const savePlan = data.savePlan
  const lastSaved = useRef(stored)
  useEffect(() => {
    if (plan === lastSaved.current) return
    if (!plan.name.trim() && plan.exercises.length === 0) return
    const t = window.setTimeout(() => {
      const toSave = { ...plan, name: plan.name.trim() || 'Neuer Plan', updatedAt: new Date().toISOString() }
      lastSaved.current = plan
      savePlan(toSave)
    }, 400)
    return () => window.clearTimeout(t)
  }, [plan, savePlan])

  const update = (patch: Partial<Plan>) => setPlan((p) => ({ ...p, ...patch }))
  const setExercises = (fn: (l: PlanExercise[]) => PlanExercise[]) =>
    setPlan((p) => ({ ...p, exercises: fn(p.exercises) }))

  const saveExercise = (ex: PlanExercise) => {
    const named = { ...ex, name: ex.name.trim() || 'Übung' }
    setExercises((l) => (l.some((e) => e.id === ex.id) ? l.map((e) => (e.id === ex.id ? named : e)) : [...l, named]))
    setEditing(null)
  }

  const removeExercise = (ex: PlanExercise) => {
    const index = plan.exercises.findIndex((e) => e.id === ex.id)
    setExercises((l) => l.filter((e) => e.id !== ex.id))
    snackbar({
      text: `„${ex.name}“ entfernt`,
      actionLabel: 'Rückgängig',
      onAction: () => setExercises((l) => [...l.slice(0, index), ex, ...l.slice(index)]),
    })
  }

  return (
    <main className="page">
      <header className="page__header page__header--sub">
        <button className="icon-btn" aria-label="Zurück" onClick={() => goBack('plans')}>
          ‹
        </button>
        <h1>{isNew && !plan.name ? 'Neuer Plan' : 'Plan bearbeiten'}</h1>
      </header>

      <label className="field">
        <span>Name des Plans</span>
        <input
          value={plan.name}
          placeholder="z. B. Oberkörper A"
          autoFocus={isNew}
          onChange={(e) => update({ name: e.target.value })}
          enterKeyHint="done"
        />
      </label>

      <h2 className="section-title">Übungen</h2>
      {plan.exercises.length === 0 ? (
        <p className="muted empty-inline">Füge die erste Übung hinzu.</p>
      ) : (
        <ReorderList
          items={plan.exercises}
          onReorder={(items) => setExercises(() => items)}
          render={(ex, handle) => (
            <SwipeableRow onDelete={() => removeExercise(ex)} deleteLabel="Entfernen">
              <div className="card exercise-card">
                {handle}
                <button className="exercise-card__main" onClick={() => setEditing(ex)}>
                  <strong>{ex.name}</strong>
                  <span className="exercise-card__meta">
                    <span>
                      {ex.sets} × {ex.reps}
                    </span>
                    <span>{ex.weight.toLocaleString('de-DE')} kg</span>
                    <span>Pause {formatDuration(ex.restSeconds)}</span>
                  </span>
                </button>
              </div>
            </SwipeableRow>
          )}
        />
      )}

      <button className="btn btn--ghost btn--block" onClick={() => setEditing(newExercise())}>
        + Übung hinzufügen
      </button>

      {plan.exercises.length > 0 && (
        <>
          <p className="hint">Halten &amp; ziehen am Griff ⋮⋮ zum Sortieren · nach links wischen zum Entfernen</p>
          <button
            className="btn btn--primary btn--block"
            onClick={() => {
              const toSave = { ...plan, name: plan.name.trim() || 'Neuer Plan', updatedAt: new Date().toISOString() }
              lastSaved.current = plan
              data.savePlan(toSave)
              navigate(`workout/${startWorkout(data, toSave).id}`, { replace: true })
            }}
          >
            Training starten
          </button>
        </>
      )}

      <ExerciseSheet exercise={editing} onClose={() => setEditing(null)} onSave={saveExercise} />
    </main>
  )
}

function ExerciseSheet({
  exercise,
  onClose,
  onSave,
}: {
  exercise: PlanExercise | null
  onClose: () => void
  onSave: (e: PlanExercise) => void
}) {
  const [draft, setDraft] = useState<PlanExercise | null>(exercise)
  useEffect(() => setDraft(exercise), [exercise])
  if (!draft) return null
  const set = (patch: Partial<PlanExercise>) => setDraft({ ...draft, ...patch })

  return (
    <BottomSheet open={!!exercise} title={draft.name || 'Übung'} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(draft)
        }}
      >
        <label className="field">
          <span>Übung</span>
          <input
            value={draft.name}
            list="exercise-suggestions"
            placeholder="z. B. Bankdrücken"
            autoFocus={!draft.name}
            onChange={(e) => set({ name: e.target.value })}
          />
          <datalist id="exercise-suggestions">
            {SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <div className="grid-2">
          <NumberStepper label="Sätze" value={draft.sets} min={1} max={20} step={1} onChange={(sets) => set({ sets })} />
          <NumberStepper label="Wiederholungen" value={draft.reps} min={0} max={100} step={1} onChange={(reps) => set({ reps })} />
          <NumberStepper
            label="Gewicht"
            unit="kg"
            value={draft.weight}
            min={0}
            max={999}
            step={2.5}
            decimals={2}
            onChange={(weight) => set({ weight })}
          />
          <NumberStepper
            label="Pause"
            unit="s"
            value={draft.restSeconds}
            min={0}
            max={900}
            step={15}
            onChange={(restSeconds) => set({ restSeconds })}
          />
        </div>
        <button className="btn btn--primary btn--block" type="submit">
          Übernehmen
        </button>
      </form>
    </BottomSheet>
  )
}

/** Liste, deren Einträge sich über einen Griff per Ziehen (Maus oder Finger) umsortieren lassen. */
function ReorderList<T extends { id: string }>({
  items,
  onReorder,
  render,
}: {
  items: T[]
  onReorder: (items: T[]) => void
  render: (item: T, handle: React.ReactNode) => React.ReactNode
}) {
  const [drag, setDrag] = useState<{ id: string; from: number; dy: number; rowH: number } | null>(null)
  const startY = useRef(0)

  const target = drag ? Math.max(0, Math.min(items.length - 1, drag.from + Math.round(drag.dy / drag.rowH))) : -1

  return (
    <ul className="list">
      {items.map((item, i) => {
        let shift = 0
        if (drag && item.id !== drag.id) {
          if (drag.from < target && i > drag.from && i <= target) shift = -drag.rowH
          if (drag.from > target && i < drag.from && i >= target) shift = drag.rowH
        }
        const isDragged = drag?.id === item.id
        const handle = (
          <span
            className="drag-handle"
            role="button"
            aria-label="Verschieben"
            tabIndex={0}
            onKeyDown={(e) => {
              const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
              const to = i + dir
              if (!dir || to < 0 || to >= items.length) return
              e.preventDefault()
              const next = items.slice()
              next.splice(to, 0, next.splice(i, 1)[0])
              onReorder(next)
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              e.currentTarget.setPointerCapture(e.pointerId)
              const li = e.currentTarget.closest('li')!
              const gap = parseFloat(getComputedStyle(li.parentElement!).rowGap) || 0
              startY.current = e.clientY
              setDrag({ id: item.id, from: i, dy: 0, rowH: li.offsetHeight + gap })
              vibrate(10)
            }}
            onPointerMove={(e) => {
              e.stopPropagation()
              if (drag) setDrag({ ...drag, dy: e.clientY - startY.current })
            }}
            onPointerUp={(e) => {
              e.stopPropagation()
              if (drag && target !== drag.from) {
                const next = items.slice()
                next.splice(target, 0, next.splice(drag.from, 1)[0])
                onReorder(next)
              }
              setDrag(null)
            }}
            onPointerCancel={() => setDrag(null)}
          >
            ⋮⋮
          </span>
        )
        return (
          <li
            key={item.id}
            className={isDragged ? 'is-dragging' : undefined}
            style={{
              transform: `translateY(${isDragged ? drag!.dy : shift}px)`,
              transition: isDragged ? 'none' : drag ? 'transform 150ms ease' : 'none',
            }}
          >
            {render(item, handle)}
          </li>
        )
      })}
    </ul>
  )
}
