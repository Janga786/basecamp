import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProvider } from './provider'
import type { Profile, DailyLog, WeeklyCheckin } from './types'

export const qk = {
  profile: ['profile'] as const,
  log: (d: string) => ['log', d] as const,
  logsAll: ['logs', 'all'] as const,
  logsRange: (f: string, t: string) => ['logs', 'range', f, t] as const,
  checkin: (w: string) => ['checkin', w] as const,
  checkins: ['checkins'] as const,
}

export function emptyLog(date: string): DailyLog {
  return {
    log_date: date,
    checklist: [],
    lift_done: false,
    lift_session: null,
    lift_completed_at: null,
    steps: null,
    sleep_hours: null,
    rhr_bpm: null,
    weight: null,
    calories_out: null,
    calories_in: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    fitbit_synced_at: null,
    notes: '',
    mood: null,
    energy: null,
    updated_at: new Date().toISOString(),
  }
}

// ── Profile ──────────────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () => (await getProvider()).getProfile(),
    staleTime: 60_000,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (profile: Profile) => {
      const p = await getProvider()
      await p.saveProfile(profile)
      return profile
    },
    onSuccess: (profile) => {
      qc.setQueryData(qk.profile, profile)
      qc.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}

// ── Daily logs ───────────────────────────────────────────────────────────────

export function useDailyLog(date: string) {
  return useQuery({
    queryKey: qk.log(date),
    queryFn: async () => (await getProvider()).getDailyLog(date),
  })
}

/**
 * Patch today's log via an updater fn. Optimistically updates the cache so the
 * UI feels instant, then persists. Pass a function of the previous log.
 */
export function useUpdateDailyLog(date: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (update: (prev: DailyLog) => DailyLog) => {
      const provider = await getProvider()
      const prev = (await provider.getDailyLog(date)) ?? emptyLog(date)
      const next = { ...update(prev), updated_at: new Date().toISOString() }
      await provider.saveDailyLog(next)
      return next
    },
    onMutate: async (update) => {
      await qc.cancelQueries({ queryKey: qk.log(date) })
      const prevCache = qc.getQueryData<DailyLog | null>(qk.log(date))
      const base = prevCache ?? emptyLog(date)
      qc.setQueryData(qk.log(date), { ...update(base), updated_at: new Date().toISOString() })
      return { prevCache }
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(qk.log(date), ctx.prevCache)
    },
    onSettled: (next) => {
      if (next) qc.setQueryData(qk.log(date), next)
      qc.invalidateQueries({ queryKey: ['logs'] })
    },
  })
}

export function useDailyLogsRange(from: string, to: string) {
  return useQuery({
    queryKey: qk.logsRange(from, to),
    queryFn: async () => (await getProvider()).getDailyLogsInRange(from, to),
  })
}

export function useAllDailyLogs() {
  return useQuery({
    queryKey: qk.logsAll,
    queryFn: async () => (await getProvider()).getAllDailyLogs(),
  })
}

// ── Weekly check-ins ─────────────────────────────────────────────────────────

export function useCheckin(weekStart: string) {
  return useQuery({
    queryKey: qk.checkin(weekStart),
    queryFn: async () => (await getProvider()).getCheckin(weekStart),
  })
}

export function useCheckins() {
  return useQuery({
    queryKey: qk.checkins,
    queryFn: async () => (await getProvider()).getCheckins(),
  })
}

export function useSaveCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (checkin: WeeklyCheckin) => {
      const p = await getProvider()
      await p.saveCheckin({ ...checkin, updated_at: new Date().toISOString() })
      return checkin
    },
    onSuccess: (checkin) => {
      qc.setQueryData(qk.checkin(checkin.week_start), checkin)
      qc.invalidateQueries({ queryKey: qk.checkins })
    },
  })
}
