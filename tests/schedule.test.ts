import { describe, it, expect } from 'vitest'
import { assembleDay, dayProgress, liftWeekFor, enabledHabits, habitDone } from '@/domain/schedule'
import { DEFAULT_PROFILE } from '@/data/seed/profile'
import { emptyLog } from '@/data/queries'
import { HABITS } from '@/data/seed/habits'
import type { Profile } from '@/data/types'

// lift_start_date in the default profile is 2026-06-01 (a Monday).
const profile: Profile = DEFAULT_PROFILE

describe('liftWeekFor', () => {
  it('is not_started before the start date', () => {
    expect(liftWeekFor(profile, '2026-05-31')).toEqual({ week: 1, status: 'not_started' })
  })

  it('is week 1 during the first week', () => {
    expect(liftWeekFor(profile, '2026-06-01')).toEqual({ week: 1, status: 'active' })
    expect(liftWeekFor(profile, '2026-06-07')).toEqual({ week: 1, status: 'active' })
  })

  it('advances weekly', () => {
    expect(liftWeekFor(profile, '2026-06-08')).toEqual({ week: 2, status: 'active' })
    expect(liftWeekFor(profile, '2026-06-09')).toEqual({ week: 2, status: 'active' })
  })

  it('completes after 12 weeks', () => {
    // Week 12 ends 2026-08-23; the 24th starts week 13 → completed.
    expect(liftWeekFor(profile, '2026-08-23').status).toBe('active')
    expect(liftWeekFor(profile, '2026-08-24')).toEqual({ week: 12, status: 'completed' })
  })
})

describe('assembleDay', () => {
  it('schedules the right program day from the weekly template', () => {
    const mon = assembleDay(profile, '2026-06-08') // Monday → Upper (day 1), week 2
    expect(mon.workout).not.toBeNull()
    expect(mon.workout!.week).toBe(2)
    expect(mon.workout!.day_index).toBe(1)
    expect(mon.restLabel).toBeNull()
  })

  it('gives rest days a label and no workout', () => {
    const sun = assembleDay(profile, '2026-06-14') // Sunday → Full rest
    expect(sun.workout).toBeNull()
    expect(sun.restLabel).toBe('Full rest')
  })

  it('marks the refeed weekday', () => {
    const sat = assembleDay(profile, '2026-06-13') // Saturday = refeed_weekday 6
    expect(sat.isRefeed).toBe(true)
    expect(assembleDay(profile, '2026-06-10').isRefeed).toBe(false)
  })
})

describe('enabledHabits', () => {
  it('includes core habits and excludes optional by default', () => {
    const ids = enabledHabits(profile).map((h) => h.id)
    expect(ids).toContain('sleep-window')
    expect(ids).toContain('mobility')
    expect(ids).not.toContain('sauna')
  })

  it('honors disables and optional enables', () => {
    const p: Profile = {
      ...profile,
      settings: { ...profile.settings, disabled_core_habits: ['mobility'], enabled_optional_habits: ['sauna'] },
    }
    const ids = enabledHabits(p).map((h) => h.id)
    expect(ids).not.toContain('mobility')
    expect(ids).toContain('sauna')
  })
})

describe('habitDone / dayProgress', () => {
  it('multi-step habit requires every step', () => {
    const mobility = HABITS.find((h) => h.id === 'mobility')!
    const log = emptyLog('2026-06-09')
    log.checklist = [{ habit_id: 'mobility', done: true, steps: { 'chin-tucks': true } }]
    // done flag alone is not enough — steps gate it
    expect(habitDone(log, mobility)).toBe(false)
    log.checklist = [{
      habit_id: 'mobility',
      done: true,
      steps: Object.fromEntries(mobility.steps!.map((s) => [s.id, true])),
    }]
    expect(habitDone(log, mobility)).toBe(true)
  })

  it('progress counts lift + enabled habits and caps at 100', () => {
    const plan = assembleDay(profile, '2026-06-08') // Monday: lift + 9 core habits
    const log = emptyLog('2026-06-08')
    const none = dayProgress(plan, log)
    expect(none.completed).toBe(0)
    expect(none.total).toBe(1 + enabledHabits(profile).length)
    expect(none.isPerfect).toBe(false)

    log.lift_done = true
    log.checklist = enabledHabits(profile).map((h) => ({
      habit_id: h.id,
      done: true,
      ...(h.steps ? { steps: Object.fromEntries(h.steps.map((s) => [s.id, true])) } : {}),
    }))
    const all = dayProgress(plan, log)
    expect(all.pct).toBe(100)
    expect(all.isPerfect).toBe(true)
  })
})
