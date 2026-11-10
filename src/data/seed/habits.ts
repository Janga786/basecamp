import type { Habit, ReminderCard } from '../types'
import { MYNETDIARY_LINK } from './links'

/**
 * The daily-habits engine (§5). High-ROI, free/cheap habits adapted from
 * Bryan Johnson's published Blueprint protocol — deliberately EXCLUDING his
 * drugs/hormones/HBOT and his vegan macro split (which conflicts with the
 * user's high-protein cut; MyNetDiary owns macros). info_note is the brief,
 * accurate "why" surfaced behind the ⓘ affordance.
 */
export const HABITS: Habit[] = [
  // ── Core, default ON ────────────────────────────────────────────────────────
  {
    id: 'sleep-window',
    label: 'Hit my sleep window',
    description: 'Target 7.5–8 hrs with a consistent bedtime/wake time. Log last night below.',
    category: 'sleep',
    cadence: 'daily',
    default_enabled: true,
    sort_order: 10,
    optional: false,
    quick_entry: 'sleep_hours',
    info_note:
      'Sleep is the single highest-leverage variable for both the cut and recovery. Currently averaging ~6.5 hrs — raising it is priority #1.',
  },
  {
    id: 'morning-light',
    label: 'Morning light within 30 min of waking',
    description: 'Get outside or use bright light shortly after waking.',
    category: 'sleep',
    cadence: 'daily',
    default_enabled: true,
    sort_order: 20,
    optional: false,
    info_note: 'Anchors circadian rhythm — improves nighttime sleep onset, depth, and mood.',
  },
  {
    id: 'last-meal-3hr',
    label: 'Last meal ≥3 hrs before bed',
    description: 'Stop eating at least 3 hours before lights-out.',
    category: 'sleep',
    cadence: 'daily',
    default_enabled: true,
    sort_order: 30,
    optional: false,
    info_note:
      'Lowers resting heart rate at bedtime → better sleep quality. Set to 3 hrs (not BJ’s 4) so it doesn’t fight protein intake and training timing.',
  },
  {
    id: 'wind-down',
    label: 'Screens off / wind-down 30–60 min before bed',
    description: 'Dim lights, screens away, low-arousal routine before sleep.',
    category: 'sleep',
    cadence: 'daily',
    default_enabled: true,
    sort_order: 40,
    optional: false,
    info_note: 'Reduces pre-sleep arousal and blue-light exposure, which lowers RHR and speeds sleep onset.',
  },
  {
    id: 'no-late-caffeine',
    label: 'No caffeine after ~2 PM',
    description: 'Cut off caffeine by early afternoon.',
    category: 'sleep',
    cadence: 'daily',
    default_enabled: true,
    sort_order: 50,
    optional: false,
    info_note: 'Caffeine’s ~6-hr half-life means an afternoon dose still blunts deep sleep at night.',
  },
  {
    id: 'protein-target',
    label: 'Hit protein target (175 g+)',
    description: 'Log it in MyNetDiary — Basecamp only confirms you hit and logged it.',
    category: 'nutrition',
    cadence: 'daily',
    default_enabled: true,
    sort_order: 60,
    optional: false,
    external: MYNETDIARY_LINK,
    info_note:
      'Protein preserves muscle in a deficit and is the most satiating macro. Basecamp never stores the gram count — that lives in MyNetDiary.',
  },
  {
    id: 'steps',
    label: 'Steps toward goal',
    description: 'Enter today’s step count from Fitbit.',
    category: 'movement',
    cadence: 'daily',
    default_enabled: true,
    sort_order: 70,
    optional: false,
    quick_entry: 'steps',
    info_note: 'NEAT (non-exercise activity) is one of the biggest, most flexible levers for the cut.',
  },
  {
    id: 'desk-breaks',
    label: 'Desk breaks — move every ~30 min',
    description: 'A few minutes of movement through the day / after meals. Did you do it most of the day?',
    category: 'movement',
    cadence: 'daily',
    default_enabled: true,
    sort_order: 80,
    optional: false,
    info_note: 'Frequent micro-movement counters a sedentary desk day, improves glucose handling, and eases postural stiffness.',
  },
  {
    id: 'mobility',
    label: 'Daily mobility / postural routine',
    description: '10–15 min targeting desk-related upper-back, neck, trap, and shoulder tightness.',
    category: 'mobility',
    cadence: 'daily',
    default_enabled: true,
    sort_order: 90,
    optional: false,
    info_note:
      'General mobility work for desk-posture stiffness and tight traps — not medical treatment. Check off each movement as you go.',
    steps: [
      { id: 'chin-tucks', label: 'Chin tucks — 2×10', detail: 'forward-head / neck tightness' },
      { id: 'wall-slides', label: 'Scapular wall slides — 2×10', detail: 'upper-back + scapular control' },
      { id: 'band-pull-aparts', label: 'Band pull-aparts — 2×15', detail: 'rear delts + mid-back, AC-friendly' },
      { id: 't-spine-ext', label: 'Thoracic extension over foam roller — 60–90 sec', detail: 'desk-posture thoracic stiffness' },
      { id: 'trap-stretch', label: 'Trap / levator stretch — 30 sec each side', detail: 'very tight traps' },
      { id: 'cat-cow-cobra', label: 'Cat-cow + cobra — 1–2 min', detail: 'gentle lumbar mobility' },
    ],
  },

  // ── Optional / advanced, default OFF (toggle in Settings) ────────────────────
  {
    id: 'sauna',
    label: 'Sauna 15–20 min',
    description: 'Heat exposure for cardiovascular + recovery benefit.',
    category: 'longevity',
    cadence: 'daily',
    default_enabled: false,
    sort_order: 100,
    optional: true,
    info_note: 'Genuine cardiovascular and recovery evidence for regular sauna use — only worthwhile if you have access.',
  },
  {
    id: 'red-light',
    label: 'Red-light therapy 6 min',
    description: 'Targeted red/near-infrared light session.',
    category: 'longevity',
    cadence: 'daily',
    default_enabled: false,
    sort_order: 110,
    optional: true,
    info_note: 'Evidence is promising but modest; equipment-dependent. Treat as a low-priority extra.',
  },
  {
    id: 'meditation',
    label: 'Meditation / breathwork 5 min',
    description: 'Short down-regulation practice.',
    category: 'longevity',
    cadence: 'daily',
    default_enabled: false,
    sort_order: 120,
    optional: true,
    info_note: 'Lowers stress and bedtime resting heart rate, which feeds back into sleep quality.',
  },
  {
    id: 'log-rhr',
    label: 'Log resting heart rate before bed',
    description: 'Enter tonight’s pre-sleep RHR.',
    category: 'longevity',
    cadence: 'daily',
    default_enabled: false,
    sort_order: 130,
    optional: true,
    quick_entry: 'rhr_bpm',
    info_note: 'A simple, sensitive sleep-readiness and recovery signal — BJ’s most-tracked nightly metric.',
  },
]

export const HABITS_BY_ID: Record<string, Habit> = Object.fromEntries(HABITS.map((h) => [h.id, h]))

export const CATEGORY_ORDER: Habit['category'][] = ['sleep', 'nutrition', 'movement', 'mobility', 'longevity']

export const CATEGORY_LABEL: Record<Habit['category'], string> = {
  sleep: 'Sleep',
  nutrition: 'Nutrition',
  movement: 'Movement',
  mobility: 'Mobility',
  longevity: 'Longevity',
}

/** Non-daily, dismissible reminder cards (§5b) — surfaced ~weekly, not streak habits. */
export const REMINDER_CARDS: ReminderCard[] = [
  // Add personal weekly reminder cards here: { id, title, body }.
]
