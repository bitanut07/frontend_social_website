import { Palette, RefreshCcw } from 'lucide-react'

interface FeedErrorStateProps {
  message?: string
  onRetry?: () => void
}

interface FeedEmptyStateProps {
  topicName?: string
  onCreate: () => void
}

function PostSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-stone-200 bg-white"
    >
      <div className="flex items-center gap-3 p-4">
        <div className="size-10 rounded-full bg-stone-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-36 rounded bg-stone-200" />
          <div className="h-3 w-24 rounded bg-stone-100" />
        </div>
      </div>
      <div className="aspect-square bg-stone-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-24 rounded bg-stone-200" />
        <div className="h-4 w-3/4 rounded bg-stone-100" />
        <div className="h-4 w-1/2 rounded bg-stone-100" />
      </div>
    </div>
  )
}

export function FeedLoadingState() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Đang tải bảng tin"
      className="space-y-5 motion-safe:animate-pulse motion-reduce:animate-none"
    >
      <span className="sr-only">Đang tải các tác phẩm…</span>
      <PostSkeleton />
      <PostSkeleton />
    </div>
  )
}

export function FeedErrorState({
  message = 'Chưa thể tải bảng tin. Vui lòng thử lại.',
  onRetry,
}: FeedErrorStateProps) {
  return (
    <section
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-8 text-center"
    >
      <h3 className="text-base font-semibold text-stone-950">
        Bảng tin đang gián đoạn
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-700">
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-stone-500 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition-colors hover:border-orange-700 hover:bg-orange-50"
        >
          <RefreshCcw aria-hidden="true" className="size-4" />
          Thử lại
        </button>
      ) : null}
    </section>
  )
}

export function FeedEmptyState({
  topicName,
  onCreate,
}: FeedEmptyStateProps) {
  return (
    <section
      role="status"
      className="rounded-lg border border-dashed border-stone-300 bg-orange-50 px-5 py-10 text-center"
    >
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-white text-orange-700 ring-1 ring-orange-200">
        <Palette aria-hidden="true" className="size-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-stone-950">
        Chưa có bài vẽ
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">
        {topicName
          ? `Chưa có tác phẩm nào thuộc chủ đề ${topicName}.`
          : 'Hãy đăng tác phẩm đầu tiên.'}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 rounded-md bg-orange-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-800"
      >
        Đăng tác phẩm
      </button>
    </section>
  )
}
