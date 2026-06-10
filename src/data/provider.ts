import type { Profile, DailyLog, WeeklyCheckin } from './types'

/**
 * The single seam between the app and where state lives. The localStorage and
 * Supabase implementations satisfy this same contract, so flipping
 * VITE_DATA_BACKEND swaps the whole backend without touching feature code.
 */
export interface DataProvider {
  readonly kind: 'local' | 'supabase'

  getProfile(): Promise<Profile>
  saveProfile(profile: Profile): Promise<void>

  getDailyLog(date: string): Promise<DailyLog | null>
  saveDailyLog(log: DailyLog): Promise<void>
  /** Inclusive date range [from, to], yyyy-MM-dd. */
  getDailyLogsInRange(from: string, to: string): Promise<DailyLog[]>
  getAllDailyLogs(): Promise<DailyLog[]>

  getCheckin(weekStart: string): Promise<WeeklyCheckin | null>
  saveCheckin(checkin: WeeklyCheckin): Promise<void>
  getCheckins(): Promise<WeeklyCheckin[]>

  /** Wipe all mutable user data (used by Settings "reset"). */
  reset(): Promise<void>
}

let _provider: DataProvider | null = null

export async function getProvider(): Promise<DataProvider> {
  if (_provider) return _provider
  const backend = import.meta.env.VITE_DATA_BACKEND ?? 'local'
  if (backend === 'supabase') {
    const { SupabaseProvider } = await import('./supabaseProvider')
    _provider = new SupabaseProvider()
  } else {
    const { LocalProvider } = await import('./localProvider')
    _provider = new LocalProvider()
  }
  return _provider
}

export function backendKind(): 'local' | 'supabase' {
  return import.meta.env.VITE_DATA_BACKEND === 'supabase' ? 'supabase' : 'local'
}
