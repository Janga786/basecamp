// ── Reference / content types (static, bundled) ───────────────────────────────

export type HabitCategory = 'sleep' | 'movement' | 'nutrition' | 'mobility' | 'longevity'
export type HabitCadence = 'daily' | 'weekly' | '3x_week'

export interface ExternalLink {
  label: string
  /** iOS URL scheme attempt (best-effort native app open). */
  appUrl?: string
  /** Web fallback. */
  webUrl: string
}

export interface ChecklistStep {
  id: string
  label: string
  detail?: string
}

export interface Habit {
  id: string
  label: string
  description: string
  category: HabitCategory
  cadence: HabitCadence
  default_enabled: boolean
  sort_order: number
  optional: boolean
  info_note: string
  /** Outbound "I logged it" link (e.g. MyNetDiary). */
  external?: ExternalLink
  /** Multi-step checklist that all-checks-off as done (mobility routine). */
  steps?: ChecklistStep[]
  /** Tie this habit's completion to a numeric quick-entry field. */
  quick_entry?: 'steps' | 'sleep_hours' | 'rhr_bpm'
}

export interface Exercise {
  name: string
  video_url: string
  working_sets: string
  warmup_sets: string
  reps: string
  early_rpe: string
  last_rpe: string
  rest: string
  last_set_technique: string
  sub_1: string
  sub_2: string
  notes: string
}

export type Block = 'Foundation' | 'Ramping'

export interface WorkoutDay {
  week: number // 1..12
  day_index: number // 1..5
  day_label: string
  block: Block
  exercises: Exercise[]
}

export interface WarmupProtocol {
  general: { duration: string; items: string[] }
  specific: { description: string; items: string[] }
}

// ── Schedule template ─────────────────────────────────────────────────────────

export interface WeeklyTemplateDay {
  weekday: number // 0=Sun..6=Sat
  lift_day_index: number | null // 1..5 (program day) or null = rest/active recovery
  label?: string // override label for rest days
}

// ── Mutable user state (persisted via DataProvider) ───────────────────────────

export interface ChecklistItemState {
  habit_id: string
  done: boolean
  value?: number
  /** Per-step completion for multi-step habits. */
  steps?: Record<string, boolean>
}

/** One logged set within a workout (Hevy-style per-set logging). */
export interface WorkoutSetLog {
  /** Matches Exercise.name in the program, so the row correlates with prescription data. */
  exercise_name: string
  /** 1-indexed set number within the exercise. */
  set_index: number
  weight: number | null // lb
  reps: number | null
  rpe: number | null // 1..10, user-reported
  /** User checked this set off as completed. */
  done: boolean
}

export interface DailyLog {
  log_date: string // yyyy-MM-dd logical day (PK)
  checklist: ChecklistItemState[]
  lift_done: boolean
  /** Per-set workout log for the day (null = no lift scheduled / not started). */
  lift_session: WorkoutSetLog[] | null
  /** ISO timestamp when the workout was marked finished. */
  lift_completed_at: string | null
  steps: number | null
  sleep_hours: number | null
  rhr_bpm: number | null
  weight: number | null
  /** Total daily energy expenditure from Fitbit (kcal burned). */
  calories_out: number | null
  /** Calories consumed — only present if food is logged in Fitbit. */
  calories_in: number | null
  /** Macros (g) — only present if food is logged in Fitbit. */
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  /** ISO timestamp of the last successful Fitbit sync for this day, or null. */
  fitbit_synced_at: string | null
  notes: string
  mood: number | null // 1..5
  energy: number | null // 1..5
  updated_at: string
}

export interface ProfileSettings {
  timezone: string
  theme: 'dark' | 'light'
  rollover_hour: number
  /** ids of OPTIONAL habits the user has switched ON. */
  enabled_optional_habits: string[]
  /** ids of default-ON habits the user has switched OFF. */
  disabled_core_habits: string[]
  weekly_template: WeeklyTemplateDay[]
}

export interface Profile {
  height: string
  current_weight: number
  goal_weight: number
  cut_start_date: string
  cut_length_weeks: number
  protein_target_g: number
  calorie_target: number
  step_goal: number
  sleep_goal_hours: number
  refeed_weekday: number // 0..6
  lift_start_date: string // yyyy-MM-dd (Week 1, Day "Monday")
  settings: ProfileSettings
}

export interface WeeklyCheckin {
  week_start: string // yyyy-MM-dd Monday (PK)
  avg_sleep: number | null
  avg_steps: number | null
  weight: number | null
  adherence_pct: number | null
  win: string
  friction: string
  next_week_focus: string
  updated_at: string
}

// Reminder cards (non-daily, dismissible)
export interface ReminderCard {
  id: string
  title: string
  body: string
}
