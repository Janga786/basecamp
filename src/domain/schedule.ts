import type { Profile, Habit, WorkoutDay, DailyLog, WeeklyTemplateDay } from '@/data/types'
import { HABITS } from '@/data/seed/habits'
import { getLiftDay, LIFT_TOTAL_WEEKS } from './programs'
import { daysBetween, weekdayOf } from '@/lib/time'

export type LiftStatus = 'not_started' | 'active' | 'completed'

export interface TodayPlan {
  date: string
  weekday: number
  liftWeek: number // clamped 1..12
  liftStatus: LiftStatus
  liftDayIndex: number | null
  workout: WorkoutDay | null
  restLabel: string | null
  isRefeed: boolean
  habits: Habit[]
}

/** The user's active habit set: core (minus disabled) + enabled optional, sorted. */
export function enabledHabits(profile: Profile): Habit[] {
  const { disabled_core_habits, enabled_optional_habits } = profile.settings
  return HABITS.filter((h) =>
    h.optional ? enabled_optional_habits.includes(h.id) : !disabled_core_habits.includes(h.id),
  ).sort((a, b) => a.sort_order - b.sort_order)
}

function templateForWeekday(profile: Profile, weekday: number): WeeklyTemplateDay {
  return (
    profile.settings.weekly_template.find((t) => t.weekday === weekday) ?? {
      weekday,
      lift_day_index: null,
    }
  )
}

/** Lift program week (1-indexed) for a given logical date, plus status. */
export function liftWeekFor(profile: Profile, date: string): { week: number; status: LiftStatus } {
  const diff = daysBetween(profile.lift_start_date, date)
  if (diff < 0) return { week: 1, status: 'not_started' }
  const raw = Math.floor(diff / 7) + 1
  if (raw > LIFT_TOTAL_WEEKS) return { week: LIFT_TOTAL_WEEKS, status: 'completed' }
  return { week: raw, status: 'active' }
}

/** Assemble the full plan for a logical date — pure, no persistence. */
export function assembleDay(profile: Profile, date: string): TodayPlan {
  const weekday = weekdayOf(date)
  const tmpl = templateForWeekday(profile, weekday)
  const { week: liftWeek, status: liftStatus } = liftWeekFor(profile, date)

  const liftDayIndex = tmpl.lift_day_index
  const workout = liftDayIndex ? getLiftDay(liftWeek, liftDayIndex) : null
  const restLabel = liftDayIndex ? null : tmpl.label ?? 'Rest / active recovery'

  return {
    date,
    weekday,
    liftWeek,
    liftStatus,
    liftDayIndex,
    workout,
    restLabel,
    isRefeed: weekday === profile.refeed_weekday,
    habits: enabledHabits(profile),
  }
}

// ── Progress ──────────────────────────────────────────────────────────────────

export interface DayItem {
  key: string
  kind: 'lift' | 'habit'
  label: string
  done: boolean
}

export function habitDone(log: DailyLog | null, habit: Habit): boolean {
  if (!log) return false
  const item = log.checklist.find((c) => c.habit_id === habit.id)
  if (!item) return false
  // Multi-step habits are done when all steps are checked.
  if (habit.steps && habit.steps.length > 0) {
    return habit.steps.every((s) => item.steps?.[s.id])
  }
  return item.done
}

/** Every check-off-able item scheduled for the day, with completion state. */
export function dayItems(plan: TodayPlan, log: DailyLog | null): DayItem[] {
  const items: DayItem[] = []
  if (plan.workout) {
    items.push({ key: 'lift', kind: 'lift', label: plan.workout.day_label, done: Boolean(log?.lift_done) })
  }
  for (const h of plan.habits) {
    items.push({ key: `habit:${h.id}`, kind: 'habit', label: h.label, done: habitDone(log, h) })
  }
  return items
}

export interface DayProgress {
  completed: number
  total: number
  pct: number
  isPerfect: boolean
}

export function dayProgress(plan: TodayPlan, log: DailyLog | null): DayProgress {
  const items = dayItems(plan, log)
  const total = items.length
  const completed = items.filter((i) => i.done).length
  return {
    completed,
    total,
    pct: total === 0 ? 0 : Math.round((completed / total) * 100),
    isPerfect: total > 0 && completed === total,
  }
}
