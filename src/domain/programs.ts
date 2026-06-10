import { LIFT_PROGRAM, LIFT_TOTAL_WEEKS } from '@/data/seed/liftProgram'
import type { WorkoutDay, DailyLog, WorkoutSetLog } from '@/data/types'

export { LIFT_TOTAL_WEEKS }

export function getLiftDay(week: number, dayIndex: number): WorkoutDay | null {
  return LIFT_PROGRAM.find((d) => d.week === week && d.day_index === dayIndex) ?? null
}

export function getLiftWeek(week: number): WorkoutDay[] {
  return LIFT_PROGRAM.filter((d) => d.week === week).sort((a, b) => a.day_index - b.day_index)
}

/**
 * The most recent prior session's logged sets for a given exercise, keyed by
 * set_index — used to pre-fill weight/reps (Hevy's "previous" column). Scans
 * earlier daily logs backward from `beforeDate`.
 */
export function lastExerciseSets(
  exerciseName: string,
  logs: DailyLog[],
  beforeDate: string,
): Record<number, WorkoutSetLog> {
  const prior = logs
    .filter((l) => l.log_date < beforeDate && l.lift_session && l.lift_session.length > 0)
    .sort((a, b) => b.log_date.localeCompare(a.log_date))
  for (const log of prior) {
    const sets = log.lift_session!.filter((s) => s.exercise_name === exerciseName && (s.weight != null || s.reps != null))
    if (sets.length > 0) {
      const byIndex: Record<number, WorkoutSetLog> = {}
      for (const s of sets) byIndex[s.set_index] = s
      return byIndex
    }
  }
  return {}
}

export const DAY_TYPE_SHORT: Record<number, string> = {
  1: 'Upper',
  2: 'Lower',
  3: 'Pull',
  4: 'Push',
  5: 'Legs',
}

export const DAY_TYPE_FULL: Record<number, string> = {
  1: 'Upper (Strength)',
  2: 'Lower (Strength)',
  3: 'Pull (Hypertrophy)',
  4: 'Push (Hypertrophy)',
  5: 'Legs (Hypertrophy)',
}
