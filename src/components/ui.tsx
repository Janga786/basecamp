import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Check, Info, ChevronDown, ExternalLink, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ExternalLink as ExtLink } from '@/data/types'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('surface rounded-2xl', className)}>{children}</div>
}

export function SectionLabel({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
      {accent && <span className="h-2 w-2 rounded-full" style={{ background: accent }} />}
      {children}
    </div>
  )
}

/** A big, satisfying check toggle with generous tap target. */
export function CheckToggle({
  checked,
  onChange,
  label,
  sublabel,
  accent = '#3ecf8e',
  className,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  sublabel?: ReactNode
  accent?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'tap flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.99]',
        checked ? 'bg-habit/10' : 'hover:bg-white/5',
        className,
      )}
      style={checked ? { background: `color-mix(in srgb, ${accent} 12%, transparent)` } : undefined}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition',
          checked ? 'border-transparent text-ink-950' : 'border-ink-600 text-transparent',
        )}
        style={checked ? { background: accent } : undefined}
      >
        <Check size={18} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm font-medium leading-tight', checked && 'text-slate-300 line-through decoration-slate-500')}>
          {label}
        </span>
        {sublabel && <span className="mt-0.5 block text-xs text-muted">{sublabel}</span>}
      </span>
    </button>
  )
}

/** Small inline ⓘ that reveals a one-line rationale. */
export function InfoButton({ note }: { note: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="tap text-slate-500 transition hover:text-brand"
        aria-label="Why this matters"
      >
        <Info size={15} />
      </button>
      {open && (
        <div className="surface absolute right-0 z-30 mt-1 w-64 rounded-xl p-3 text-xs leading-relaxed text-slate-300 shadow-xl animate-fade-in">
          {note}
        </div>
      )}
    </div>
  )
}

export function Collapsible({
  title,
  defaultOpen = false,
  right,
  children,
}: {
  title: ReactNode
  defaultOpen?: boolean
  right?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="tap flex w-full items-center justify-between gap-2 py-1 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">{title}</span>
        <span className="flex items-center gap-2 text-muted">
          {right}
          <ChevronDown size={16} className={cn('transition', open && 'rotate-180')} />
        </span>
      </button>
      {open && <div className="mt-2 animate-fade-in">{children}</div>}
    </div>
  )
}

/** Circular progress ring with center label. */
export function ProgressRing({
  pct,
  size = 56,
  stroke = 6,
  children,
}: {
  pct: number
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c
  return (
    <div className="relative animate-ring-pop" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-ink-700" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className={cn('transition-all duration-500', pct >= 100 ? 'text-habit' : 'text-brand')}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

/** Numeric quick-entry with steppers and direct input. */
export function NumberField({
  value,
  onChange,
  placeholder,
  step = 1,
  suffix,
  min = 0,
  max,
}: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  step?: number
  suffix?: string
  min?: number
  max?: number
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max ?? Infinity, n))
  return (
    <div className="surface-2 flex items-center gap-1 rounded-xl px-1.5 py-1">
      <button
        type="button"
        onClick={() => onChange(clamp((value ?? 0) - step))}
        className="tap flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/5"
        aria-label="decrease"
      >
        <Minus size={16} />
      </button>
      <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <input
          inputMode="decimal"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value.trim()
            onChange(v === '' ? null : clamp(Number(v)))
          }}
          className="w-full bg-transparent text-center text-base font-semibold tabular-nums outline-none placeholder:text-slate-600"
        />
        {suffix && value != null && <span className="text-xs text-muted">{suffix}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(clamp((value ?? 0) + step))}
        className="tap flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/5"
        aria-label="increase"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

/** Best-effort outbound link: tries the iOS app scheme, falls back to web. */
export function ExternalActionLink({ link, className }: { link: ExtLink; className?: string }) {
  const go = () => {
    if (link.appUrl) {
      // Attempt native app; fall back to web shortly after.
      const t = window.setTimeout(() => {
        window.open(link.webUrl, '_blank', 'noopener')
      }, 500)
      window.location.href = link.appUrl
      window.addEventListener('pagehide', () => window.clearTimeout(t), { once: true })
    } else {
      window.open(link.webUrl, '_blank', 'noopener')
    }
  }
  return (
    <button
      type="button"
      onClick={go}
      className={cn(
        'tap inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand transition hover:bg-brand/10',
        className,
      )}
    >
      {link.label}
      <ExternalLink size={12} />
    </button>
  )
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', className)}>
      {children}
    </span>
  )
}
