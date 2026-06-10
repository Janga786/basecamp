import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ThemeProvider } from '@/state/theme'
import { AuthProvider, useAuth } from '@/state/auth'
import { FitbitProvider, useFitbit } from '@/state/fitbit'
import { AppShell } from '@/components/AppShell'
import { Auth } from '@/screens/Auth'
import { Today } from '@/screens/Today'
import { Week } from '@/screens/Week'
import { Programs } from '@/screens/Programs'
import { Habits } from '@/screens/Habits'
import { Settings } from '@/screens/Settings'
import { CheckIn } from '@/screens/CheckIn'
import { Logo } from '@/components/AppShell'
import { FITBIT_REDIRECT_PATH, completeFitbitAuth } from '@/lib/fitbit'

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
})

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full items-center justify-center px-6 text-center">{children}</div>
}

/** Handles the Fitbit OAuth redirect (?code=…) before the auth gate. */
function FitbitCallback() {
  const navigate = useNavigate()
  const { refresh } = useFitbit()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const denied = params.get('error')
    if (denied) {
      setError('Fitbit connection was cancelled.')
      return
    }
    if (!code) {
      setError('No authorization code returned from Fitbit.')
      return
    }
    completeFitbitAuth(code, params.get('state'))
      .then(() => {
        refresh()
        navigate('/settings', { replace: true })
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [navigate, refresh])

  if (error) {
    return (
      <Centered>
        <div className="space-y-3">
          <p className="text-sm text-rose-400">{error}</p>
          <button onClick={() => navigate('/settings', { replace: true })} className="tap rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
            Back to Settings
          </button>
        </div>
      </Centered>
    )
  }
  return (
    <Centered>
      <div className="animate-pulse text-sm text-muted">Connecting Fitbit…</div>
    </Centered>
  )
}

function Gate() {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="animate-pulse">
          <Logo size={40} />
        </div>
      </div>
    )
  if (!user) return <Auth />
  return (
    <AppShell>
      <Routes>
        <Route path="/today" element={<Today />} />
        <Route path="/week" element={<Week />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
    </AppShell>
  )
}

/** Routes the Fitbit callback path to its handler; everything else to the gate. */
function Root() {
  const { pathname } = useLocation()
  if (pathname === FITBIT_REDIRECT_PATH) return <FitbitCallback />
  return <Gate />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <FitbitProvider>
            <BrowserRouter>
              <Root />
            </BrowserRouter>
          </FitbitProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
