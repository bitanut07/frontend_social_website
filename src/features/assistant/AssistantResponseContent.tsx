import {
  AlertCircle,
  CheckCircle2,
  CircleHelp,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import type { AssistantResponse } from '../../types/api'

interface AssistantResponseContentProps {
  response: AssistantResponse | null
  isLoading: boolean
  error: string | null
  onRetry?: () => void
}

export function AssistantResponseContent({
  response,
  isLoading,
  error,
  onRetry,
}: AssistantResponseContentProps) {
  let content

  if (isLoading) {
    content = (
      <div aria-busy="true" className="flex items-start gap-3" role="status">
        <LoaderCircle
          aria-hidden="true"
          className="mt-0.5 shrink-0 animate-spin text-orange-700"
          size={20}
        />
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Đang thống kê bài viết…
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Artly đang đối chiếu câu hỏi với các chủ đề có sẵn.
          </p>
        </div>
      </div>
    )
  } else if (error) {
    content = (
      <div role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-red-700"
            size={20}
          />
          <div>
            <p className="text-sm font-semibold text-red-950">
              Chưa thể trả lời
            </p>
            <p className="mt-1 text-sm leading-5 text-red-800">{error}</p>
          </div>
        </div>
        {onRetry && (
          <button
            className="mt-3 inline-flex min-h-9 items-center gap-2 border border-red-300 bg-white px-3 text-xs font-semibold text-red-900 hover:bg-red-50"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw aria-hidden="true" size={14} />
            Thử lại
          </button>
        )}
      </div>
    )
  } else if (response) {
    content = (
      <div className="flex items-start gap-3" role="status">
        {response.status === 'ANSWERED' ? (
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-emerald-700"
            size={20}
          />
        ) : (
          <CircleHelp
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-orange-700"
            size={20}
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {response.status === 'ANSWERED'
              ? 'Đã có kết quả'
              : 'Cần thêm thông tin'}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
            {response.answer}
          </p>
          {response.result && (
            <p className="mt-2 text-xs font-medium text-slate-500">
              Chủ đề: {response.result.topic.name}
            </p>
          )}
        </div>
      </div>
    )
  } else {
    content = (
      <div className="flex items-start gap-3" role="status">
        <Sparkles
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-orange-700"
          size={20}
        />
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Hỏi về số lượng bài viết
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Nêu rõ một chủ đề như phong cảnh, chân dung hoặc môi trường.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      aria-live="polite"
      className="mt-4 min-h-28 border border-slate-200 bg-slate-50 p-4"
    >
      {content}
    </div>
  )
}
