import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan, ScheduledDay, Workout } from '../types'
import type { DataStore } from './store'

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

function rows<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  return check(res) ?? []
}

/** Löscht alle Kindzeilen eines Elternteils, die nicht mehr in `keepIds` vorkommen. */
async function pruneChildren(
  db: SupabaseClient,
  table: string,
  parentColumn: string,
  parentId: string,
  keepIds: string[],
) {
  let q = db.from(table).delete().eq(parentColumn, parentId)
  if (keepIds.length) q = q.not('id', 'in', `(${keepIds.join(',')})`)
  check(await q)
}

export function createSupabaseStore(db: SupabaseClient): DataStore {
  return {
    kind: 'supabase',

    async loadAll() {
      const [plans, workouts, schedule] = await Promise.all([
        db
          .from('plans')
          .select('id, name, created_at, updated_at, plan_exercises (id, position, name, sets, reps, weight, rest_seconds)')
          .order('created_at'),
        db
          .from('workouts')
          .select(
            'id, plan_id, plan_name, date, started_at, finished_at, workout_exercises (id, position, name, rest_seconds, workout_sets (id, set_number, reps, weight, done))',
          )
          .order('date'),
        db.from('scheduled_days').select('id, date, plan_id').order('date'),
      ])

      const byPos = (a: { position: number }, b: { position: number }) => a.position - b.position

      return {
        plans: rows(plans).map((p) => ({
          id: p.id,
          name: p.name,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          exercises: [...p.plan_exercises].sort(byPos).map((e) => ({
            id: e.id,
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            weight: Number(e.weight),
            restSeconds: e.rest_seconds,
          })),
        })),
        workouts: rows(workouts).map((w) => ({
          id: w.id,
          planId: w.plan_id,
          planName: w.plan_name,
          date: w.date,
          startedAt: w.started_at,
          finishedAt: w.finished_at,
          exercises: [...w.workout_exercises].sort(byPos).map((e) => ({
            id: e.id,
            name: e.name,
            restSeconds: e.rest_seconds,
            sets: [...e.workout_sets]
              .sort((a, b) => a.set_number - b.set_number)
              .map((s) => ({
                id: s.id,
                setNumber: s.set_number,
                reps: s.reps,
                weight: Number(s.weight),
                done: s.done,
              })),
          })),
        })),
        schedule: rows(schedule).map((d) => ({ id: d.id, date: d.date, planId: d.plan_id })),
      }
    },

    async savePlan(plan: Plan) {
      check(
        await db
          .from('plans')
          .upsert({ id: plan.id, name: plan.name, created_at: plan.createdAt, updated_at: plan.updatedAt }),
      )
      await pruneChildren(db, 'plan_exercises', 'plan_id', plan.id, plan.exercises.map((e) => e.id))
      if (plan.exercises.length) {
        check(
          await db.from('plan_exercises').upsert(
            plan.exercises.map((e, position) => ({
              id: e.id,
              plan_id: plan.id,
              position,
              name: e.name,
              sets: e.sets,
              reps: e.reps,
              weight: e.weight,
              rest_seconds: e.restSeconds,
            })),
          ),
        )
      }
    },

    async deletePlan(id) {
      check(await db.from('plans').delete().eq('id', id))
    },

    async saveWorkout(w: Workout) {
      check(
        await db.from('workouts').upsert({
          id: w.id,
          plan_id: w.planId,
          plan_name: w.planName,
          date: w.date,
          started_at: w.startedAt,
          finished_at: w.finishedAt,
        }),
      )
      await pruneChildren(db, 'workout_exercises', 'workout_id', w.id, w.exercises.map((e) => e.id))
      if (!w.exercises.length) return
      check(
        await db.from('workout_exercises').upsert(
          w.exercises.map((e, position) => ({
            id: e.id,
            workout_id: w.id,
            position,
            name: e.name,
            rest_seconds: e.restSeconds,
          })),
        ),
      )
      for (const e of w.exercises) {
        await pruneChildren(db, 'workout_sets', 'workout_exercise_id', e.id, e.sets.map((s) => s.id))
      }
      const sets = w.exercises.flatMap((e) =>
        e.sets.map((s) => ({
          id: s.id,
          workout_exercise_id: e.id,
          set_number: s.setNumber,
          reps: s.reps,
          weight: s.weight,
          done: s.done,
        })),
      )
      if (sets.length) check(await db.from('workout_sets').upsert(sets))
    },

    async deleteWorkout(id) {
      check(await db.from('workouts').delete().eq('id', id))
    },

    async saveScheduledDay(d: ScheduledDay) {
      check(await db.from('scheduled_days').upsert({ id: d.id, date: d.date, plan_id: d.planId }))
    },

    async deleteScheduledDay(id) {
      check(await db.from('scheduled_days').delete().eq('id', id))
    },
  }
}
