import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { backendKind } from '@/data/provider'
import { getSupabase } from '@/lib/supabaseClient'

export interface AppUser {
  id: string
  email: string
  name?: string
  avatarUrl?: string
}

interface AuthCtx {
  user: AppUser | null
  loading: boolean
  mode: 'local' | 'supabase'
  signInGoogle: () => Promise<void>
  signInLocal: () => void
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)
const LOCAL_KEY = 'basecamp.localSession'
const LOCAL_USER: AppUser = { id: 'local-user', email: 'you@basecamp.local', name: 'You' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = backendKind()
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (mode === 'local') {
      setUser(localStorage.getItem(LOCAL_KEY) ? LOCAL_USER : null)
      setLoading(false)
      return
    }
    // Supabase mode
    const sb = getSupabase()
    sb.auth.getSession().then(({ data }) => {
      setUser(mapUser(data.session?.user))
      setLoading(false)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(mapUser(session?.user))
    })
    return () => sub.subscription.unsubscribe()
  }, [mode])

  const value: AuthCtx = {
    user,
    loading,
    mode,
    signInLocal: () => {
      localStorage.setItem(LOCAL_KEY, '1')
      setUser(LOCAL_USER)
    },
    signInGoogle: async () => {
      await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
    },
    signOut: async () => {
      if (mode === 'local') {
        localStorage.removeItem(LOCAL_KEY)
        setUser(null)
      } else {
        await getSupabase().auth.signOut()
        setUser(null)
      }
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUser(u: any): AppUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? '',
    name: u.user_metadata?.full_name ?? u.user_metadata?.name,
    avatarUrl: u.user_metadata?.avatar_url ?? u.user_metadata?.picture,
  }
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth outside provider')
  return c
}
