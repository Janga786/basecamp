import type { DataProvider } from './provider'
import type { Profile, DailyLog, WeeklyCheckin } from './types'
import { mergeStoredProfile } from './seed/profile'
import { getSupabase } from '@/lib/supabaseClient'

/**
 * Supabase-backed persistence. All tables carry a user_id and are protected by
 * RLS keyed to auth.uid() (see supabase/schema.sql). Shapes mirror the local
 * provider so feature code is backend-agnostic.
 */
export class SupabaseProvider implements DataProvider {
  readonly kind = 'supabase' as const

  private async userId(): Promise<string> {
    const { data } = await getSupabase().auth.getUser()
    if (!data.user) throw new Error('Not authenticated')
    return data.user.id
  }

  async getProfile(): Promise<Profile> {
    const sb = getSupabase()
    const uid = await this.userId()
    const { data, error } = await sb.from('profile').select('data').eq('user_id', uid).maybeSingle()
    if (error) throw error
    return mergeStoredProfile(data ? (data.data as Partial<Profile>) : null)
  }

  async saveProfile(profile: Profile): Promise<void> {
    const sb = getSupabase()
    const uid = await this.userId()
    const { error } = await sb.from('profile').upsert({ user_id: uid, data: profile }, { onConflict: 'user_id' })
    if (error) throw error
  }

  async getDailyLog(date: string): Promise<DailyLog | null> {
    const sb = getSupabase()
    const uid = await this.userId()
    const { data, error } = await sb
      .from('daily_log')
      .select('data')
      .eq('user_id', uid)
      .eq('log_date', date)
      .maybeSingle()
    if (error) throw error
    return data ? (data.data as DailyLog) : null
  }

  async saveDailyLog(log: DailyLog): Promise<void> {
    const sb = getSupabase()
    const uid = await this.userId()
    const { error } = await sb
      .from('daily_log')
      .upsert({ user_id: uid, log_date: log.log_date, data: log }, { onConflict: 'user_id,log_date' })
    if (error) throw error
  }

  async getDailyLogsInRange(from: string, to: string): Promise<DailyLog[]> {
    const sb = getSupabase()
    const uid = await this.userId()
    const { data, error } = await sb
      .from('daily_log')
      .select('data')
      .eq('user_id', uid)
      .gte('log_date', from)
      .lte('log_date', to)
      .order('log_date')
    if (error) throw error
    return (data ?? []).map((r) => r.data as DailyLog)
  }

  async getAllDailyLogs(): Promise<DailyLog[]> {
    const sb = getSupabase()
    const uid = await this.userId()
    const { data, error } = await sb.from('daily_log').select('data').eq('user_id', uid).order('log_date')
    if (error) throw error
    return (data ?? []).map((r) => r.data as DailyLog)
  }

  async getCheckin(weekStart: string): Promise<WeeklyCheckin | null> {
    const sb = getSupabase()
    const uid = await this.userId()
    const { data, error } = await sb
      .from('weekly_checkin')
      .select('data')
      .eq('user_id', uid)
      .eq('week_start', weekStart)
      .maybeSingle()
    if (error) throw error
    return data ? (data.data as WeeklyCheckin) : null
  }

  async saveCheckin(checkin: WeeklyCheckin): Promise<void> {
    const sb = getSupabase()
    const uid = await this.userId()
    const { error } = await sb
      .from('weekly_checkin')
      .upsert({ user_id: uid, week_start: checkin.week_start, data: checkin }, { onConflict: 'user_id,week_start' })
    if (error) throw error
  }

  async getCheckins(): Promise<WeeklyCheckin[]> {
    const sb = getSupabase()
    const uid = await this.userId()
    const { data, error } = await sb
      .from('weekly_checkin')
      .select('data')
      .eq('user_id', uid)
      .order('week_start', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r) => r.data as WeeklyCheckin)
  }

  async reset(): Promise<void> {
    const sb = getSupabase()
    const uid = await this.userId()
    await sb.from('daily_log').delete().eq('user_id', uid)
    await sb.from('weekly_checkin').delete().eq('user_id', uid)
    await sb.from('profile').delete().eq('user_id', uid)
  }
}
