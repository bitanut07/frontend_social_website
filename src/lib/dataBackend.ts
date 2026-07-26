interface DataBackendSelection {
  mode: string
  requestedBackend?: string
  supabaseConfigured: boolean
}

export function shouldUseSupabaseBackend({
  mode,
  requestedBackend,
  supabaseConfigured,
}: DataBackendSelection): boolean {
  return (
    mode !== 'test' &&
    requestedBackend?.trim().toLowerCase() === 'supabase' &&
    supabaseConfigured
  )
}
