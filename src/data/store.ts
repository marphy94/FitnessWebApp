import type { Plan, ScheduledDay, Workout } from '../types'

/** Persistenz-Schnittstelle – lokal (localStorage) oder Supabase. */
export interface DataStore {
  readonly kind: 'local' | 'supabase'
  loadAll(): Promise<{ plans: Plan[]; workouts: Workout[]; schedule: ScheduledDay[] }>
  savePlan(plan: Plan): Promise<void>
  deletePlan(id: string): Promise<void>
  saveWorkout(workout: Workout): Promise<void>
  deleteWorkout(id: string): Promise<void>
  saveScheduledDay(day: ScheduledDay): Promise<void>
  deleteScheduledDay(id: string): Promise<void>
}
