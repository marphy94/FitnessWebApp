import type { Plan, ScheduledDay, Workout } from '../types'
import type { DataStore } from './store'

const KEY = 'fitness-webapp:v1'

interface Snapshot {
  plans: Plan[]
  workouts: Workout[]
  schedule: ScheduledDay[]
}

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { plans: [], workouts: [], schedule: [], ...JSON.parse(raw) }
  } catch {
    /* defekte oder gesperrte Daten → leer starten */
  }
  return { plans: [], workouts: [], schedule: [] }
}

function write(s: Snapshot) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id)
  if (i === -1) return [...list, item]
  const copy = list.slice()
  copy[i] = item
  return copy
}

function mutate(fn: (s: Snapshot) => Snapshot) {
  write(fn(read()))
  return Promise.resolve()
}

export const localStore: DataStore = {
  kind: 'local',
  loadAll: () => Promise.resolve(read()),
  savePlan: (plan) => mutate((s) => ({ ...s, plans: upsert(s.plans, plan) })),
  deletePlan: (id) =>
    mutate((s) => ({
      ...s,
      plans: s.plans.filter((p) => p.id !== id),
      schedule: s.schedule.filter((d) => d.planId !== id),
      workouts: s.workouts.map((w) => (w.planId === id ? { ...w, planId: null } : w)),
    })),
  saveWorkout: (w) => mutate((s) => ({ ...s, workouts: upsert(s.workouts, w) })),
  deleteWorkout: (id) => mutate((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) })),
  saveScheduledDay: (d) => mutate((s) => ({ ...s, schedule: upsert(s.schedule, d) })),
  deleteScheduledDay: (id) => mutate((s) => ({ ...s, schedule: s.schedule.filter((d) => d.id !== id) })),
}
