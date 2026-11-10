import type { Block, Exercise, WorkoutDay } from '../types'

/**
 * SAMPLE DATA: a small generic placeholder program so the app builds and runs.
 * 12 weeks × 5 day-types, the same shape the rest of the app expects.
 * Replace with your own program (scripts/buildLiftProgram.mjs can regenerate
 * this file from a JSON program description).
 */

function ex(name: string, working_sets: string, reps: string, sub_1 = '', sub_2 = ''): Exercise {
  return {
    name,
    video_url: '',
    working_sets,
    warmup_sets: '2',
    reps,
    early_rpe: '~7',
    last_rpe: '~8',
    rest: '2-3 min',
    last_set_technique: 'N/A',
    sub_1,
    sub_2,
    notes: 'Sample exercise. Replace with your own program.',
  }
}

const SAMPLE_DAYS: { day_index: number; day_label: string; exercises: Exercise[] }[] = [
  {
    day_index: 1,
    day_label: 'Upper (Sample)',
    exercises: [
      ex('Bench Press', '3', '6-8', 'Dumbbell Press', 'Push-Up'),
      ex('Barbell Row', '3', '6-8', 'Cable Row'),
      ex('Overhead Press', '2', '8-10', 'Dumbbell Shoulder Press'),
    ],
  },
  {
    day_index: 2,
    day_label: 'Lower (Sample)',
    exercises: [
      ex('Back Squat', '3', '5-7', 'Leg Press'),
      ex('Romanian Deadlift', '3', '8-10', 'Hip Hinge Machine'),
      ex('Standing Calf Raise', '2', '10-12'),
    ],
  },
  {
    day_index: 3,
    day_label: 'Pull (Sample)',
    exercises: [
      ex('Pull-Up', '3', '6-10', 'Lat Pulldown'),
      ex('Seated Cable Row', '3', '10-12'),
      ex('Dumbbell Curl', '2', '10-12'),
    ],
  },
  {
    day_index: 4,
    day_label: 'Push (Sample)',
    exercises: [
      ex('Incline Dumbbell Press', '3', '8-10', 'Incline Machine Press'),
      ex('Dips', '2', '8-12', 'Close-Grip Bench Press'),
      ex('Lateral Raise', '2', '12-15'),
    ],
  },
  {
    day_index: 5,
    day_label: 'Legs (Sample)',
    exercises: [
      ex('Front Squat', '3', '8-10', 'Goblet Squat'),
      ex('Leg Curl', '3', '10-12'),
      ex('Walking Lunge', '2', '10-12'),
    ],
  },
]

export const LIFT_TOTAL_WEEKS = 12
export const LIFT_DAYS_PER_WEEK = 5

export const LIFT_PROGRAM: WorkoutDay[] = Array.from({ length: LIFT_TOTAL_WEEKS }, (_, w) => w + 1).flatMap((week) =>
  SAMPLE_DAYS.map((d) => ({
    week,
    day_index: d.day_index,
    day_label: d.day_label,
    block: (week <= 5 ? 'Foundation' : 'Ramping') as Block,
    exercises: d.exercises.map((e) => ({ ...e })),
  })),
)
