import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { beginFitbitAuth, disconnectFitbit, fitbitConfigured, fitbitConnected } from '@/lib/fitbit'

interface FitbitCtx {
  /** Is the integration available (client ID env var set)? */
  configured: boolean
  /** Are we currently holding Fitbit tokens? */
  connected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  /** Re-read connection state (call after a sync that may have expired tokens). */
  refresh: () => void
}

const Ctx = createContext<FitbitCtx | null>(null)

export function FitbitProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(fitbitConnected())

  const connect = useCallback(async () => {
    await beginFitbitAuth() // redirects away; resolves only if it throws
  }, [])

  const disconnect = useCallback(() => {
    disconnectFitbit()
    setConnected(false)
  }, [])

  const refresh = useCallback(() => setConnected(fitbitConnected()), [])

  return (
    <Ctx.Provider value={{ configured: fitbitConfigured(), connected, connect, disconnect, refresh }}>
      {children}
    </Ctx.Provider>
  )
}

export function useFitbit() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useFitbit outside provider')
  return c
}
