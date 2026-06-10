import type { DataProvider } from './provider'
import type { Profile, DailyLog, WeeklyCheckin } from './types'
import { mergeStoredProfile } from './seed/profile'

const K = {
  profile: 'basecamp.profile',
  log: (d: string) => `basecamp.log.${d}`,
  logIndex: 'basecamp.logIndex',
  checkin: (w: string) => `basecamp.checkin.${w}`,
  checkinIndex: 'basecamp.checkinIndex',
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}
function getIndex(key: string): string[] {
  return read<string[]>(key) ?? []
}
function addToIndex(key: string, id: string) {
  const idx = getIndex(key)
  if (!idx.includes(id)) {
    idx.push(id)
    write(key, idx)
  }
}

/**
 * Local-first persistence to localStorage. Survives reloads on this device;
 * does NOT sync across devices or survive a cache clear — that's what the
 * Supabase backend is for (flip VITE_DATA_BACKEND=supabase once provisioned).
 */
export class LocalProvider implements DataProvider {
  readonly kind = 'local' as const

  async getProfile(): Promise<Profile> {
    // Deep-merge stored over defaults so newly-added fields/settings appear,
    // and backfill any missing weekday-template entries (old/partial data).
    return mergeStoredProfile(read<Partial<Profile>>(K.profile))
  }

  async saveProfile(profile: Profile): Promise<void> {
    write(K.profile, profile)
  }

  async getDailyLog(date: string): Promise<DailyLog | null> {
    return read<DailyLog>(K.log(date))
  }

  async saveDailyLog(log: DailyLog): Promise<void> {
    write(K.log(log.log_date), log)
    addToIndex(K.logIndex, log.log_date)
  }

  async getDailyLogsInRange(from: string, to: string): Promise<DailyLog[]> {
    return getIndex(K.logIndex)
      .filter((d) => d >= from && d <= to)
      .map((d) => read<DailyLog>(K.log(d)))
      .filter((l): l is DailyLog => l !== null)
      .sort((a, b) => a.log_date.localeCompare(b.log_date))
  }

  async getAllDailyLogs(): Promise<DailyLog[]> {
    return getIndex(K.logIndex)
      .map((d) => read<DailyLog>(K.log(d)))
      .filter((l): l is DailyLog => l !== null)
      .sort((a, b) => a.log_date.localeCompare(b.log_date))
  }

  async getCheckin(weekStart: string): Promise<WeeklyCheckin | null> {
    return read<WeeklyCheckin>(K.checkin(weekStart))
  }

  async saveCheckin(checkin: WeeklyCheckin): Promise<void> {
    write(K.checkin(checkin.week_start), checkin)
    addToIndex(K.checkinIndex, checkin.week_start)
  }

  async getCheckins(): Promise<WeeklyCheckin[]> {
    return getIndex(K.checkinIndex)
      .map((w) => read<WeeklyCheckin>(K.checkin(w)))
      .filter((c): c is WeeklyCheckin => c !== null)
      .sort((a, b) => b.week_start.localeCompare(a.week_start))
  }

  async reset(): Promise<void> {
    for (const d of getIndex(K.logIndex)) localStorage.removeItem(K.log(d))
    for (const w of getIndex(K.checkinIndex)) localStorage.removeItem(K.checkin(w))
    localStorage.removeItem(K.logIndex)
    localStorage.removeItem(K.checkinIndex)
    localStorage.removeItem(K.profile)
  }
}
