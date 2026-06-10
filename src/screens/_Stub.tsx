import type { ReactNode } from 'react'

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pb-4 pt-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function Stub({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <ScreenHeader title={title} />
      <div className="px-4">
        <div className="surface rounded-2xl p-6 text-sm text-muted">{note}</div>
      </div>
    </div>
  )
}
