import { useState, useEffect } from 'react'
import { ScreenHeader } from './_Stub'
import { useProfile, useUpdateProfile } from '@/data/queries'
import { useTheme } from '@/state/theme'
import { useAuth } from '@/state/auth'
import { useFitbit } from '@/state/fitbit'
import { fetchFitbitDay, getFitbitDiagnostics } from '@/lib/fitbit'
import { useLogicalToday } from '@/domain/useToday'
import type { FitbitDay } from '@/lib/fitbit'
import { getProvider } from '@/data/provider'
import { HABITS } from '@/data/seed/habits'
import { DAY_TYPE_SHORT } from '@/domain/programs'
import { WEEKDAY_FULL } from '@/lib/time'
import { Card } from '@/components/ui'
import type { Profile } from '@/data/types'
import { useQueryClient } from '@tanstack/react-query'
import { Moon, Sun, LogOut, Check, CloudOff, Cloud, Trash2, Activity } from 'lucide-react'
import { cn } from '@/lib/cn'

// Monday-first weekday order for the template editor.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function Settings() {
  const { data: serverProfile } = useProfile()
  const update = useUpdateProfile()
  const { theme, toggle } = useTheme()
  const { user, mode, signOut } = useAuth()
  const qc = useQueryClient()

  const [draft, setDraft] = useState<Profile | null>(null)
  useEffect(() => {
    if (serverProfile && !draft) setDraft(structuredClone(serverProfile))
  }, [serverProfile, draft])

  const [saved, setSaved] = useState(false)
  if (!draft) return <div className="flex h-64 items-center justify-center text-muted">Loading…</div>

  const set = (patch: Partial<Profile>) => setDraft({ ...draft, ...patch })
  const setSettings = (patch: Partial<Profile['settings']>) => setDraft({ ...draft, settings: { ...draft.settings, ...patch } })

  const dirty = JSON.stringify(draft) !== JSON.stringify(serverProfile)
  const onSave = () => {
    setDraft({ ...draft, settings: { ...draft.settings, theme } })
    update.mutate({ ...draft, settings: { ...draft.settings, theme } }, { onSuccess: () => { setSaved(true); window.setTimeout(() => setSaved(false), 1600) } })
  }

  const toggleHabit = (id: string, optional: boolean, on: boolean) => {
    if (optional) {
      const list = new Set(draft.settings.enabled_optional_habits)
      on ? list.add(id) : list.delete(id)
      setSettings({ enabled_optional_habits: [...list] })
    } else {
      const list = new Set(draft.settings.disabled_core_habits)
      on ? list.delete(id) : list.add(id)
      setSettings({ disabled_core_habits: [...list] })
    }
  }

  const setTemplateDay = (weekday: number, patch: { lift_day_index?: number | null }) => {
    const wt = draft.settings.weekly_template.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d))
    setSettings({ weekly_template: wt })
  }

  const resetData = async () => {
    if (!window.confirm('Erase all daily logs, check-ins, and profile edits on this device? This cannot be undone.')) return
    const p = await getProvider()
    await p.reset()
    qc.clear()
    window.location.reload()
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="Settings" subtitle="Everything is editable here." />
      <div className="space-y-5 px-4">
        {/* Account */}
        <Section title="Account">
          <Card className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-brand">
                {mode === 'supabase' ? <Cloud size={18} /> : <CloudOff size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user?.name || user?.email || 'You'}</div>
                <div className="text-[11px] text-muted">
                  {mode === 'supabase' ? 'Synced via Supabase' : 'Local mode — this device only'}
                </div>
              </div>
              <button onClick={() => void signOut()} className="tap flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-white/5">
                <LogOut size={14} /> Sign out
              </button>
            </div>
            {mode === 'local' && (
              <p className="mt-2 border-t hairline pt-2 text-[11px] text-muted">
                To sync across devices and survive a cache clear, set up Supabase (see README) and set{' '}
                <code className="rounded bg-white/10 px-1">VITE_DATA_BACKEND=supabase</code>.
              </p>
            )}
          </Card>
        </Section>

        {/* Connected apps */}
        <Section title="Connected apps">
          <FitbitCard />
        </Section>

        {/* Profile & goals */}
        <Section title="Profile & goals">
          <Card className="divide-y hairline">
            <TextRow label="Height" value={draft.height} onChange={(v) => set({ height: v })} />
            <NumRow label="Current weight (lb)" value={draft.current_weight} step={0.2} onChange={(v) => set({ current_weight: v })} />
            <NumRow label="Goal weight (lb)" value={draft.goal_weight} step={0.2} onChange={(v) => set({ goal_weight: v })} />
            <NumRow label="Protein target (g)" value={draft.protein_target_g} onChange={(v) => set({ protein_target_g: v })} />
            <NumRow label="Calorie target" value={draft.calorie_target} step={50} onChange={(v) => set({ calorie_target: v })} />
            <NumRow label="Step goal" value={draft.step_goal} step={250} onChange={(v) => set({ step_goal: v })} />
            <NumRow label="Sleep goal (hrs)" value={draft.sleep_goal_hours} step={0.25} onChange={(v) => set({ sleep_goal_hours: v })} />
          </Card>
        </Section>

        {/* Program timing */}
        <Section title="Program timing">
          <Card className="divide-y hairline">
            <DateRow label="Lift Week-1 start" value={draft.lift_start_date} onChange={(v) => set({ lift_start_date: v })} />
            <DateRow label="Cut start date" value={draft.cut_start_date} onChange={(v) => set({ cut_start_date: v })} />
            <NumRow label="Cut length (weeks)" value={draft.cut_length_weeks} onChange={(v) => set({ cut_length_weeks: v })} />
            <SelectRow
              label="Refeed day"
              value={draft.refeed_weekday}
              options={WEEKDAY_ORDER.map((w) => ({ value: w, label: WEEKDAY_FULL[w] }))}
              onChange={(v) => set({ refeed_weekday: v })}
            />
          </Card>
        </Section>

        {/* Weekly template */}
        <Section title="Weekly training template">
          <Card className="divide-y hairline">
            {WEEKDAY_ORDER.map((wd) => {
              const day = draft.settings.weekly_template.find((d) => d.weekday === wd)!
              return (
                <div key={wd} className="flex items-center gap-2 px-3 py-2.5">
                  <span className="w-10 shrink-0 text-xs font-semibold text-muted">{WEEKDAY_FULL[wd].slice(0, 3)}</span>
                  <select
                    value={day.lift_day_index ?? 0}
                    onChange={(e) => setTemplateDay(wd, { lift_day_index: Number(e.target.value) || null })}
                    className="surface-2 flex-1 rounded-lg px-2 py-1.5 text-sm outline-none"
                  >
                    <option value={0}>Rest</option>
                    {[1, 2, 3, 4, 5].map((d) => (
                      <option key={d} value={d}>
                        {DAY_TYPE_SHORT[d]}
                      </option>
                    ))}
                  </select>
                </div>
              )
            })}
          </Card>
        </Section>

        {/* Habits */}
        <Section title="Habits">
          <Card className="divide-y hairline">
            {HABITS.map((h) => {
              const on = h.optional ? draft.settings.enabled_optional_habits.includes(h.id) : !draft.settings.disabled_core_habits.includes(h.id)
              return (
                <div key={h.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {h.label}
                      {h.optional && <span className="rounded bg-white/10 px-1 py-px text-[9px] uppercase text-muted">advanced</span>}
                    </div>
                    <div className="truncate text-[11px] text-muted">{h.info_note}</div>
                  </div>
                  <Switch on={on} onChange={(v) => toggleHabit(h.id, h.optional, v)} />
                </div>
              )
            })}
          </Card>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <Card className="divide-y hairline">
            <div className="flex items-center gap-3 px-3 py-3">
              <span className="flex-1 text-sm font-medium">Theme</span>
              <button onClick={toggle} className="tap flex items-center gap-2 rounded-lg surface-2 px-3 py-1.5 text-sm font-medium">
                {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>
            <TextRow label="Timezone" value={draft.settings.timezone} onChange={(v) => setSettings({ timezone: v })} />
            <NumRow label="Day rollover hour" value={draft.settings.rollover_hour} min={0} max={6} onChange={(v) => setSettings({ rollover_hour: v })} />
          </Card>
        </Section>

        {/* Danger */}
        <Section title="Data">
          <button onClick={() => void resetData()} className="tap flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-semibold text-rose-400">
            <Trash2 size={15} /> Erase all data on this device
          </button>
        </Section>
      </div>

      {/* Sticky save */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-[68px] z-30 px-4 md:bottom-4" style={{ paddingBottom: 'var(--safe-bottom)' }}>
          <button
            onClick={onSave}
            className="tap mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-xl shadow-brand/30 transition active:scale-[0.99]"
          >
            {saved ? (<><Check size={16} /> Saved</>) : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}

type Diag = ReturnType<typeof getFitbitDiagnostics>

function FitbitCard() {
  const { configured, connected, connect, disconnect } = useFitbit()
  const today = useLogicalToday()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [diag, setDiag] = useState<{ day: FitbitDay; entries: Diag } | null>(null)
  const [diagBusy, setDiagBusy] = useState(false)

  const onConnect = async () => {
    setBusy(true)
    setErr(null)
    try {
      await connect() // redirects away on success
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const runDiagnostic = async () => {
    setDiagBusy(true)
    setErr(null)
    try {
      const day = await fetchFitbitDay(today)
      setDiag({ day, entries: getFitbitDiagnostics() })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setDiagBusy(false)
    }
  }

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', connected ? 'bg-habit/20 text-habit' : 'bg-white/5 text-slate-400')}>
          <Activity size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Fitbit <span className="font-normal text-muted">· via Google Health</span></div>
          <div className="text-[11px] text-muted">
            {!configured
              ? 'Not configured on this deployment'
              : connected
                ? 'Connected — auto-syncs steps, sleep, RHR, weight & calories'
                : 'Pull steps, sleep, resting HR, weight & calories automatically'}
          </div>
        </div>
        {configured &&
          (connected ? (
            <button onClick={disconnect} className="tap rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-white/5">
              Disconnect
            </button>
          ) : (
            <button onClick={() => void onConnect()} disabled={busy} className="tap rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          ))}
      </div>
      {!configured && (
        <p className="mt-2 border-t hairline pt-2 text-[11px] text-muted">
          Set <code className="rounded bg-white/10 px-1">VITE_GOOGLE_CLIENT_ID</code> (and the serverless{' '}
          <code className="rounded bg-white/10 px-1">GOOGLE_CLIENT_ID</code> /{' '}
          <code className="rounded bg-white/10 px-1">GOOGLE_CLIENT_SECRET</code>) in your env to enable this. See the README.
        </p>
      )}
      {err && <p className="mt-2 border-t hairline pt-2 text-[11px] text-rose-400">{err}</p>}

      {connected && (
        <div className="mt-2 border-t hairline pt-2">
          <button
            onClick={() => void runDiagnostic()}
            disabled={diagBusy}
            className="tap text-[11px] font-medium text-brand disabled:opacity-60"
          >
            {diagBusy ? 'Running…' : 'Run sync diagnostic'}
          </button>
          {diag && (
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="text-muted">Per-metric result for today ({today}):</div>
              <div className="space-y-0.5">
                {diag.entries.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 font-mono">
                    <span className={cn('inline-block w-3 text-center', e.ok && (e.pointCount ?? 0) > 0 ? 'text-habit' : e.ok ? 'text-amber-400' : 'text-rose-400')}>
                      {e.ok && (e.pointCount ?? 0) > 0 ? '●' : e.ok ? '○' : '×'}
                    </span>
                    <span className="flex-1 truncate">
                      {e.dataType} <span className="text-slate-500">[{e.method}]</span>{' '}
                      {String(e.status)}
                      {e.pointCount != null ? ` · ${e.pointCount}pt` : ''}
                      {e.note ? ` · ${e.note}` : ''}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 border-t hairline pt-1.5 text-muted">Extracted values:</div>
              <div className="font-mono text-slate-300">
                steps {fmt(diag.day.steps)} · sleep {fmt(diag.day.sleep_hours)}h · rhr {fmt(diag.day.rhr_bpm)} · wt {fmt(diag.day.weight)}lb · out {fmt(diag.day.calories_out)} · in {fmt(diag.day.calories_in)}
              </div>
              <p className="text-slate-500">
                ● data found · ○ ok but empty · × error. If values look wrong, send these lines to calibrate the mapping.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function fmt(v: number | null): string {
  return v == null ? '—' : String(v)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="flex-1 text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="surface-2 w-36 rounded-lg px-3 py-1.5 text-right text-sm outline-none" />
    </Row>
  )
}

function NumRow({ label, value, onChange, step = 1, min, max }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <Row label={label}>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => {
          let n = Number(e.target.value)
          if (Number.isNaN(n)) return
          if (min != null) n = Math.max(min, n)
          if (max != null) n = Math.min(max, n)
          onChange(n)
        }}
        step={step}
        type="number"
        className="surface-2 w-24 rounded-lg px-3 py-1.5 text-right text-sm font-semibold outline-none"
      />
    </Row>
  )
}

function DateRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="surface-2 rounded-lg px-3 py-1.5 text-sm outline-none" />
    </Row>
  )
}

function SelectRow({ label, value, options, onChange }: { label: string; value: number; options: { value: number; label: string }[]; onChange: (v: number) => void }) {
  return (
    <Row label={label}>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="surface-2 rounded-lg px-2 py-1.5 text-sm outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Row>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={cn('tap relative h-6 w-11 shrink-0 rounded-full transition', on ? 'bg-habit' : 'bg-ink-600')}
      aria-pressed={on}
    >
      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}
