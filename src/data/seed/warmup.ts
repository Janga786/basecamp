import type { WarmupProtocol } from '../types'

/** Generic sample warm-up, shown collapsibly atop every lift day. Replace with your own. */
export const WARMUP_PROTOCOL: WarmupProtocol = {
  general: {
    duration: '5–10 min',
    items: [
      'Easy cardio on any machine — 5 min',
      'Arm swings and arm circles — 10 reps/side',
      'Leg swings, front-to-back and side-to-side — 10 reps/side',
    ],
  },
  specific: {
    description: 'Do the warm-up sets listed on each exercise, ramping toward your working weight.',
    items: [
      '1 set: light weight × 8–10 reps',
      '2 sets: light × 8–10, then moderate × 4–6',
      '3 sets: light × 8–10, moderate × 4–6, heavier × 2–3',
      '4 sets: light × 8–10, moderate × 5–6, heavier × 3–4, near-working × 1–2',
    ],
  },
}

/** Per-exercise warm-up pyramid keyed by the warm-up-set count on that exercise. */
export const WARMUP_PYRAMID: Record<string, string[]> = {
  '1': ['light × 8–10'],
  '2': ['light × 8–10', 'moderate × 4–6'],
  '3': ['light × 8–10', 'moderate × 4–6', 'heavier × 2–3'],
  '4': ['light × 8–10', 'moderate × 5–6', 'heavier × 3–4', 'near-working × 1–2'],
}

/** Sample program notes, shown on the Programs reference. */
export const PROGRAM_NOTES: string[] = [
  'This is a generic sample program. Replace it with your own.',
  'Warm up before every workout (5–10 min).',
]
