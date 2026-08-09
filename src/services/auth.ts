import { supabase, assertSupabaseConfigured } from '../lib/supabase'

function required(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label}을(를) 입력해주세요.`)
  return normalized
}

export async function signIn(email: string, password: string) {
  assertSupabaseConfigured()
  const normalizedEmail = required(email, '이메일')
  if (!password) throw new Error('비밀번호를 입력해주세요.')

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })
  if (error) throw error
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
) {
  assertSupabaseConfigured()
  const normalizedEmail = required(email, '이메일')
  const normalizedDisplayName = required(displayName, '이름')
  if (!password) throw new Error('비밀번호를 입력해주세요.')

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: { data: { display_name: normalizedDisplayName } },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  assertSupabaseConfigured()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function sendPasswordReset(email: string) {
  assertSupabaseConfigured()
  const normalizedEmail = required(email, '이메일')
  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizedEmail,
    { redirectTo: `${window.location.origin}/reset-password` },
  )
  if (error) throw error
}

export async function updatePassword(password: string) {
  assertSupabaseConfigured()
  if (!password) throw new Error('새 비밀번호를 입력해주세요.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
