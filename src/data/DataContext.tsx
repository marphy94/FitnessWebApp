import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Plan, ScheduledDay, Workout } from '../types'
import type { DataStore } from './store'

interface DataState {
  store: DataStore
  loading: boolean
  error: string | null
  plans: Plan[]
  workouts: Workout[]
  schedule: ScheduledDay[]
  savePlan(plan: Plan): void
  deletePlan(id: string): void
  /** Änderungen an laufenden Trainings werden gebündelt gespeichert. */
  saveWorkout(workout: Workout, opts?: { immediate?: boolean }): void
  deleteWorkout(id: string): void
  saveScheduledDay(day: ScheduledDay): void
  deleteScheduledDay(id: string): void
  dismissError(): void
}

const Ctx = createContext<DataState | null>(null)

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id)
  if (i === -1) return [...list, item]
  const copy = list.slice()
  copy[i] = item
  return copy
}

const WORKOUT_SAVE_DELAY = 700

export function DataProvider({ store, children }: { store: DataStore; children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [schedule, setSchedule] = useState<ScheduledDay[]>([])
  const pendingWorkouts = useRef(new Map<string, { workout: Workout; timer: number }>())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    store
      .loadAll()
      .then((d) => {
        if (cancelled) return
        setPlans(d.plans)
        setWorkouts(d.workouts)
        setSchedule(d.schedule)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [store])

  const run = useCallback((p: Promise<unknown>) => {
    p.catch((e: Error) => setError(`Speichern fehlgeschlagen: ${e.message}`))
  }, [])

  const flushWorkout = useCallback(
    (id: string) => {
      const pending = pendingWorkouts.current.get(id)
      if (!pending) return
      clearTimeout(pending.timer)
      pendingWorkouts.current.delete(id)
      run(store.saveWorkout(pending.workout))
    },
    [store, run],
  )

  // Ausstehende Speichervorgänge nicht verlieren, wenn die App in den Hintergrund geht.
  useEffect(() => {
    const flushAll = () => [...pendingWorkouts.current.keys()].forEach(flushWorkout)
    const onVisibility = () => document.visibilityState === 'hidden' && flushAll()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushAll)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushAll)
      flushAll()
    }
  }, [flushWorkout])

  const value = useMemo<DataState>(
    () => ({
      store,
      loading,
      error,
      plans,
      workouts,
      schedule,
      savePlan(plan) {
        setPlans((l) => upsert(l, plan))
        run(store.savePlan(plan))
      },
      deletePlan(id) {
        setPlans((l) => l.filter((p) => p.id !== id))
        setSchedule((l) => l.filter((d) => d.planId !== id))
        setWorkouts((l) => l.map((w) => (w.planId === id ? { ...w, planId: null } : w)))
        run(store.deletePlan(id))
      },
      saveWorkout(workout, opts) {
        setWorkouts((l) => upsert(l, workout))
        const prev = pendingWorkouts.current.get(workout.id)
        if (prev) clearTimeout(prev.timer)
        const timer = window.setTimeout(() => flushWorkout(workout.id), opts?.immediate ? 0 : WORKOUT_SAVE_DELAY)
        pendingWorkouts.current.set(workout.id, { workout, timer })
      },
      deleteWorkout(id) {
        const pending = pendingWorkouts.current.get(id)
        if (pending) clearTimeout(pending.timer)
        pendingWorkouts.current.delete(id)
        setWorkouts((l) => l.filter((w) => w.id !== id))
        run(store.deleteWorkout(id))
      },
      saveScheduledDay(day) {
        setSchedule((l) => upsert(l, day))
        run(store.saveScheduledDay(day))
      },
      deleteScheduledDay(id) {
        setSchedule((l) => l.filter((d) => d.id !== id))
        run(store.deleteScheduledDay(id))
      },
      dismissError: () => setError(null),
    }),
    [store, loading, error, plans, workouts, schedule, run, flushWorkout],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useData muss innerhalb von <DataProvider> verwendet werden')
  return v
}
