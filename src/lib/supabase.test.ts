import { afterEach, describe, expect, it, vi } from 'vitest'
import { isAuthProviderEnabled } from './supabase'

describe('isAuthProviderEnabled', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('đọc trạng thái provider từ public Auth settings', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        external: { email: true, google: false },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(isAuthProviderEnabled('google')).resolves.toBe(false)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('trả về true khi provider đã được bật', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ external: { google: true } }),
      }),
    )

    await expect(isAuthProviderEnabled('google')).resolves.toBe(true)
  })

  it('báo lỗi khi Auth settings không thể truy cập', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    )

    await expect(isAuthProviderEnabled('google')).rejects.toThrow(
      'Không thể kiểm tra cấu hình đăng nhập Google (HTTP 503).',
    )
  })
})
