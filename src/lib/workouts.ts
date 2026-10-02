import type { Plan, Workout, WorkoutExercise } from '../types'
import { exerciseKey, today, uid } from './util'

/** Legt eine neue Trainingseinheit aus einem Plan an und speichert sie. */
export function startWorkout(
  data: { saveWorkout(w: Workout, o?: { immediate?: boolean }): void },
  plan: Plan,
  date = today(),
): Workout {
  const workout: Workout = {
    id: uid(),
    planId: plan.id,
    planName: plan.name,
    date,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exercises: plan.exercises.map((e) => ({
      id: uid(),
      name: e.name,
      restSeconds: e.restSeconds,
      sets: Array.from({ length: e.sets }, (_, i) => ({
        id: uid(),
        setNumber: i + 1,
        reps: e.reps,
        weight: e.weight,
        done: false,
      })),
    })),
  }
  data.saveWorkout(workout, { immediate: true })
  return workout
}

/** Letzte abgeschlossene Ausführung einer Übung vor dem angegebenen Training. */
export function lastPerformance(workouts: Workout[], name: string, excludeId: string): WorkoutExercise | null {
  const key = exerciseKey(name)
  const sorted = workouts
    .filter((w) => w.id !== excludeId && w.finishedAt)
    .sort((a, b) => (a.date === b.date ? b.startedAt.localeCompare(a.startedAt) : b.date.localeCompare(a.date)))
  for (const w of sorted) {
    const ex = w.exercises.find((e) => exerciseKey(e.name) === key && e.sets.some((s) => s.done))
    if (ex) return { ...ex, sets: ex.sets.filter((s) => s.done) }
  }
  return null
}

export function summarizeSets(ex: WorkoutExercise): string {
  const done = ex.sets
  if (!done.length) return '–'
  const sameWeight = done.every((s) => s.weight === done[0].weight)
  const sameReps = done.every((s) => s.reps === done[0].reps)
  if (sameWeight && sameReps) return `${done.length}×${done[0].reps} @ ${fmt(done[0].weight)} kg`
  return done.map((s) => `${s.reps}@${fmt(s.weight)}`).join(', ')
}

const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })

export interface ProgressEntry {
  date: string
  maxWeight: number
  volume: number
  bestSet: { reps: number; weight: number }
}

/** Alle Übungen mit mindestens einem erledigten Satz, nach Häufigkeit sortiert. */
export function trackedExercises(workouts: Workout[]): { key: string; name: string; count: number }[] {
  const map = new Map<string, { key: string; name: string; count: number }>()
  for (const w of workouts) {
    for (const e of w.exercises) {
      if (!e.sets.some((s) => s.done)) continue
      const key = exerciseKey(e.name)
      const entry = map.get(key) ?? { key, name: e.name.trim(), count: 0 }
      entry.count++
      map.set(key, entry)
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

/** Höchstes Gewicht und Volumen pro Trainingstag für eine Übung. */
export function progressFor(workouts: Workout[], key: string): ProgressEntry[] {
  const byDate = new Map<string, ProgressEntry>()
  for (const w of workouts) {
    for (const e of w.exercises) {
      if (exerciseKey(e.name) !== key) continue
      for (const s of e.sets) {
        if (!s.done) continue
        const entry = byDate.get(w.date) ?? { date: w.date, maxWeight: 0, volume: 0, bestSet: { reps: 0, weight: 0 } }
        entry.volume += s.weight * s.reps
        if (s.weight > entry.maxWeight || (s.weight === entry.maxWeight && s.reps > entry.bestSet.reps)) {
          entry.maxWeight = s.weight
          entry.bestSet = { reps: s.reps, weight: s.weight }
        }
        byDate.set(w.date, entry)
      }
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}
