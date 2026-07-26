import { describe, expect, it } from 'vitest'
import { shouldUseSupabaseBackend } from './dataBackend'

describe('shouldUseSupabaseBackend', () => {
  it('uses Goravel by default even when Supabase is configured', () => {
    expect(
      shouldUseSupabaseBackend({
        mode: 'development',
        requestedBackend: undefined,
        supabaseConfigured: true,
      }),
    ).toBe(false)
  })

  it('uses Supabase only when it is explicitly selected and configured', () => {
    expect(
      shouldUseSupabaseBackend({
        mode: 'development',
        requestedBackend: 'supabase',
        supabaseConfigured: true,
      }),
    ).toBe(true)
  })

  it('does not use Supabase when its public configuration is incomplete', () => {
    expect(
      shouldUseSupabaseBackend({
        mode: 'development',
        requestedBackend: 'supabase',
        supabaseConfigured: false,
      }),
    ).toBe(false)
  })

  it('keeps unit tests on the injected Goravel-compatible API client', () => {
    expect(
      shouldUseSupabaseBackend({
        mode: 'test',
        requestedBackend: 'supabase',
        supabaseConfigured: true,
      }),
    ).toBe(false)
  })
})
