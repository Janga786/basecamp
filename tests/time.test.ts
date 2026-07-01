import { describe, it, expect } from 'vitest'
import {
  logicalDateStr,
  weekdayOf,
  daysBetween,
  addDaysStr,
  weekStartStr,
  prettyDate,
} from '@/lib/time'

const DENVER = 'America/Denver'

describe('logicalDateStr', () => {
  it('returns the calendar date during normal daytime hours', () => {
    // 2026-06-09 14:00 MDT == 20:00 UTC
    expect(logicalDateStr(new Date('2026-06-09T20:00:00Z'), DENVER, 3)).toBe('2026-06-09')
  })

  it('counts late night (before rollover hour) as the previous day', () => {
    // 2026-06-10 01:30 MDT == 07:30 UTC — before 3 AM rollover → still "June 9"
    expect(logicalDateStr(new Date('2026-06-10T07:30:00Z'), DENVER, 3)).toBe('2026-06-09')
  })

  it('flips to the new day exactly at the rollover hour', () => {
    // 2026-06-10 03:00 MDT == 09:00 UTC
    expect(logicalDateStr(new Date('2026-06-10T09:00:00Z'), DENVER, 3)).toBe('2026-06-10')
    // one second before
    expect(logicalDateStr(new Date('2026-06-10T08:59:59Z'), DENVER, 3)).toBe('2026-06-09')
  })

  it('honors a rollover hour of 0 (plain calendar day)', () => {
    expect(logicalDateStr(new Date('2026-06-10T06:00:01Z'), DENVER, 0)).toBe('2026-06-10') // 00:00:01 MDT
    expect(logicalDateStr(new Date('2026-06-10T05:59:59Z'), DENVER, 0)).toBe('2026-06-09') // 23:59:59 MDT
  })

  it('works across the spring-forward DST night', () => {
    // DST starts 2026-03-08 02:00 in Denver (MST→MDT). 01:30 MST == 08:30 UTC.
    // Before the 3 AM rollover → logical day is Saturday the 7th.
    expect(logicalDateStr(new Date('2026-03-08T08:30:00Z'), DENVER, 3)).toBe('2026-03-07')
    // 04:00 MDT == 10:00 UTC → past rollover → the 8th.
    expect(logicalDateStr(new Date('2026-03-08T10:00:00Z'), DENVER, 3)).toBe('2026-03-08')
  })

  it('works across the fall-back DST night', () => {
    // DST ends 2026-11-01 02:00 MDT in Denver. 01:30 MDT (first pass) == 07:30 UTC.
    expect(logicalDateStr(new Date('2026-11-01T07:30:00Z'), DENVER, 3)).toBe('2026-10-31')
    // 04:00 MST == 11:00 UTC → past rollover → Nov 1.
    expect(logicalDateStr(new Date('2026-11-01T11:00:00Z'), DENVER, 3)).toBe('2026-11-01')
  })
})

describe('weekdayOf', () => {
  it('maps known dates to weekdays', () => {
    expect(weekdayOf('2026-06-07')).toBe(0) // Sunday
    expect(weekdayOf('2026-06-08')).toBe(1) // Monday
    expect(weekdayOf('2026-06-13')).toBe(6) // Saturday
  })
})

describe('daysBetween / addDaysStr', () => {
  it('computes whole-day differences', () => {
    expect(daysBetween('2026-06-01', '2026-06-09')).toBe(8)
    expect(daysBetween('2026-06-09', '2026-06-01')).toBe(-8)
    expect(daysBetween('2026-06-09', '2026-06-09')).toBe(0)
  })

  it('crosses month and year boundaries', () => {
    expect(addDaysStr('2026-05-31', 1)).toBe('2026-06-01')
    expect(addDaysStr('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDaysStr('2026-02-28', 1)).toBe('2026-03-01') // 2026 not a leap year
  })

  it('is unaffected by DST transitions (calendar-day math)', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(addDaysStr('2026-03-07', 2)).toBe('2026-03-09')
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
  })
})

describe('weekStartStr', () => {
  it('returns Monday for any day of the week', () => {
    expect(weekStartStr('2026-06-08')).toBe('2026-06-08') // Monday itself
    expect(weekStartStr('2026-06-09')).toBe('2026-06-08') // Tuesday
    expect(weekStartStr('2026-06-13')).toBe('2026-06-08') // Saturday
    expect(weekStartStr('2026-06-14')).toBe('2026-06-08') // Sunday → previous Monday
  })
})

describe('prettyDate', () => {
  it('formats without timezone drift', () => {
    expect(prettyDate('2026-06-09')).toBe('Tuesday, Jun 9')
  })
})
