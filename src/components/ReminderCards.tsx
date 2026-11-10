import { useState } from 'react'
import { REMINDER_CARDS } from '@/data/seed/habits'
import { Stethoscope, X } from 'lucide-react'
import { logicalDateStr, weekStartStr } from '@/lib/time'

/**
 * Non-daily, dismissible reminder cards (§5b), defined in seed/habits.ts.
 * Surfaced ~weekly (on Sundays) and dismissible for the current week.
 */
export function ReminderCards({ weekday }: { weekday: number }) {
  const week = weekStartStr(logicalDateStr())
  const [dismissed, setDismissed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('basecamp.reminderDismiss') || '{}')
    } catch {
      return {}
    }
  })

  // Show only on Sundays (weekly cadence).
  if (weekday !== 0) return null

  const visible = REMINDER_CARDS.filter((c) => dismissed[`${c.id}:${week}`] !== true)
  if (visible.length === 0) return null

  const dismiss = (id: string) => {
    const next = { ...dismissed, [`${id}:${week}`]: true }
    setDismissed(next)
    localStorage.setItem('basecamp.reminderDismiss', JSON.stringify(next))
  }

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-bold">Weekly reminders</h2>
      {visible.map((c) => (
        <div key={c.id} className="surface flex items-start gap-3 rounded-2xl p-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
            <Stethoscope size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{c.title}</div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{c.body}</p>
          </div>
          <button type="button" onClick={() => dismiss(c.id)} className="tap shrink-0 text-slate-500 hover:text-slate-300" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      ))}
    </section>
  )
}
