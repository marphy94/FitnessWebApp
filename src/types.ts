export interface PlanExercise {
  id: string
  name: string
  sets: number
  reps: number
  weight: number
  restSeconds: number
}

export interface Plan {
  id: string
  name: string
  exercises: PlanExercise[]
  createdAt: string
  updatedAt: string
}

export interface WorkoutSet {
  id: string
  setNumber: number
  reps: number
  weight: number
  done: boolean
}

export interface WorkoutExercise {
  id: string
  name: string
  restSeconds: number
  sets: WorkoutSet[]
}

export interface Workout {
  id: string
  planId: string | null
  planName: string
  /** Kalendertag im Format YYYY-MM-DD */
  date: string
  startedAt: string
  finishedAt: string | null
  exercises: WorkoutExercise[]
}

export interface ScheduledDay {
  id: string
  date: string
  planId: string | null
}
