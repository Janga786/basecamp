import { useMemo, useState, useCallback, useEffect } from 'react'
import { useProfile, useDailyLog, useUpdateDailyLog, useAllDailyLogs } from '@/data/queries'
import { useLogicalToday } from '@/domain/useToday'
import { useFitbit } from '@/state/fitbit'
import { fetchFitbitDay, applyFitbitToLog } from '@/lib/fitbit'
import { assembleDay, dayProgress } from '@/domain/schedule'
import { perfectDayStreak } from '@/domain/streaks'
import { lastExerciseSets } from '@/domain/programs'
import { HABITS } from '@/data/seed/habits'
import { prettyDate } from '@/lib/time'
import type { DailyLog, Habit, ChecklistItemState, Profile } from '@/data/types'
import { WorkoutLogger, type LastSets } from '@/components/WorkoutLogger'
import { HabitList, type HabitHandlers } from '@/components/HabitList'
import { ProgressRing, Card, NumberField as NumberInline } from '@/components/ui'
import { ReminderCards } from '@/components/ReminderCards'
import { Flame, Moon, Coffee, BedDouble, Dumbbell, ClipboardCheck, ChevronRight, Activity, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

function upsertChecklist(prev: DailyLog, habitId: string, patch: Partial<ChecklistItemState>): DailyLog {
  const idx = prev.checklist.findIndex((c) => c.habit_id === habitId)
  const base: ChecklistItemState = idx >= 0 ? prev.checklist[idx] : { habit_id: habitId, done: false }
  const merged = { ...base, ...patch }
  const checklist = idx >= 0 ? prev.checklist.map((c, i) => (i === idx ? merged : c)) : [...prev.checklist, merged]
  return { ...prev, checklist }
}

export function Today() {
  const { data: profile } = useProfile()
  const today = useLogicalToday()
  const { data: log } = useDailyLog(today)
  const { data: allLogs } = useAllDailyLogs()
  const update = useUpdateDailyLog(today)
  const fitbit = useFitbit()

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const runFitbitSync = useCallback(async () => {
    if (!fitbit.connected || !profile) return
    setSyncing(true)
    setSyncError(null)
    try {
      const day = await fetchFitbitDay(today)
      update.mutate((prev) => reflectQuickHabits(applyFitbitToLog(prev, day), profile))
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e))
      fitbit.refresh() // a 401 clears tokens; reflect that in the UI
    } finally {
      setSyncing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitbit.connected, profile, today])

  // Auto-sync once on open (and at most every 10 min while the screen is mounted).
  useEffect(() => {
    if (!fitbit.connected || !profile) return
    if (shouldAutoSync(today)) {
      markAutoSync(today)
      void runFitbitSync()
    }
  }, [fitbit.connected, profile, today, runFitbitSync])

  const plan = useMemo(() => (profile ? assembleDay(profile, today) : null), [profile, today])
  const progress = useMemo(() => (plan ? dayProgress(plan, log ?? null) : null), [plan, log])
  const streak = useMemo(
    () => (profile && allLogs ? perfectDayStreak(profile, allLogs, today) : null),
    [profile, allLogs, today],
  )
  const lastSets = useMemo<LastSets>(() => {
    if (!plan?.workout || !allLogs) return {}
    const m: LastSets = {}
    for (const ex of plan.workout.exercises) m[ex.name] = lastExerciseSets(ex.name, allLogs, today)
    return m
  }, [plan, allLogs, today])

  if (!profile || !plan || !progress) {
    return <div className="flex h-64 items-center justify-center text-muted">Loading today…</div>
  }

  const patch = (fn: (prev: DailyLog) => DailyLog) => update.mutate(fn)

  const habitHandlers: HabitHandlers = {
    toggle: (habit, done) => patch((prev) => upsertChecklist(prev, habit.id, { done })),
    toggleStep: (habit, stepId, done) =>
      patch((prev) => {
        const item = prev.checklist.find((c) => c.habit_id === habit.id)
        const steps = { ...(item?.steps ?? {}), [stepId]: done }
        const allDone = (habit.steps ?? []).every((s) => steps[s.id])
        return upsertChecklist(prev, habit.id, { steps, done: allDone })
      }),
    setQuick: (habit, value) =>
      patch((prev) => {
        const field = habit.quick_entry!
        const next = { ...prev, [field]: value }
        const done = deriveQuickDone(habit, value, profile.step_goal, profile.sleep_goal_hours)
        return upsertChecklist(next, habit.id, { done, value: value ?? undefined })
      }),
  }

  return (
    <div className="pb-4">
      {/* Sticky header */}
      <header
        className="surface sticky top-0 z-20 mb-3 flex items-center gap-3 border-b px-4 py-3"
        style={{ paddingTop: 'calc(var(--safe-top) + 0.6rem)' }}
      >
        <ProgressRing pct={progress.pct} size={52} stroke={6}>
          <span className="text-[13px] font-bold tabular-nums">{progress.pct}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold leading-tight">{prettyDate(today)}</div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1 font-semibold text-orange-400">
              <Flame size={13} /> {streak?.current ?? 0}-day streak
            </span>
            <span>·</span>
            <span>
              {progress.completed}/{progress.total} done
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-5 px-4">
        {plan.isRefeed && (
          <div className="flex items-center gap-2 rounded-xl bg-lift/15 px-3 py-2 text-sm text-lift">
            <Coffee size={16} />
            <span>
              <strong>Refeed day</strong> — higher carbs, still log in MyNetDiary.
            </span>
          </div>
        )}

        {plan.weekday === 0 && (
          <Link
            to="/checkin"
            className="tap flex items-center gap-3 rounded-2xl bg-brand/15 px-3 py-3 text-brand transition active:scale-[0.99]"
          >
            <ClipboardCheck size={18} />
            <span className="flex-1 text-sm font-semibold">Sunday — do your weekly check-in</span>
            <ChevronRight size={16} />
          </Link>
        )}

        {/* Training */}
        <section className="space-y-3">
          {plan.workout ? (
            <WorkoutLogger
              workout={plan.workout}
              log={log ?? null}
              lastSets={lastSets}
              onUpdateSets={(sets) => patch((p) => ({ ...p, lift_session: sets }))}
              onFinish={() => patch((p) => ({ ...p, lift_done: true, lift_completed_at: new Date().toISOString() }))}
              onReopen={() => patch((p) => ({ ...p, lift_done: false, lift_completed_at: null }))}
            />
          ) : (
            <RestCard label={plan.restLabel ?? 'Rest day'} status={plan.liftStatus} />
          )}
        </section>

        {/* Habits */}
        <section>
          <h2 className="mb-2 px-1 text-sm font-bold">Daily habits</h2>
          <HabitList habits={plan.habits} log={log ?? null} profile={profile} handlers={habitHandlers} />
        </section>

        {/* Daily metrics */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-bold">Log</h2>
            {fitbit.connected && (
              <FitbitSyncStatus
                syncing={syncing}
                error={syncError}
                syncedAt={log?.fitbit_synced_at ?? null}
                onSync={() => void runFitbitSync()}
              />
            )}
          </div>
          {(fitbit.connected || log?.calories_out != null) && (
            <div className="mb-3">
              <EnergyBalanceCard log={log ?? null} profile={profile} />
            </div>
          )}
          <DailyMetrics log={log ?? null} onPatch={patch} synced={Boolean(log?.fitbit_synced_at)} />
        </section>

        <ReminderCards weekday={plan.weekday} />
      </div>
    </div>
  )
}

function deriveQuickDone(habit: Habit, value: number | null, stepGoal: number, sleepGoal: number): boolean {
  if (value == null) return false
  if (habit.quick_entry === 'steps') return value >= stepGoal
  if (habit.quick_entry === 'sleep_hours') return value >= sleepGoal
  return true // rhr: logging it counts
}

// ── Fitbit sync glue ──────────────────────────────────────────────────────────

const QUICK_FIELD: Record<NonNullable<Habit['quick_entry']>, 'steps' | 'sleep_hours' | 'rhr_bpm'> = {
  steps: 'steps',
  sleep_hours: 'sleep_hours',
  rhr_bpm: 'rhr_bpm',
}

/** After a sync fills numeric fields, tick the matching quick-entry habits. */
function reflectQuickHabits(log: DailyLog, profile: Profile): DailyLog {
  let next = log
  for (const h of HABITS) {
    if (!h.quick_entry) continue
    const value = next[QUICK_FIELD[h.quick_entry]]
    if (value == null) continue
    const done = deriveQuickDone(h, value, profile.step_goal, profile.sleep_goal_hours)
    next = upsertChecklist(next, h.id, { done, value })
  }
  return next
}

// Per-date throttle so auto-sync runs once on open, then at most every 10 min.
const autoSyncedAt: Record<string, number> = {}
const AUTO_SYNC_TTL_MS = 10 * 60 * 1000
function shouldAutoSync(date: string): boolean {
  const last = autoSyncedAt[date]
  return !last || new Date().getTime() - last > AUTO_SYNC_TTL_MS
}
function markAutoSync(date: string) {
  autoSyncedAt[date] = new Date().getTime()
}

function FitbitSyncStatus({
  syncing,
  error,
  syncedAt,
  onSync,
}: {
  syncing: boolean
  error: string | null
  syncedAt: string | null
  onSync: () => void
}) {
  const label = syncing
    ? 'Syncing…'
    : error
      ? 'Sync failed'
      : syncedAt
        ? `Synced ${new Date(syncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
        : 'Tap to sync'
  return (
    <button
      type="button"
      onClick={onSync}
      disabled={syncing}
      title={error ?? 'Sync from Fitbit'}
      className={cn(
        'tap inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium transition',
        error ? 'text-rose-400 hover:bg-rose-500/10' : 'text-muted hover:bg-white/5',
      )}
    >
      <RefreshCw size={12} className={cn(syncing && 'animate-spin')} />
      {label}
    </button>
  )
}

function EnergyBalanceCard({ log, profile }: { log: DailyLog | null; profile: Profile }) {
  const burned = log?.calories_out ?? null
  const intakeFromFitbit = log?.calories_in ?? null
  const intake = intakeFromFitbit ?? profile.calorie_target
  const balance = burned != null ? Math.round(intake - burned) : null // negative = deficit
  const isDeficit = balance != null && balance < 0

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400">
          <Activity size={14} />
        </span>
        <span className="text-sm font-semibold">Energy balance</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="In" value={intake} sub={intakeFromFitbit != null ? 'Fitbit' : 'target'} />
        <Stat label="Out" value={burned} sub="burned" />
        <div className="rounded-xl bg-white/[0.03] px-2 py-2">
          <div className={cn('flex items-center justify-center gap-1 text-base font-bold tabular-nums', balance == null ? 'text-muted' : isDeficit ? 'text-emerald-400' : 'text-amber-400')}>
            {balance != null && (isDeficit ? <TrendingDown size={15} /> : <TrendingUp size={15} />)}
            {balance == null ? '—' : `${balance > 0 ? '+' : ''}${balance}`}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted">{balance == null ? 'balance' : isDeficit ? 'deficit' : 'surplus'}</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {burned == null
          ? 'Sync Fitbit to see calories burned and your deficit.'
          : intakeFromFitbit != null
            ? 'Intake from your Fitbit food log; burn is Fitbit’s total expenditure.'
            : 'Intake assumes your calorie target — log food in MyNetDiary to track actual intake. Burn is from Fitbit.'}
      </p>
    </Card>
  )
}

function Stat({ label, value, sub }: { label: string; value: number | null; sub: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-2 py-2">
      <div className="text-base font-bold tabular-nums">{value == null ? '—' : value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">
        {label} <span className="normal-case opacity-70">· {sub}</span>
      </div>
    </div>
  )
}

function RestCard({ label, status }: { label: string; status: string }) {
  return (
    <Card className="flex items-center gap-3 px-4 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
        <BedDouble size={18} />
      </span>
      <div>
        <div className="text-sm font-bold">{label}</div>
        <div className="text-xs text-muted">
          {status === 'not_started'
            ? 'Program starts soon — no lift scheduled today.'
            : status === 'completed'
              ? 'Program complete. Nice work.'
              : 'No lift today. Keep moving, recover well.'}
        </div>
      </div>
    </Card>
  )
}

function DailyMetrics({ log, onPatch, synced }: { log: DailyLog | null; onPatch: (fn: (p: DailyLog) => DailyLog) => void; synced: boolean }) {
  // Fitbit is the source of truth: when today's weight came from a sync, show it
  // read-only. Manual entry is only the fallback when there's no synced value.
  const weightFromFitbit = synced && log?.weight != null
  return (
    <Card className="space-y-3 p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400">
          <Dumbbell size={15} />
        </span>
        <span className="flex-1 text-sm font-medium">
          Weight
          {weightFromFitbit && <span className="ml-2 text-[11px] text-muted">from Fitbit</span>}
        </span>
        <div className="w-32">
          {weightFromFitbit ? (
            <div className="surface-2 flex items-baseline justify-center gap-1 rounded-xl px-3 py-2">
              <span className="text-base font-semibold tabular-nums">{log!.weight}</span>
              <span className="text-xs text-muted">lb</span>
            </div>
          ) : (
            <NumberInline
              value={log?.weight ?? null}
              step={0.2}
              suffix="lb"
              onChange={(v) => onPatch((p) => ({ ...p, weight: v }))}
            />
          )}
        </div>
      </div>
      <Scale icon={<Moon size={15} />} label="Energy" value={log?.energy ?? null} onChange={(v) => onPatch((p) => ({ ...p, energy: v }))} />
      <Scale icon={<Flame size={15} />} label="Mood" value={log?.mood ?? null} onChange={(v) => onPatch((p) => ({ ...p, mood: v }))} />
      <textarea
        value={log?.notes ?? ''}
        onChange={(e) => onPatch((p) => ({ ...p, notes: e.target.value }))}
        placeholder="Notes for today…"
        rows={2}
        className="surface-2 w-full resize-none rounded-xl px-3 py-2 text-sm outline-none placeholder:text-slate-600"
      />
    </Card>
  )
}

function Scale({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'tap h-8 w-8 rounded-lg text-xs font-semibold tabular-nums transition',
              value === n ? 'bg-brand text-white' : 'surface-2 text-muted hover:text-slate-200',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
