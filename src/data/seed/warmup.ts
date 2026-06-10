import type { WarmupProtocol } from '../types'

/** Parsed from the PDF "Warm-Up Protocol" page (PDF p.3). Shown collapsibly atop every lift day. */
export const WARMUP_PROTOCOL: WarmupProtocol = {
  general: {
    duration: '5–10 min',
    items: [
      'Light cardio, your choice of machine (treadmill, stairmaster, elliptical, bike) — 5–10 min',
      'Arm swings — 10 reps/side',
      'Arm circles — 10 reps/side',
      'Front-to-back leg swings — 10 reps/side',
      'Side-to-side leg swings — 10 reps/side',
      'Cable external rotation (optional) — 15 reps/side',
    ],
  },
  specific: {
    description: 'Match warm-up sets to the number listed on each exercise, ramping toward your working weight.',
    items: [
      '1 set listed: ~60% of working weight × ~6–10 reps (until warm and loose)',
      '2 sets listed: ~50% × 6–10, then ~70% × 4–6',
      '3 sets listed: ~45% × 6–10, ~65% × 4–6, ~85% × 3–4',
      '4 sets listed: ~45% × 6–10, ~60% × 4–6, ~75% × 3–5, ~85% × 2–4',
    ],
  },
}

/** Per-exercise warm-up pyramid keyed by the warm-up-set count on that exercise. */
export const WARMUP_PYRAMID: Record<string, string[]> = {
  '1': ['~60% × 6–10 reps (until warm)'],
  '2': ['~50% × 6–10', '~70% × 4–6'],
  '3': ['~45% × 6–10', '~65% × 4–6', '~85% × 3–4'],
  '4': ['~45% × 6–10', '~60% × 4–6', '~75% × 3–5', '~85% × 2–4'],
}

/** Key program notes (PDF p.2), shown on first lift day / Programs reference. */
export const PROGRAM_NOTES: string[] = [
  'Do the general + exercise-specific warm-up every workout (5–10 min max).',
  'Week 1 is a deload/intro: most sets at RPE ~7–9 (1–3 reps in reserve).',
  'From week 2 on, take the LAST set of every exercise to failure (except deload weeks).',
  'Early sets are slightly easier (lower RPE) than the last set.',
  'Each exercise links a video demo — watch it before your first time.',
  'See the Bodybuilding Transformation System Guidebook for how to progress reps and when to substitute.',
]
