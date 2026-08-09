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

  const load = useCallback(async (currentSession: Session | null) => {
    const run = ++generation.current
    setSession(currentSession)
    setError(null)
    if (!currentSession) {
      setContext(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const nextContext = await api.getContext(currentSession.user.id)
      if (run !== generation.current) return
      setContext(nextContext)
    } catch (cause) {
      if (run !== generation.current) return
      setContext(null)
      setError(cause instanceof Error ? cause.message : '사용자 정보를 불러오지 못했습니다.')
    } finally {
      if (run === generation.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) void load(data.session)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) void load(nextSession)
    })
    return () => {
      active = false
      generation.current += 1
      listener.subscription.unsubscribe()
    }
  }, [load])

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await load(data.session)
  }, [load])

  const value = useMemo(() => ({ session, context, loading, error, refresh }), [session, context, loading, error, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
