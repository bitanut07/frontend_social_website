import {
  AlertCircle,
  Bot,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { AssistantChatMessage } from './types'

interface AssistantResponseContentProps {
  messages: AssistantChatMessage[]
  isLoading: boolean
  error: string | null
  suggestedPrompt: string
  onUseSuggestion: () => void
  onRetry?: () => void
}

export function AssistantResponseContent({
  messages,
  isLoading,
  error,
  suggestedPrompt,
  onUseSuggestion,
  onRetry,
}: AssistantResponseContentProps) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const log = logRef.current
    if (log) {
      log.scrollTop = log.scrollHeight
    }
  }, [error, isLoading, messages])

  return (
    <div
      ref={logRef}
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Cuộc trò chuyện với Trợ lý Artly"
      className="flex-1 overflow-y-auto bg-slate-100 px-3 py-4 sm:px-4"
      role="log"
    >
      <div className="space-y-3">
        {messages.length === 0 && (
          <AssistantBubble>
            <p>
              Chào bạn! Mình là Artly. Bạn có thể hỏi mình về bài tập, kiến
              thức, viết lách, công nghệ, ý tưởng sáng tạo hoặc cách dùng Artly.
            </p>
          </AssistantBubble>
        )}

        {messages.map((message) =>
          message.role === 'USER' ? (
            <div
              key={message.id}
              aria-label={`Bạn: ${message.content}`}
              className="flex justify-end"
            >
              <div className="max-w-[82%] rounded-3xl rounded-br-md bg-orange-700 px-3.5 py-2.5 text-sm leading-5 text-white shadow-sm">
                <p className="whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>
            </div>
          ) : (
            <AssistantBubble key={message.id}>
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
              {message.response?.result && (
                <span className="mt-2 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">
                  {message.response.result.topic.name} ·{' '}
                  {message.response.result.count} bài viết
                </span>
              )}
            </AssistantBubble>
          ),
        )}

        {isLoading && (
          <AssistantBubble label="Artly đang nhập">
            <div
              aria-label="Artly đang nhập"
              className="flex h-5 items-center gap-1"
              role="status"
            >
              {[
                '',
                '[animation-delay:150ms]',
                '[animation-delay:300ms]',
              ].map((delayClass) => (
                <span
                  key={delayClass || 'initial'}
                  aria-hidden="true"
                  className={`size-2 animate-pulse rounded-full bg-slate-400 ${delayClass}`}
                />
              ))}
            </div>
          </AssistantBubble>
        )}

        {error && (
          <div className="flex items-end gap-2" role="alert">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-red-100 text-red-700">
              <AlertCircle aria-hidden="true" size={15} />
            </span>
            <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-red-200 bg-white px-3.5 py-2.5 text-sm text-red-900 shadow-sm">
              <p>{error}</p>
              {onRetry && (
                <button
                  className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-red-300 px-3 text-xs font-semibold hover:bg-red-50"
                  type="button"
                  onClick={onRetry}
                >
                  <RefreshCw aria-hidden="true" size={13} />
                  Gửi lại
                </button>
              )}
            </div>
          </div>
        )}

        {messages.length === 0 && !isLoading && !error && (
          <button
            className="ml-9 rounded-full border border-orange-300 bg-white px-3 py-2 text-left text-xs font-semibold text-orange-800 transition hover:bg-orange-50"
            type="button"
            onClick={onUseSuggestion}
          >
            {suggestedPrompt}
          </button>
        )}
      </div>
    </div>
  )
}

function AssistantBubble({
  children,
  label = 'Artly',
}: {
  children: ReactNode
  label?: string
}) {
  return (
    <div className="flex items-end gap-2" aria-label={label}>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange-700 text-white">
        <Bot aria-hidden="true" size={14} />
      </span>
      <div className="max-w-[82%] rounded-3xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-5 text-slate-900 shadow-sm">
        {children}
      </div>
    </div>
  )
}
