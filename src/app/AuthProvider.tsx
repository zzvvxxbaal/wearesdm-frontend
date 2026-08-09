import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { api } from '../services/api'
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
  const mounted = useRef(true)

  const load = useCallback(async (nextSession: Session | null) => {
    const run = ++generation.current

    if (!mounted.current) return

    setSession(nextSession)
    setError(null)

    if (!nextSession) {
      setContext(null)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const nextContext = await api.getContext(nextSession.user.id)
      if (!mounted.current || run !== generation.current) return
      setContext(nextContext)
    } catch (cause) {
      if (!mounted.current || run !== generation.current) return
      setContext(null)
      setError(
        cause instanceof Error
          ? cause.message
          : '사용자 정보를 불러오지 못했습니다.',
      )
    } finally {
      if (mounted.current && run === generation.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void load(nextSession)
    })

    void supabase.auth.getSession().then(({ data: sessionData, error: sessionError }) => {
      if (!mounted.current) return
      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        return
      }
      void load(sessionData.session)
    })

    return () => {
      mounted.current = false
      generation.current += 1
      data.subscription.unsubscribe()
    }
  }, [load])

  const refresh = useCallback(async () => {
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
