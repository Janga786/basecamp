import { useMemo } from 'react'
import { ScreenHeader } from './_Stub'
import { useProfile, useDailyLogsRange } from '@/data/queries'
import { useLogicalToday } from '@/domain/useToday'
import { assembleDay, dayProgress } from '@/domain/schedule'
import { logsByDate } from '@/domain/streaks'
import { weekStartStr, addDaysStr, weekdayOf, WEEKDAY_NAMES, prettyDateShort } from '@/lib/time'
import { DAY_TYPE_SHORT } from '@/domain/programs'
import { Card, ProgressRing } from '@/components/ui'
import { Dumbbell, Moon, Footprints, ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export function Week() {
  const { data: profile } = useProfile()
  const today = useLogicalToday()
  const start = weekStartStr(today)
  const end = addDaysStr(start, 6)
  const { data: logs } = useDailyLogsRange(start, end)

  const week = useMemo(() => {
    if (!profile) return null
    const map = logsByDate(logs ?? [])
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDaysStr(start, i)
      const plan = assembleDay(profile, date)
      const log = map[date] ?? null
      return { date, plan, log, progress: dayProgress(plan, log), isToday: date === today, isFuture: date > today }
    })
    const elapsed = days.filter((d) => !d.isFuture)
    const sleeps = elapsed.map((d) => d.log?.sleep_hours).filter((v): v is number => v != null)
    const steps = elapsed.map((d) => d.log?.steps).filter((v): v is number => v != null)
    const perfect = elapsed.filter((d) => d.progress.isPerfect).length
    return {
      days,
      avgSleep: sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null,
      avgSteps: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : null,
      perfect,
      elapsed: elapsed.length,
    }
  }, [profile, logs, start, today])

  if (!profile || !week) return <div className="flex h-64 items-center justify-center text-muted">Loading…</div>

  return (
    <div className="pb-4">
      <ScreenHeader
        title="This Week"
        subtitle={`${prettyDateShort(start)} – ${prettyDateShort(end)}`}
        right={
          <Link
            to="/checkin"
            className="tap flex items-center gap-1.5 rounded-xl bg-brand/15 px-3 py-2 text-xs font-semibold text-brand"
          >
            <ClipboardCheck size={14} /> Check-in
          </Link>
        }
      />
      <div className="space-y-4 px-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            icon={<Moon size={15} />}
            label="Avg sleep"
            value={week.avgSleep != null ? `${week.avgSleep.toFixed(1)}h` : '—'}
            goal={`${profile.sleep_goal_hours}h goal`}
            good={week.avgSleep != null && week.avgSleep >= profile.sleep_goal_hours}
          />
          <StatTile
            icon={<Footprints size={15} />}
            label="Avg steps"
            value={week.avgSteps != null ? week.avgSteps.toLocaleString() : '—'}
            goal={`${profile.step_goal.toLocaleString()} goal`}
            good={week.avgSteps != null && week.avgSteps >= profile.step_goal}
          />
          <StatTile
            icon={<span className="text-base leading-none">✓</span>}
            label="Perfect days"
            value={`${week.perfect}/${week.elapsed}`}
            goal="this week"
            good={week.perfect > 0 && week.perfect === week.elapsed}
          />
        </div>

        <Card className="divide-y hairline">
          {week.days.map((d) => {
            const wd = weekdayOf(d.date)
            const liftLabel = d.plan.liftDayIndex ? DAY_TYPE_SHORT[d.plan.liftDayIndex] : null
            return (
              <div
                key={d.date}
                className={cn('flex items-center gap-3 px-3 py-3', d.isToday && 'bg-brand/10', d.isFuture && 'opacity-55')}
              >
                <div className="w-10 shrink-0 text-center">
                  <div className={cn('text-[11px] font-semibold uppercase', d.isToday ? 'text-brand' : 'text-muted')}>
                    {WEEKDAY_NAMES[wd]}
                  </div>
                  <div className="text-lg font-bold leading-tight tabular-nums">{d.date.slice(8)}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {liftLabel ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-lift/15 px-1.5 py-0.5 text-[11px] font-medium text-lift">
                        <Dumbbell size={11} /> {liftLabel}
                      </span>
                    ) : (
                      <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-muted">Rest</span>
                    )}
                    {d.plan.isRefeed && (
                      <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-medium text-amber-400">Refeed</span>
                    )}
                  </div>
                  {!d.isFuture && (
                    <div className="mt-0.5 text-[11px] text-muted">
                      {d.progress.completed}/{d.progress.total} done
                      {d.log?.sleep_hours != null && ` · ${d.log.sleep_hours}h sleep`}
                      {d.log?.steps != null && ` · ${d.log.steps.toLocaleString()} steps`}
                    </div>
                  )}
                </div>
                {!d.isFuture && (
                  <ProgressRing pct={d.progress.pct} size={34} stroke={4}>
                    <span className="text-[9px] font-bold tabular-nums">{d.progress.pct}</span>
                  </ProgressRing>
                )}
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}

function StatTile({ icon, label, value, goal, good }: { icon: React.ReactNode; label: string; value: string; goal: string; good: boolean }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn('mt-1 text-lg font-bold tabular-nums', good ? 'text-habit' : 'text-slate-100')}>{value}</div>
      <div className="text-[10px] text-muted">{goal}</div>
    </Card>
  )
}
