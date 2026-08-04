import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGate } from './AuthGate'

const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  isAuthProviderEnabled: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOAuth: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  isAuthProviderEnabled: authMocks.isAuthProviderEnabled,
  supabase: {
    auth: {
      getSession: authMocks.getSession,
      onAuthStateChange: authMocks.onAuthStateChange,
      signInWithOAuth: authMocks.signInWithOAuth,
    },
  },
}))

describe('AuthGate Google OAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    authMocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    authMocks.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://example.com/oauth' },
      error: null,
    })
  })

  it('hiển thị đúng validation_failed khi Google provider chưa được bật', async () => {
    const user = userEvent.setup()
    authMocks.isAuthProviderEnabled.mockResolvedValue(false)

    render(<AuthGate>{() => null}</AuthGate>)

    const googleButton = await screen.findByRole('button', {
      name: 'Tiếp tục với Google',
    })
    await user.click(googleButton)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Đăng nhập Google chưa được bật trong Supabase (validation_failed: Unsupported provider: provider is not enabled).',
    )
    expect(authMocks.signInWithOAuth).not.toHaveBeenCalled()
    expect(googleButton).toBeEnabled()
  })

  it('bắt đầu Google OAuth khi provider đã được bật', async () => {
    const user = userEvent.setup()
    authMocks.isAuthProviderEnabled.mockResolvedValue(true)

    render(<AuthGate>{() => null}</AuthGate>)

    const googleButton = await screen.findByRole('button', {
      name: 'Tiếp tục với Google',
    })
    await user.click(googleButton)

    expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(googleButton).toBeEnabled()
  })
})
