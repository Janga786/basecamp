import { useMemo } from 'react'
import { ScreenHeader } from './_Stub'
import { useProfile, useAllDailyLogs } from '@/data/queries'
import { useLogicalToday } from '@/domain/useToday'
import { habitStreaks, perfectDayStreak, type HabitStreak } from '@/domain/streaks'
import { CATEGORY_LABEL } from '@/data/seed/habits'
import { Card } from '@/components/ui'
import { Flame, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Habits() {
  const { data: profile } = useProfile()
  const today = useLogicalToday()
  const { data: logs } = useAllDailyLogs()

  const { streaks, perfect } = useMemo(() => {
    if (!profile) return { streaks: [] as HabitStreak[], perfect: { current: 0, longest: 0 } }
    return {
      streaks: habitStreaks(profile, logs ?? [], today),
      perfect: perfectDayStreak(profile, logs ?? [], today),
    }
  }, [profile, logs, today])

  if (!profile) return <div className="flex h-64 items-center justify-center text-muted">Loading…</div>

  return (
    <div className="pb-4">
      <ScreenHeader title="Habits & Streaks" subtitle="Honest data. Last 30 days." />
      <div className="space-y-4 px-4">
        {/* Perfect-day streak hero */}
        <Card className="flex items-center gap-4 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-400">
            <Flame size={26} />
          </div>
          <div className="flex-1">
            <div className="text-2xl font-extrabold leading-none">
              {perfect.current} <span className="text-base font-semibold text-muted">day{perfect.current === 1 ? '' : 's'}</span>
            </div>
            <div className="text-xs text-muted">Perfect-day streak — every scheduled item done</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-sm font-bold text-amber-400">
              <Trophy size={14} /> {perfect.longest}
            </div>
            <div className="text-[10px] text-muted">best</div>
          </div>
        </Card>

        {/* Per-habit */}
        <div className="space-y-2">
          {streaks.map((s) => (
            <Card key={s.habit.id} className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{s.habit.label}</div>
                  <div className="text-[11px] text-muted">{CATEGORY_LABEL[s.habit.category]}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-right">
                  <div>
                    <div className="flex items-center gap-1 text-sm font-bold text-orange-400">
                      <Flame size={13} /> {s.current}
                    </div>
                    <div className="text-[9px] uppercase text-muted">current</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-400">{s.longest}</div>
                    <div className="text-[9px] uppercase text-muted">best</div>
                  </div>
                </div>
              </div>
              <DotGrid last30={s.last30} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function DotGrid({ last30 }: { last30: HabitStreak['last30'] }) {
  return (
    <div className="mt-2.5 flex gap-[3px]">
      {last30.map((d) => (
        <div
          key={d.date}
          title={`${d.date}: ${d.done ? 'done' : d.logged ? 'missed' : 'no log'}`}
          className={cn(
            'h-4 flex-1 rounded-[3px]',
            d.done ? 'bg-habit' : d.logged ? 'bg-rose-500/40' : 'bg-white/5',
          )}
        />
      ))}
    </div>
  )
}
