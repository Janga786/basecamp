import { describe, it, expect } from 'vitest'
import { streakBack, habitStreaks, perfectDayStreak, logsByDate } from '@/domain/streaks'
import { emptyLog } from '@/data/queries'
import { DEFAULT_PROFILE } from '@/data/seed/profile'
import type { DailyLog, Profile } from '@/data/types'

const TODAY = '2026-06-09'

function logWith(date: string, patch: Partial<DailyLog> = {}): DailyLog {
  return { ...emptyLog(date), ...patch }
}

describe('streakBack', () => {
  it('counts consecutive done days ending today', () => {
    const done = new Set(['2026-06-09', '2026-06-08', '2026-06-07'])
    expect(streakBack(TODAY, (d) => done.has(d))).toBe(3)
  })

  it("gives today a grace pass when it isn't done yet", () => {
    const done = new Set(['2026-06-08', '2026-06-07'])
    expect(streakBack(TODAY, (d) => done.has(d))).toBe(2)
  })

  it('breaks on a gap before today', () => {
    const done = new Set(['2026-06-09', '2026-06-07']) // missed the 8th
    expect(streakBack(TODAY, (d) => done.has(d))).toBe(1)
  })

  it('returns 0 with nothing done', () => {
    expect(streakBack(TODAY, () => false)).toBe(0)
  })
})

describe('perfectDayStreak', () => {
  // Profile with only one enabled habit on rest days would still need all habits;
  // use a minimal profile: disable everything except one daily toggle habit and
  // make every day a rest day so "perfect" == that one habit done.
  const profile: Profile = {
    ...DEFAULT_PROFILE,
    settings: {
      ...DEFAULT_PROFILE.settings,
      disabled_core_habits: [
        'sleep-window', 'last-meal-3hr', 'wind-down', 'no-late-caffeine',
        'protein-target', 'steps', 'desk-breaks', 'mobility',
      ],
      enabled_optional_habits: [],
      weekly_template: DEFAULT_PROFILE.settings.weekly_template.map((d) => ({ ...d, lift_day_index: null })),
    },
  }
  // Only 'morning-light' remains enabled.
  const doneLog = (date: string) =>
    logWith(date, { checklist: [{ habit_id: 'morning-light', done: true }] })

  it('counts a run of perfect days', () => {
    const logs = [doneLog('2026-06-07'), doneLog('2026-06-08'), doneLog('2026-06-09')]
    const s = perfectDayStreak(profile, logs, TODAY)
    expect(s.current).toBe(3)
    expect(s.longest).toBe(3)
  })

  it('longest survives a broken current streak', () => {
    const logs = [doneLog('2026-06-04'), doneLog('2026-06-05'), doneLog('2026-06-06')]
    const s = perfectDayStreak(profile, logs, TODAY)
    expect(s.current).toBe(0)
    expect(s.longest).toBe(3)
  })
})

describe('habitStreaks', () => {
  it('produces a 30-day grid ending today', () => {
    const profile = DEFAULT_PROFILE
    const logs = [logWith('2026-06-09', { checklist: [{ habit_id: 'morning-light', done: true }] })]
    const streaks = habitStreaks(profile, logs, TODAY)
    const ml = streaks.find((s) => s.habit.id === 'morning-light')!
    expect(ml.last30).toHaveLength(30)
    expect(ml.last30[29].date).toBe(TODAY)
    expect(ml.last30[29].done).toBe(true)
    expect(ml.last30[0].date).toBe('2026-05-11')
    expect(ml.current).toBe(1)
  })
})

describe('logsByDate', () => {
  it('indexes logs by date', () => {
    const logs = [logWith('2026-06-01'), logWith('2026-06-02')]
    const m = logsByDate(logs)
    expect(Object.keys(m)).toEqual(['2026-06-01', '2026-06-02'])
  })
})
