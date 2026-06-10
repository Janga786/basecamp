import { formatInTimeZone } from 'date-fns-tz'
import { addDays, differenceInCalendarDays, parseISO, format } from 'date-fns'

export const DEFAULT_TZ = 'America/Denver'
export const DEFAULT_ROLLOVER_HOUR = 3

/**
 * The "logical" local date string (yyyy-MM-dd) for a given instant, honoring a
 * day-rollover hour (default 3 AM local). A late-night log before 3 AM still
 * counts for the previous calendar day.
 */
export function logicalDateStr(
  now: Date = new Date(),
  tz: string = DEFAULT_TZ,
  rolloverHour: number = DEFAULT_ROLLOVER_HOUR,
): string {
  const shifted = new Date(now.getTime() - rolloverHour * 3600 * 1000)
  return formatInTimeZone(shifted, tz, 'yyyy-MM-dd')
}

/** Weekday index (0=Sun..6=Sat) for a logical date string. */
export function weekdayOf(dateStr: string): number {
  // Parse as local noon to avoid TZ boundary drift.
  return parseISO(dateStr + 'T12:00:00').getDay()
}

/** Whole calendar days between two yyyy-MM-dd strings (to - from). */
export function daysBetween(fromStr: string, toStr: string): number {
  return differenceInCalendarDays(parseISO(toStr + 'T12:00:00'), parseISO(fromStr + 'T12:00:00'))
}

/** Add n days to a yyyy-MM-dd string, returning a yyyy-MM-dd string. */
export function addDaysStr(dateStr: string, n: number): string {
  return format(addDays(parseISO(dateStr + 'T12:00:00'), n), 'yyyy-MM-dd')
}

/** Monday-based ISO week start (yyyy-MM-dd) for a given logical date. */
export function weekStartStr(dateStr: string): string {
  const dow = weekdayOf(dateStr) // 0=Sun
  const back = dow === 0 ? 6 : dow - 1 // days since Monday
  return addDaysStr(dateStr, -back)
}

/** Pretty header date, e.g. "Saturday, May 30". */
export function prettyDate(dateStr: string): string {
  return format(parseISO(dateStr + 'T12:00:00'), 'EEEE, MMM d')
}

export function prettyDateShort(dateStr: string): string {
  return format(parseISO(dateStr + 'T12:00:00'), 'EEE M/d')
}

export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
