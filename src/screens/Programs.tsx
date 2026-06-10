import { useState } from 'react'
import { ScreenHeader } from './_Stub'
import { LiftCard } from '@/components/LiftCard'
import { getLiftDay, DAY_TYPE_SHORT, LIFT_TOTAL_WEEKS } from '@/domain/programs'
import { PROGRAM_NOTES } from '@/data/seed/warmup'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui'

export function Programs() {
  return (
    <div className="pb-4">
      <ScreenHeader title="Programs" subtitle="Browse your full 12-week lifting plan — reference only." />
      <div className="px-4">
        <LiftBrowser />
      </div>
    </div>
  )
}

function ChipRow<T extends string | number>({
  values,
  selected,
  onSelect,
  label,
}: {
  values: T[]
  selected: T
  onSelect: (v: T) => void
  label: (v: T) => string
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onSelect(v)}
          className={cn(
            'tap shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
            selected === v ? 'bg-brand text-white' : 'surface text-muted',
          )}
        >
          {label(v)}
        </button>
      ))}
    </div>
  )
}

function LiftBrowser() {
  const [week, setWeek] = useState(1)
  const [day, setDay] = useState(1)
  const workout = getLiftDay(week, day)
  return (
    <div className="space-y-3">
      <ChipRow
        values={Array.from({ length: LIFT_TOTAL_WEEKS }, (_, i) => i + 1)}
        selected={week}
        onSelect={setWeek}
        label={(w) => `Week ${w}`}
      />
      <ChipRow values={[1, 2, 3, 4, 5]} selected={day} onSelect={setDay} label={(d) => DAY_TYPE_SHORT[d]} />
      {workout ? (
        <LiftCard workout={workout} />
      ) : (
        <Card className="p-6 text-sm text-muted">No data for this day.</Card>
      )}
      <Card className="p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Program notes</div>
        <ul className="list-disc space-y-1 pl-4 text-xs text-slate-300">
          {PROGRAM_NOTES.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
