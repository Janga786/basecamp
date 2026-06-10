import type { Profile, WeeklyTemplateDay } from '../types'

/**
 * Default weekly training template (§7). weekday: 0=Sun..6=Sat.
 * lift_day_index maps to the Nippard day-type (1 Upper, 2 Lower, 3 Pull, 4 Push, 5 Legs).
 */
export const DEFAULT_WEEKLY_TEMPLATE: WeeklyTemplateDay[] = [
  { weekday: 1, lift_day_index: 1 }, // Mon  Upper
  { weekday: 2, lift_day_index: 2 }, // Tue  Lower
  { weekday: 3, lift_day_index: 3 }, // Wed  Pull
  { weekday: 4, lift_day_index: 4 }, // Thu  Push
  { weekday: 5, lift_day_index: 5 }, // Fri  Legs
  { weekday: 6, lift_day_index: null, label: 'Rest / active recovery' }, // Sat refeed
  { weekday: 0, lift_day_index: null, label: 'Full rest' }, // Sun
]

/**
 * Seeded profile for the single user (§2). Everything is editable in Settings.
 * Dates default to the upcoming Monday (program start) as of the build date.
 */
export const DEFAULT_PROFILE: Profile = {
  height: `5'10"`,
  current_weight: 175,
  goal_weight: 163,
  cut_start_date: '2026-06-01',
  cut_length_weeks: 8,
  protein_target_g: 175,
  calorie_target: 2200,
  step_goal: 9000,
  sleep_goal_hours: 7.5,
  refeed_weekday: 6, // Saturday
  lift_start_date: '2026-06-01', // Week 1, Day 1 (Monday)
  settings: {
    timezone: 'America/Denver',
    theme: 'dark',
    rollover_hour: 3,
    enabled_optional_habits: [],
    disabled_core_habits: [],
    weekly_template: DEFAULT_WEEKLY_TEMPLATE,
  },
}

/**
 * Merge a stored (possibly old/partial) profile over the defaults so newly-added
 * fields appear, and guarantee all 7 weekday-template entries exist (older data
 * may be missing some, which would crash screens that assume every weekday).
 */
export function mergeStoredProfile(stored: Partial<Profile> | null | undefined): Profile {
  if (!stored) return structuredClone(DEFAULT_PROFILE)
  const settings = { ...DEFAULT_PROFILE.settings, ...(stored.settings ?? {}) }
  const present = new Set((settings.weekly_template ?? []).map((d) => d.weekday))
  const filled = [...(settings.weekly_template ?? [])]
  for (const def of DEFAULT_WEEKLY_TEMPLATE) {
    if (!present.has(def.weekday)) filled.push(structuredClone(def))
  }
  filled.sort((a, b) => a.weekday - b.weekday)
  settings.weekly_template = filled
  return { ...DEFAULT_PROFILE, ...stored, settings }
}
