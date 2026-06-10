import { useState } from 'react'
import type { WorkoutDay, Exercise, DailyLog, WorkoutSetLog } from '@/data/types'
import { WARMUP_PROTOCOL, WARMUP_PYRAMID } from '@/data/seed/warmup'
import { Card, Collapsible, Pill } from './ui'
import { Dumbbell, Check, PlayCircle, Flame, Repeat, Zap, Timer, Plus, Minus, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/cn'

const LIFT = '#f2a33c'

/** Map of exerciseName → (setIndex → previous logged set), for pre-fill. */
export type LastSets = Record<string, Record<number, WorkoutSetLog>>

export function WorkoutLogger({
  workout,
  log,
  lastSets,
  onUpdateSets,
  onFinish,
  onReopen,
}: {
  workout: WorkoutDay
  log: DailyLog | null
  lastSets: LastSets
  onUpdateSets: (sets: WorkoutSetLog[]) => void
  onFinish: () => void
  onReopen: () => void
}) {
  const session = log?.lift_session ?? []
  const isDone = Boolean(log?.lift_done)
  const exOrder = workout.exercises.map((e) => e.name)

  const setsFor = (name: string) =>
    session.filter((s) => s.exercise_name === name).sort((a, b) => a.set_index - b.set_index)

  const writeSet = (name: string, setIndex: number, patch: Partial<WorkoutSetLog>) => {
    const prev = lastSets[name]?.[setIndex]
    const existing = session.find((s) => s.exercise_name === name && s.set_index === setIndex)
    const base: WorkoutSetLog =
      existing ?? {
        exercise_name: name,
        set_index: setIndex,
        // seed from last session so checking a set defaults to "same as last time"
        weight: prev?.weight ?? null,
        reps: prev?.reps ?? null,
        rpe: null,
        done: false,
      }
    const merged = { ...base, ...patch }
    const next = existing
      ? session.map((s) => (s.exercise_name === name && s.set_index === setIndex ? merged : s))
      : [...session, merged]
    next.sort((a, b) => exOrder.indexOf(a.exercise_name) - exOrder.indexOf(b.exercise_name) || a.set_index - b.set_index)
    onUpdateSets(next)
  }

  const removeSet = (name: string, setIndex: number) => {
    onUpdateSets(session.filter((s) => !(s.exercise_name === name && s.set_index === setIndex)))
  }

  const totalSets = workout.exercises.reduce((n, ex) => n + Math.max(targetSets(ex), setsFor(ex.name).length), 0)
  const doneSets = session.filter((s) => s.done).length

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b hairline px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${LIFT}22`, color: LIFT }}>
            <Dumbbell size={18} />
          </span>
          <div>
            <div className="text-[15px] font-bold leading-tight">{workout.day_label}</div>
            <div className="text-[11px] text-muted">
              Week {workout.week} · {workout.block} · {doneSets}/{totalSets} sets
            </div>
          </div>
        </div>
      </div>

      {/* Warm-up protocol */}
      <div className="border-t hairline px-4 py-2.5">
        <Collapsible
          title={
            <span className="flex items-center gap-2">
              <Flame size={15} style={{ color: LIFT }} /> Warm-up
            </span>
          }
          right={<span className="text-[11px]">{WARMUP_PROTOCOL.general.duration}</span>}
        >
          <div className="space-y-2 pl-1 text-xs text-muted">
            <ul className="list-disc space-y-0.5 pl-4">
              {WARMUP_PROTOCOL.general.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <p>{WARMUP_PROTOCOL.specific.description}</p>
          </div>
        </Collapsible>
      </div>

      {/* Exercises */}
      <div className="divide-y hairline">
        {workout.exercises.map((ex, i) => (
          <ExerciseBlock
            key={i}
            ex={ex}
            index={i + 1}
            sets={setsFor(ex.name)}
            last={lastSets[ex.name] ?? {}}
            onWrite={(setIndex, patch) => writeSet(ex.name, setIndex, patch)}
            onRemove={(setIndex) => removeSet(ex.name, setIndex)}
          />
        ))}
      </div>

      {/* Finish */}
      <div className="border-t hairline p-3">
        {isDone ? (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-habit">
              <CheckCircle2 size={16} /> Workout complete
            </span>
            <button onClick={onReopen} className="tap rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-white/5">
              Reopen
            </button>
          </div>
        ) : (
          <button
            onClick={onFinish}
            className="tap w-full rounded-xl py-3 text-sm font-semibold text-white transition active:scale-[0.99]"
            style={{ background: LIFT }}
          >
            Finish workout
          </button>
        )}
      </div>
    </Card>
  )
}

function targetSets(ex: Exercise): number {
  const n = parseInt(ex.working_sets, 10)
  return Number.isFinite(n) && n > 0 ? n : 3
}

function ExerciseBlock({
  ex,
  index,
  sets,
  last,
  onWrite,
  onRemove,
}: {
  ex: Exercise
  index: number
  sets: WorkoutSetLog[]
  last: Record<number, WorkoutSetLog>
  onWrite: (setIndex: number, patch: Partial<WorkoutSetLog>) => void
  onRemove: (setIndex: number) => void
}) {
  const [showDetail, setShowDetail] = useState(false)
  const base = targetSets(ex)
  const loggedMax = sets.reduce((m, s) => Math.max(m, s.set_index), 0)
  const count = Math.max(base, loggedMax)
  const rows = Array.from({ length: count }, (_, i) => i + 1)
  const pyramid = WARMUP_PYRAMID[ex.warmup_sets]
  const hasTechnique = ex.last_set_technique && ex.last_set_technique !== 'N/A'

  return (
    <div className="px-3 py-3">
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-semibold text-slate-500">{index}</span>
            <span className="text-sm font-semibold leading-tight">{ex.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
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
            {hasTechnique && <Pill className="bg-lift/15 text-lift">{ex.last_set_technique}</Pill>}
          </div>
        </div>
        {ex.video_url && (
          <a href={ex.video_url} target="_blank" rel="noopener noreferrer" className="tap mt-0.5 shrink-0 text-slate-500 transition hover:text-brand" aria-label="Watch demo">
            <PlayCircle size={22} />
          </a>
        )}
      </div>

      {/* Set table */}
      <div className="mt-2.5 space-y-1">
        <div className="grid grid-cols-[1.6rem_1fr_1fr_2.2rem_2rem] items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <span className="text-center">Set</span>
          <span className="text-center">lb</span>
          <span className="text-center">reps</span>
          <span className="text-center">rpe</span>
          <span className="text-center">✓</span>
        </div>
        {rows.map((setIndex) => {
          const s = sets.find((x) => x.set_index === setIndex)
          const prev = last[setIndex]
          return (
            <div key={setIndex} className="grid grid-cols-[1.6rem_1fr_1fr_2.2rem_2rem] items-center gap-1.5">
              <span className="text-center text-xs font-semibold tabular-nums text-muted">{setIndex}</span>
              <NumCell
                value={s?.weight ?? null}
                placeholder={prev?.weight != null ? String(prev.weight) : '—'}
                onChange={(v) => onWrite(setIndex, { weight: v })}
              />
              <NumCell
                value={s?.reps ?? null}
                placeholder={prev?.reps != null ? String(prev.reps) : '—'}
                onChange={(v) => onWrite(setIndex, { reps: v })}
              />
              <NumCell value={s?.rpe ?? null} placeholder="—" onChange={(v) => onWrite(setIndex, { rpe: v })} compact />
              <button
                type="button"
                onClick={() => onWrite(setIndex, { done: !s?.done })}
                className={cn(
                  'tap mx-auto flex h-7 w-7 items-center justify-center rounded-lg border-2 transition',
                  s?.done ? 'border-transparent text-ink-950' : 'border-ink-600 text-transparent',
                )}
                style={s?.done ? { background: LIFT } : undefined}
                aria-label={`set ${setIndex} done`}
              >
                <Check size={16} strokeWidth={3} />
              </button>
            </div>
          )
        })}
        <div className="flex items-center gap-3 px-1 pt-0.5">
          <button type="button" onClick={() => onWrite(count + 1, {})} className="tap inline-flex items-center gap-1 text-[11px] font-medium text-brand">
            <Plus size={12} /> Add set
          </button>
          {loggedMax > base && (
            <button type="button" onClick={() => onRemove(loggedMax)} className="tap inline-flex items-center gap-1 text-[11px] font-medium text-muted">
              <Minus size={12} /> Remove set
            </button>
          )}
          {(ex.notes || ex.sub_1 || pyramid) && (
            <button type="button" onClick={() => setShowDetail((d) => !d)} className="tap ml-auto text-[11px] font-medium text-muted">
              {showDetail ? 'Hide' : 'Notes & subs'}
            </button>
          )}
        </div>
      </div>

      {showDetail && (
        <div className="mt-2 space-y-1.5 rounded-lg bg-white/5 p-2.5 text-[11px] text-slate-300 animate-fade-in">
          {ex.notes && <p className="text-muted">{ex.notes}</p>}
          {pyramid && <p className="text-slate-500">Warm-up: {pyramid.join(' → ')}</p>}
          {ex.sub_1 && (
            <p>
              <span className="text-slate-500">Sub 1:</span> {ex.sub_1}
            </p>
          )}
          {ex.sub_2 && (
            <p>
              <span className="text-slate-500">Sub 2:</span> {ex.sub_2}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function NumCell({
  value,
  placeholder,
  onChange,
  compact,
}: {
  value: number | null
  placeholder?: string
  onChange: (v: number | null) => void
  compact?: boolean
}) {
  return (
    <input
      inputMode="decimal"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value.trim()
        const n = v === '' ? null : Number(v)
        onChange(n != null && Number.isFinite(n) ? n : null)
      }}
      className={cn(
        'surface-2 w-full rounded-lg py-1.5 text-center text-sm font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-slate-600',
        compact ? 'px-1' : 'px-2',
      )}
    />
  )
}
