import { useAuth } from '@/state/auth'
import { Logo } from '@/components/AppShell'
import { CloudOff } from 'lucide-react'

export function Auth() {
  const { mode, signInGoogle, signInLocal } = useAuth()
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <Logo size={56} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Basecamp</h1>
        <p className="mt-2 text-sm text-muted">
          Your daily command center for lifting and longevity habits.
        </p>

        <div className="mt-10 space-y-3">
          {mode === 'supabase' ? (
            <button
              type="button"
              onClick={() => void signInGoogle()}
              className="tap flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-lg transition active:scale-[0.99]"
            >
              <GoogleMark />
              Continue with Google
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={signInLocal}
                className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition active:scale-[0.99]"
              >
                Enter Basecamp
              </button>
              <div className="flex items-center justify-center gap-2 rounded-xl bg-ink-850 px-3 py-2 text-xs text-muted">
                <CloudOff size={14} />
                Local mode — data is saved on this device. Add Supabase to sync across devices.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 5.1 29.5 3 24 3 16 3 9.1 7.6 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.9 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9 40.3 15.9 45 24 45z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 36 45 30.6 45 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}
