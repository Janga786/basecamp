import { useMemo, useState, useEffect } from 'react'
import { ScreenHeader } from './_Stub'
import { useProfile, useDailyLogsRange, useCheckins, useSaveCheckin, useCheckin } from '@/data/queries'
import { useLogicalToday } from '@/domain/useToday'
import { assembleDay, dayProgress } from '@/domain/schedule'
import { logsByDate } from '@/domain/streaks'
import { weekStartStr, addDaysStr, prettyDateShort } from '@/lib/time'
import { Card } from '@/components/ui'
import type { WeeklyCheckin } from '@/data/types'
import { Check, TrendingUp } from 'lucide-react'

export function CheckIn() {
  const { data: profile } = useProfile()
  const today = useLogicalToday()
  const start = weekStartStr(today)
  const end = addDaysStr(start, 6)
  const { data: logs } = useDailyLogsRange(start, end)
  const { data: existing } = useCheckin(start)
  const { data: past } = useCheckins()
  const save = useSaveCheckin()

  const computed = useMemo(() => {
    if (!profile) return { avgSleep: null, avgSteps: null, adherence: null }
    const map = logsByDate(logs ?? [])
    const days = Array.from({ length: 7 }, (_, i) => addDaysStr(start, i)).filter((d) => d <= today)
    const sleeps: number[] = []
    const steps: number[] = []
    const pcts: number[] = []
    for (const date of days) {
      const log = map[date] ?? null
      if (log?.sleep_hours != null) sleeps.push(log.sleep_hours)
      if (log?.steps != null) steps.push(log.steps)
      pcts.push(dayProgress(assembleDay(profile, date), log).pct)
    }
    const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
    return {
      avgSleep: mean(sleeps),
      avgSteps: steps.length ? Math.round(mean(steps)!) : null,
      adherence: pcts.length ? Math.round(mean(pcts)!) : null,
    }
  }, [profile, logs, start, today])

  const [form, setForm] = useState<WeeklyCheckin>(() => blank(start))
  useEffect(() => {
    if (existing) setForm(existing)
    else
      setForm((f) => ({
        ...f,
        week_start: start,
        avg_sleep: computed.avgSleep,
        avg_steps: computed.avgSteps,
        adherence_pct: computed.adherence,
        weight: f.weight ?? profile?.current_weight ?? null,
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, start, computed.avgSleep, computed.avgSteps, computed.adherence])

  const [saved, setSaved] = useState(false)
  const onSave = () => {
    save.mutate(form, { onSuccess: () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800) } })
  }

  return (
    <div className="pb-4">
      <ScreenHeader title="Weekly Check-in" subtitle={`${prettyDateShort(start)} – ${prettyDateShort(end)}`} />
      <div className="space-y-4 px-4">
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Avg sleep" value={form.avg_sleep != null ? `${form.avg_sleep.toFixed(1)}h` : '—'} />
            <Metric label="Avg steps" value={form.avg_steps != null ? form.avg_steps.toLocaleString() : '—'} />
            <Metric label="Adherence" value={form.adherence_pct != null ? `${form.adherence_pct}%` : '—'} />
          </div>
          <div className="mt-3 flex items-center gap-2 border-t hairline pt-3">
            <span className="flex-1 text-sm font-medium">Weight (lb)</span>
            <input
              inputMode="decimal"
              value={form.weight ?? ''}
              onChange={(e) => setForm({ ...form, weight: e.target.value === '' ? null : Number(e.target.value) })}
              className="surface-2 w-24 rounded-lg px-3 py-1.5 text-right text-sm font-semibold outline-none"
            />
          </div>
        </Card>

        <Field label="One win this week" value={form.win} onChange={(v) => setForm({ ...form, win: v })} placeholder="What went well?" />
        <Field label="One friction point" value={form.friction} onChange={(v) => setForm({ ...form, friction: v })} placeholder="What got in the way?" />
        <Field label="Next week's focus" value={form.next_week_focus} onChange={(v) => setForm({ ...form, next_week_focus: v })} placeholder="One thing to dial in." />

        <button
          type="button"
          onClick={onSave}
          className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white transition active:scale-[0.99]"
        >
          {saved ? (
            <>
              <Check size={16} /> Saved
            </>
          ) : (
            'Save check-in'
          )}
        </button>

        {/* Past check-ins */}
        {past && past.filter((c) => c.week_start !== start).length > 0 && (
          <div className="pt-2">
            <h2 className="mb-2 px-1 text-sm font-bold">Past check-ins</h2>
            <div className="space-y-2">
              {past
                .filter((c) => c.week_start !== start)
                .map((c) => (
                  <Card key={c.week_start} className="p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                      <TrendingUp size={13} />
                      Week of {prettyDateShort(c.week_start)}
                      <span className="ml-auto font-normal">
                        {c.avg_sleep != null && `${c.avg_sleep.toFixed(1)}h · `}
                        {c.adherence_pct != null && `${c.adherence_pct}%`}
                      </span>
                    </div>
                    {c.win && <p className="mt-1.5 text-xs"><span className="text-habit">Win:</span> {c.win}</p>}
                    {c.friction && <p className="mt-0.5 text-xs"><span className="text-rose-400">Friction:</span> {c.friction}</p>}
                    {c.next_week_focus && <p className="mt-0.5 text-xs"><span className="text-brand">Focus:</span> {c.next_week_focus}</p>}
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block px-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="surface w-full resize-none rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-slate-600"
      />
    </div>
  )
}

function blank(weekStart: string): WeeklyCheckin {
  return {
    week_start: weekStart,
    avg_sleep: null,
    avg_steps: null,
    weight: null,
    adherence_pct: null,
    win: '',
    friction: '',
    next_week_focus: '',
    updated_at: new Date().toISOString(),
  }
}
