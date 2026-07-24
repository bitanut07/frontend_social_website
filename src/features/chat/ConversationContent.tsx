import { AlertCircle, MessageCircle, RefreshCw } from 'lucide-react'
import type { Message, User } from '../../types/api'

interface ConversationContentProps {
  currentUser: User
  selectedPeer: User | null
  messages: Message[]
  isLoading: boolean
  error: string | null
  onRetry?: () => void
}

function formatTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function ConversationLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải tin nhắn"
      className="flex flex-1 flex-col justify-end gap-3 px-4 py-5"
      role="status"
    >
      <span className="sr-only">Đang tải tin nhắn…</span>
      <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-slate-100" />
      <div className="ml-auto h-14 w-2/3 animate-pulse rounded-2xl bg-orange-100" />
      <div className="h-10 w-1/2 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  )
}

export function ConversationContent({
  currentUser,
  selectedPeer,
  messages,
  isLoading,
  error,
  onRetry,
}: ConversationContentProps) {
  if (isLoading) {
    return <ConversationLoading />
  }

  if (error) {
    return (
      <div
        className="m-4 flex flex-1 flex-col items-center justify-center border border-red-200 bg-red-50 p-6 text-center"
        role="alert"
      >
        <AlertCircle aria-hidden="true" className="text-red-700" size={28} />
        <p className="mt-3 text-sm font-semibold text-red-950">
          Chưa tải được cuộc trò chuyện
        </p>
        <p className="mt-1 max-w-xs text-sm text-red-800">{error}</p>
        {onRetry && (
          <button
            className="mt-4 inline-flex min-h-10 items-center gap-2 border border-red-300 bg-white px-3 text-sm font-semibold text-red-900 hover:bg-red-100"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw aria-hidden="true" size={16} />
            Thử lại
          </button>
        )}
      </div>
    )
  }

  if (!selectedPeer) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center"
        role="status"
      >
        <MessageCircle
          aria-hidden="true"
          className="text-orange-300"
          size={36}
        />
        <p className="mt-3 text-sm font-semibold text-slate-800">
          Chọn một người để bắt đầu
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Tin nhắn của bạn sẽ xuất hiện tại đây.
        </p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center"
        role="status"
      >
        <p className="text-sm font-semibold text-slate-800">Chưa có tin nhắn</p>
        <p className="mt-1 text-sm text-slate-500">
          Hãy gửi lời chào đầu tiên đến {selectedPeer.displayName}.
        </p>
      </div>
    )
  }

  const chronologicalMessages = [...messages].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  )

  return (
    <ol
      aria-label={`Cuộc trò chuyện với ${selectedPeer.displayName}`}
      aria-live="polite"
      className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto px-4 py-5"
    >
      {chronologicalMessages.map((message) => {
        const isOwnMessage = message.sender.id === currentUser.id
        const time = formatTime(message.createdAt)

        return (
          <li
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <article
              className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm leading-5 ${
                isOwnMessage
                  ? 'rounded-br-sm bg-orange-700 text-white'
                  : 'rounded-bl-sm bg-slate-100 text-slate-900'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p
                className={`mt-1 text-right text-xs ${
                  isOwnMessage ? 'text-orange-100' : 'text-slate-500'
                }`}
              >
                {isOwnMessage ? 'Bạn' : message.sender.displayName}
                {time ? ` · ${time}` : ''}
              </p>
            </article>
          </li>
        )
      })}
    </ol>
  )
}
