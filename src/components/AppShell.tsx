import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { CalendarDays, Dumbbell, ListChecks, Home, Settings } from 'lucide-react'
import { cn } from '@/lib/cn'

const TABS = [
  { to: '/today', label: 'Today', icon: Home },
  { to: '/week', label: 'Week', icon: CalendarDays },
  { to: '/programs', label: 'Programs', icon: Dumbbell },
  { to: '/habits', label: 'Habits', icon: ListChecks },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation()
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl md:gap-6 md:px-6">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 py-6 md:flex">
        <div className="mb-6 flex items-center gap-2 px-3">
          <Logo />
          <span className="text-lg font-extrabold tracking-tight">Basecamp</span>
        </div>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-brand/15 text-brand' : 'text-muted hover:bg-white/5 hover:text-slate-200',
              )
            }
          >
            <t.icon size={18} />
            {t.label}
          </NavLink>
        ))}
      </aside>

      {/* Main column */}
      <main
        className="w-full flex-1 pb-24 md:pb-8"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div key={loc.pathname} className="animate-fade-in">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="surface fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t md:hidden"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition',
                isActive ? 'text-brand' : 'text-slate-500',
              )
            }
          >
            <t.icon size={21} />
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#4f9cff" />
      <path d="M16 6 L26 24 H6 Z" fill="#0b0f14" opacity="0.9" />
      <path d="M16 14 L21 24 H11 Z" fill="#4f9cff" />
    </svg>
  )
}
