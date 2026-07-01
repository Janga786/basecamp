import { describe, it, expect } from 'vitest'
import { getLiftDay, getLiftWeek, lastExerciseSets, LIFT_TOTAL_WEEKS } from '@/domain/programs'
import { LIFT_PROGRAM } from '@/data/seed/liftProgram'
import { emptyLog } from '@/data/queries'
import type { DailyLog, WorkoutSetLog } from '@/data/types'

describe('lift program data integrity', () => {
  it('contains all 12 weeks × 5 days', () => {
    expect(LIFT_TOTAL_WEEKS).toBe(12)
    for (let w = 1; w <= 12; w++) {
      const days = getLiftWeek(w)
      expect(days.map((d) => d.day_index)).toEqual([1, 2, 3, 4, 5])
    }
    expect(LIFT_PROGRAM).toHaveLength(60)
  })

  it('every day has exercises with names and set/rep prescriptions', () => {
    for (const day of LIFT_PROGRAM) {
      expect(day.exercises.length).toBeGreaterThan(0)
      for (const ex of day.exercises) {
        expect(ex.name).toBeTruthy()
        expect(ex.working_sets).toBeTruthy()
        expect(ex.reps).toBeTruthy()
      }
    }
  })

  it('getLiftDay returns null off the grid', () => {
    expect(getLiftDay(13, 1)).toBeNull()
    expect(getLiftDay(1, 6)).toBeNull()
  })
})

describe('lastExerciseSets', () => {
  const set = (exercise_name: string, set_index: number, weight: number | null, reps: number | null): WorkoutSetLog => ({
    exercise_name, set_index, weight, reps, rpe: null, done: true,
  })
  const logOn = (date: string, sets: WorkoutSetLog[]): DailyLog => ({
    ...emptyLog(date), lift_session: sets,
  })

  it('returns the most recent prior session for the exercise', () => {
    const logs = [
      logOn('2026-06-01', [set('Bench', 1, 135, 8), set('Bench', 2, 135, 7)]),
      logOn('2026-06-05', [set('Bench', 1, 140, 8)]),
      logOn('2026-06-09', [set('Bench', 1, 145, 8)]), // today — must be excluded
    ]
    const last = lastExerciseSets('Bench', logs, '2026-06-09')
    expect(last[1]?.weight).toBe(140)
    expect(last[2]).toBeUndefined() // June 5 session only logged one set
  })

  it('skips sessions where the exercise has only empty rows', () => {
    const logs = [
      logOn('2026-06-01', [set('Bench', 1, 135, 8)]),
      logOn('2026-06-05', [set('Bench', 1, null, null)]), // checked but nothing entered
    ]
    const last = lastExerciseSets('Bench', logs, '2026-06-09')
    expect(last[1]?.weight).toBe(135)
  })

  it('returns {} with no history', () => {
    expect(lastExerciseSets('Bench', [], '2026-06-09')).toEqual({})
  })
})
