import type { WorkoutDay, Exercise } from '@/data/types'
import { Card, Collapsible, Pill } from './ui'
import { WARMUP_PROTOCOL, WARMUP_PYRAMID } from '@/data/seed/warmup'
import { Dumbbell, PlayCircle, Repeat, Timer, Zap, Flame } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useState } from 'react'

const LIFT = '#f2a33c'

/** Read-only program reference card (used on the Programs screen). */
export function LiftCard({ workout }: { workout: WorkoutDay }) {
  const isDeload = workout.week === 1 || workout.week === 6
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b hairline px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${LIFT}22`, color: LIFT }}>
            <Dumbbell size={18} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold leading-tight">{workout.day_label}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <span>
                Week {workout.week} · {workout.block}
              </span>
              {isDeload && (
                <Pill className="bg-brand/15 text-brand">deload / intro</Pill>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warm-up protocol */}
      <div className="border-t hairline px-4 py-3">
        <Collapsible
          title={
            <span className="flex items-center gap-2">
              <Flame size={15} style={{ color: LIFT }} /> Warm-up protocol
            </span>
          }
          right={<span className="text-[11px]">{WARMUP_PROTOCOL.general.duration}</span>}
        >
          <div className="space-y-3 pl-1 text-xs text-slate-300">
            <div>
              <div className="mb-1 font-semibold text-slate-200">General ({WARMUP_PROTOCOL.general.duration})</div>
              <ul className="list-disc space-y-0.5 pl-4 text-muted">
                {WARMUP_PROTOCOL.general.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 font-semibold text-slate-200">Exercise-specific</div>
              <p className="mb-1 text-muted">{WARMUP_PROTOCOL.specific.description}</p>
              <ul className="list-disc space-y-0.5 pl-4 text-muted">
                {WARMUP_PROTOCOL.specific.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          </div>
        </Collapsible>
      </div>

      {/* Exercises */}
      <div className="divide-y hairline">
        {workout.exercises.map((ex, i) => (
          <ExerciseRow key={i} ex={ex} index={i + 1} />
        ))}
      </div>
    </Card>
  )
}

function ExerciseRow({ ex, index }: { ex: Exercise; index: number }) {
  const [showSubs, setShowSubs] = useState(false)
  const pyramid = WARMUP_PYRAMID[ex.warmup_sets] // exact match for single-number warmups
  const hasTechnique = ex.last_set_technique && ex.last_set_technique !== 'N/A'
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold text-slate-500">{index}</span>
            <span className="text-sm font-semibold leading-tight">{ex.name}</span>
          </div>
          {/* Prescription chips */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Pill className="bg-white/5 text-slate-300">
              <Repeat size={11} /> {ex.working_sets} × {ex.reps}
            </Pill>
            <Pill className="bg-white/5 text-slate-300">
              <Zap size={11} /> RPE {ex.early_rpe}
              {ex.last_rpe && ex.last_rpe !== ex.early_rpe ? ` → ${ex.last_rpe}` : ''}
            </Pill>
            <Pill className="bg-white/5 text-slate-300">
              <Timer size={11} /> {ex.rest}
            </Pill>
            {ex.warmup_sets && (
              <Pill className="bg-white/5 text-slate-400">{ex.warmup_sets} warm-up</Pill>
            )}
            {hasTechnique && (
              <Pill className="bg-lift/15 text-lift">{ex.last_set_technique}</Pill>
            )}
          </div>
        </div>
        {ex.video_url && (
          <a
            href={ex.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="tap mt-0.5 shrink-0 text-slate-500 transition hover:text-brand"
            aria-label="Watch demo"
          >
            <PlayCircle size={22} />
          </a>
        )}
      </div>

      {ex.notes && <p className="mt-2 text-xs leading-relaxed text-muted">{ex.notes}</p>}

      {pyramid && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Warm-up: {pyramid.join(' → ')}
        </p>
      )}

      {(ex.sub_1 || ex.sub_2) && (
        <button
          type="button"
          onClick={() => setShowSubs((s) => !s)}
          className="tap mt-2 text-[11px] font-medium text-brand"
        >
          {showSubs ? 'Hide' : 'Show'} substitutions
        </button>
      )}
      {showSubs && (
        <div className={cn('mt-1.5 space-y-1 rounded-lg bg-white/5 p-2 text-[11px] text-slate-300 animate-fade-in')}>
          {ex.sub_1 && (
            <div>
              <span className="text-slate-500">1.</span> {ex.sub_1}
            </div>
          )}
          {ex.sub_2 && (
            <div>
              <span className="text-slate-500">2.</span> {ex.sub_2}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
