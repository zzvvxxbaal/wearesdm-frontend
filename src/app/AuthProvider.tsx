import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase, assertSupabaseConfigured } from '../lib/supabase'
import { api } from '../services/api'
import { getErrorMessage } from '../lib/errors'
import type { AppContextData } from '../types/domain'

interface AuthContextValue {
  session: Session | null
  context: AppContextData | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [context, setContext] = useState<AppContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const generation = useRef(0)

  const load = useCallback(async (nextSession: Session | null) => {
    const run = ++generation.current
    setSession(nextSession)
    setError(null)

    if (!nextSession) {
      setContext(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      assertSupabaseConfigured()
      const nextContext = await api.getContext(nextSession.user.id)
      if (run !== generation.current) return
      setContext(nextContext)
    } catch (cause) {
      if (run !== generation.current) return
      setContext(null)
      setError(getErrorMessage(cause))
    } finally {
      if (run === generation.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, nextSession) => {
        if (!active) return

        // Supabase invokes this callback while holding its internal auth lock.
        // Defer DB work so a context query cannot deadlock token refresh/sign-out.
        window.setTimeout(() => {
          if (!active) return
          if (event === 'TOKEN_REFRESHED') {
            setSession(nextSession)
            return
          }
          void load(nextSession)
        }, 0)
      },
    )

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setError(getErrorMessage(sessionError))
        setLoading(false)
        return
      }
      void load(data.session)
    })

    return () => {
      active = false
      generation.current += 1
      listener.subscription.unsubscribe()
    }
  }, [load])

  const refresh = useCallback(async () => {
    assertSupabaseConfigured()
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    await load(data.session)
  }, [load])

  const value = useMemo(
    () => ({ session, context, loading, error, refresh }),
    [session, context, loading, error, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
