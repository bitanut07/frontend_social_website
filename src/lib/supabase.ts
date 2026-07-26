import { createClient } from '@supabase/supabase-js'
import type { ResourceId } from '../types/api'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const configuredPublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(
  configuredUrl && configuredPublishableKey,
)

export const supabase = createClient(
  configuredUrl || 'http://127.0.0.1:54321',
  configuredPublishableKey || 'local-publishable-key-not-configured',
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      flowType: 'pkce',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
)

export async function requireSupabaseUser(expectedUserId?: ResourceId) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Phiên đăng nhập đã hết hạn')
  }

  if (expectedUserId && expectedUserId !== user.id) {
    throw new Error('Tài khoản không khớp với phiên đăng nhập')
  }

  return user
}
