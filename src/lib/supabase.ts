import { createClient } from '@supabase/supabase-js'
import type { ResourceId } from '../types/api'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const configuredPublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(
  configuredUrl && configuredPublishableKey,
)

type SupportedAuthProvider = 'google'

const authProviderLabels: Record<SupportedAuthProvider, string> = {
  google: 'Google',
}

export async function isAuthProviderEnabled(
  provider: SupportedAuthProvider,
): Promise<boolean> {
  if (!configuredUrl || !configuredPublishableKey) {
    throw new Error('Cấu hình Supabase chưa đầy đủ.')
  }

  const response = await fetch(
    new URL('/auth/v1/settings', configuredUrl).toString(),
    {
      headers: {
        apikey: configuredPublishableKey,
      },
    },
  )

  if (!response.ok) {
    throw new Error(
      `Không thể kiểm tra cấu hình đăng nhập ${authProviderLabels[provider]} (HTTP ${response.status}).`,
    )
  }

  const settings: unknown = await response.json()
  if (!settings || typeof settings !== 'object') return false

  const external = (settings as { external?: unknown }).external
  if (!external || typeof external !== 'object') return false

  return (external as Record<string, unknown>)[provider] === true
}

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
