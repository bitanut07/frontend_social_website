export const createPostInputClassName =
  'mt-2 w-full rounded-lg border border-stone-300 bg-white px-3.5 py-3 text-sm text-stone-950 shadow-[0_1px_0_rgba(95,111,82,0.05)] placeholder:text-stone-400 transition hover:border-stone-500 focus:border-orange-700 focus:outline-none focus:ring-3 focus:ring-orange-200'

export function CreatePostFieldError({
  id,
  message,
}: {
  id: string
  message?: string
}) {
  if (!message) {
    return null
  }

  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-rose-700">
      {message}
    </p>
  )
}
