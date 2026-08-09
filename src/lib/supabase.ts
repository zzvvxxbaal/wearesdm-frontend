import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && key)

if (!isSupabaseConfigured) {
  console.error(
    '[wearesdm] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  )
}

// Keep client creation deterministic so React can safely import this module in every route.
// The fallback is intentionally non-routable and is never expected to receive real traffic.
export const supabase = createClient(
  url || 'https://invalid.supabase.local',
  key || 'missing-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'x-client-info': 'wearesdm-frontend',
      },
    },
  },
)

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase 연결 설정이 없습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_PUBLISHABLE_KEY를 설정해주세요.',
    )
  }
}
