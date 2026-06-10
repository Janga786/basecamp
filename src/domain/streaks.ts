import type { Profile, DailyLog, Habit } from '@/data/types'
import { assembleDay, dayProgress, habitDone, enabledHabits } from './schedule'
import { addDaysStr, daysBetween } from '@/lib/time'

export function logsByDate(logs: DailyLog[]): Record<string, DailyLog> {
  const m: Record<string, DailyLog> = {}
  for (const l of logs) m[l.log_date] = l
  return m
}

/**
 * Consecutive days ending at `today` where predicate(date) is true. Today gets a
 * grace pass: if not yet done it doesn't *extend* the streak but also doesn't
 * break it, so an in-progress day never shows a freshly-zeroed streak.
 */
export function streakBack(today: string, predicate: (date: string) => boolean): number {
  let streak = 0
  for (let i = 0; ; i++) {
    const d = addDaysStr(today, -i)
    if (predicate(d)) {
      streak++
    } else if (i === 0) {
      continue // today incomplete — grace
    } else {
      break
    }
  }
  return streak
}

function longestStreak(startDate: string, today: string, predicate: (date: string) => boolean): number {
  const span = Math.max(0, daysBetween(startDate, today))
  let best = 0
  let run = 0
  for (let i = 0; i <= span; i++) {
    const d = addDaysStr(startDate, i)
    if (predicate(d)) {
      run++
      if (run > best) best = run
    } else {
      run = 0
    }
  }
  return best
}

function earliestLogDate(logs: DailyLog[], today: string): string {
  if (logs.length === 0) return today
  return logs.reduce((min, l) => (l.log_date < min ? l.log_date : min), today)
}

export interface HabitStreak {
  habit: Habit
  current: number
  longest: number
  last30: { date: string; done: boolean; logged: boolean }[]
}

export function habitStreaks(profile: Profile, logs: DailyLog[], today: string): HabitStreak[] {
  const map = logsByDate(logs)
  const start = earliestLogDate(logs, today)
  return enabledHabits(profile).map((h) => {
    const pred = (d: string) => habitDone(map[d] ?? null, h)
    const last30 = Array.from({ length: 30 }, (_, k) => {
      const d = addDaysStr(today, -(29 - k))
      return { date: d, done: pred(d), logged: Boolean(map[d]) }
    })
    return {
      habit: h,
      current: streakBack(today, pred),
      longest: longestStreak(start, today, pred),
      last30,
    }
  })
}

/** A "perfect day": every scheduled item (training + enabled habits) done. */
export function isPerfectDay(profile: Profile, log: DailyLog | null, date: string): boolean {
  const plan = assembleDay(profile, date)
  return dayProgress(plan, log).isPerfect
}

export interface PerfectStreak {
  current: number
  longest: number
}

export function perfectDayStreak(profile: Profile, logs: DailyLog[], today: string): PerfectStreak {
  const map = logsByDate(logs)
  const start = earliestLogDate(logs, today)
  const pred = (d: string) => isPerfectDay(profile, map[d] ?? null, d)
  return {
    current: streakBack(today, pred),
    longest: longestStreak(start, today, pred),
  }
}
