import { useState } from 'react'
import type { Habit, DailyLog, Profile } from '@/data/types'
import { CATEGORY_ORDER, CATEGORY_LABEL } from '@/data/seed/habits'
import { Card, InfoButton, NumberField, ExternalActionLink, CheckToggle } from './ui'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const CATEGORY_ACCENT: Record<Habit['category'], string> = {
  sleep: '#818cf8',
  nutrition: '#f2a33c',
  movement: '#3ecf8e',
  mobility: '#22d3ee',
  longevity: '#a78bfa',
}

export interface HabitHandlers {
  toggle: (habit: Habit, done: boolean) => void
  toggleStep: (habit: Habit, stepId: string, done: boolean) => void
  setQuick: (habit: Habit, value: number | null) => void
}

export function HabitList({
  habits,
  log,
  profile,
  handlers,
}: {
  habits: Habit[]
  log: DailyLog | null
  profile: Profile
  handlers: HabitHandlers
}) {
  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((cat) => {
        const inCat = habits.filter((h) => h.category === cat)
        if (inCat.length === 0) return null
        return (
          <div key={cat}>
            <div className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_ACCENT[cat] }} />
              {CATEGORY_LABEL[cat]}
            </div>
            <Card className="divide-y hairline">
              {inCat.map((h) => (
                <HabitRow key={h.id} habit={h} log={log} profile={profile} handlers={handlers} accent={CATEGORY_ACCENT[cat]} synced={Boolean(log?.fitbit_synced_at)} />
              ))}
            </Card>
          </div>
        )
      })}
    </div>
  )
}

function itemFor(log: DailyLog | null, habitId: string) {
  return log?.checklist.find((c) => c.habit_id === habitId)
}

function HabitRow({
  habit,
  log,
  profile,
  handlers,
  accent,
  synced,
}: {
  habit: Habit
  log: DailyLog | null
  profile: Profile
  handlers: HabitHandlers
  accent: string
  synced: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const item = itemFor(log, habit.id)

  // Multi-step habit (mobility): done when all steps checked.
  if (habit.steps && habit.steps.length > 0) {
    const stepState = item?.steps ?? {}
    const doneCount = habit.steps.filter((s) => stepState[s.id]).length
    const allDone = doneCount === habit.steps.length
    return (
      <div className="px-1">
        <div className="flex items-center gap-2 px-2 py-3">
          <button
            type="button"
            onClick={() => handlers.toggle(habit, !allDone)}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition',
              allDone ? 'border-transparent text-ink-950' : 'border-ink-600 text-transparent',
            )}
            style={allDone ? { background: accent } : undefined}
            aria-label="toggle all"
          >
            <Check size={18} strokeWidth={3} />
          </button>
          <button type="button" onClick={() => setExpanded((e) => !e)} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-tight">{habit.label}</span>
              <span className="block text-xs text-muted">{doneCount}/{habit.steps.length} done · {habit.description}</span>
            </span>
            <ChevronDown size={16} className={cn('shrink-0 text-muted transition', expanded && 'rotate-180')} />
          </button>
          <InfoButton note={habit.info_note} />
        </div>
        {expanded && (
          <div className="space-y-0.5 pb-2 pl-9 pr-3 animate-fade-in">
            {habit.steps.map((s) => {
              const on = Boolean(stepState[s.id])
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handlers.toggleStep(habit, s.id, !on)}
                  className="tap flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
                >
                  <span
                    className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition', on ? 'border-transparent text-ink-950' : 'border-ink-600 text-transparent')}
                    style={on ? { background: accent } : undefined}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-[13px] leading-tight', on && 'text-slate-400 line-through')}>{s.label}</span>
                    {s.detail && <span className="block text-[11px] text-slate-500">{s.detail}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Quick-entry habit (steps / sleep / rhr): numeric field + derived done.
  if (habit.quick_entry) {
    const field = habit.quick_entry
    const value = log?.[field] ?? null
    const goal =
      field === 'steps' ? profile.step_goal : field === 'sleep_hours' ? profile.sleep_goal_hours : undefined
    const done = Boolean(item?.done)
    // Fitbit is source of truth — show synced values read-only.
    const fromFitbit = synced && value != null
    return (
      <div className="flex items-center gap-2 px-3 py-3">
        <span
          className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition', done ? 'border-transparent text-ink-950' : 'border-ink-600 text-transparent')}
          style={done ? { background: accent } : undefined}
        >
          <Check size={18} strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium leading-tight">{habit.label}</span>
            {fromFitbit && <span className="text-[11px] text-muted">Fitbit</span>}
            <InfoButton note={habit.info_note} />
          </div>
          {goal != null && (
            <span className="block text-xs text-muted">
              {value != null ? formatVal(field, value) : '—'} / {formatVal(field, goal)} goal
            </span>
          )}
        </div>
        <div className="w-32 shrink-0">
          {fromFitbit ? (
            <div className="surface-2 rounded-xl px-3 py-2 text-center text-sm font-semibold tabular-nums">
              {formatVal(field, value)}
            </div>
          ) : (
            <NumberField
              value={value}
              onChange={(v) => handlers.setQuick(habit, v)}
              step={field === 'steps' ? 250 : field === 'sleep_hours' ? 0.25 : 1}
              placeholder={field === 'sleep_hours' ? 'hrs' : field === 'rhr_bpm' ? 'bpm' : '0'}
            />
          )}
        </div>
      </div>
    )
  }

  // External-link habit (protein → MyNetDiary): toggle + outbound link.
  if (habit.external) {
    return (
      <div className="px-1">
        <div className="flex items-center pr-3">
          <div className="min-w-0 flex-1">
            <CheckToggle
              checked={Boolean(item?.done)}
              onChange={(v) => handlers.toggle(habit, v)}
              label={habit.label}
              sublabel={habit.description}
              accent={accent}
            />
          </div>
          <InfoButton note={habit.info_note} />
        </div>
        <div className="px-3 pb-2">
          <ExternalActionLink link={habit.external} />
        </div>
      </div>
    )
  }

  // Plain daily toggle.
  return (
    <div className="flex items-center pr-3">
      <div className="min-w-0 flex-1">
        <CheckToggle
          checked={Boolean(item?.done)}
          onChange={(v) => handlers.toggle(habit, v)}
          label={habit.label}
          sublabel={habit.description}
          accent={accent}
        />
      </div>
      <InfoButton note={habit.info_note} />
    </div>
  )
}

function formatVal(field: 'steps' | 'sleep_hours' | 'rhr_bpm', v: number): string {
  if (field === 'steps') return v.toLocaleString()
  if (field === 'sleep_hours') return `${v}h`
  return `${v} bpm`
}
