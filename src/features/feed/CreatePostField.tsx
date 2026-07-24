export const createPostInputClassName =
  'mt-2 w-full rounded-md border border-stone-500 bg-white px-3 py-2.5 text-sm text-stone-950 placeholder:text-stone-500 hover:border-stone-600 focus:border-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-700'

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
