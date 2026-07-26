import {
  Clock3,
  History,
  MessageSquareText,
  RefreshCw,
} from 'lucide-react'
import type {
  AssistantConversationSummary,
  ResourceId,
} from '../../types/api'

interface AssistantConversationListProps {
  conversations: AssistantConversationSummary[]
  selectedConversationId?: ResourceId | null
  isLoading: boolean
  error: string | null
  onSelect: (conversationId: ResourceId) => void
  onRetry?: () => void
}

function updatedLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year:
      date.getFullYear() === new Date().getFullYear()
        ? undefined
        : 'numeric',
  }).format(date)
}

export function AssistantConversationList({
  conversations,
  selectedConversationId,
  isLoading,
  error,
  onSelect,
  onRetry,
}: AssistantConversationListProps) {
  return (
    <nav
      aria-label="Lịch sử trò chuyện với Artly"
      className="flex h-full min-h-0 w-full min-w-0 flex-col bg-stone-50"
    >
      <div className="flex items-center gap-2 border-b border-stone-200 px-3 py-3">
        <History aria-hidden="true" size={17} />
        <h3 className="text-sm font-bold text-stone-900">Đoạn chat</h3>
        <span className="ml-auto rounded-full bg-stone-200 px-2 py-0.5 text-[0.65rem] font-bold text-stone-600">
          {conversations.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div
            aria-label="Đang tải lịch sử chat"
            className="flex items-center gap-2 px-2 py-4 text-xs font-medium text-stone-500"
            role="status"
          >
            <RefreshCw aria-hidden="true" className="animate-spin" size={15} />
            Đang tải lịch sử…
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-xl border border-red-200 bg-white p-3 text-xs text-red-800">
            <p role="alert">{error}</p>
            {onRetry && (
              <button
                className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 font-bold hover:bg-red-50"
                type="button"
                onClick={onRetry}
              >
                <RefreshCw aria-hidden="true" size={13} />
                Tải lại
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <div className="px-2 py-8 text-center text-stone-500">
            <MessageSquareText
              aria-hidden="true"
              className="mx-auto text-stone-400"
              size={25}
            />
            <p className="mt-2 text-xs font-semibold">Chưa có đoạn chat nào</p>
            <p className="mt-1 text-[0.7rem] leading-4">
              Tin nhắn đầu tiên sẽ tự động được lưu tại đây.
            </p>
          </div>
        )}

        {!isLoading && !error && conversations.length > 0 && (
          <ul className="space-y-1">
            {conversations.map((conversation) => {
              const selected = conversation.id === selectedConversationId
              return (
                <li key={conversation.id}>
                  <button
                    aria-current={selected ? 'page' : undefined}
                    aria-label={conversation.title}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                      selected
                        ? 'bg-orange-100 text-orange-950'
                        : 'text-stone-700 hover:bg-white hover:text-stone-950'
                    }`}
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                  >
                    <span className="block truncate text-xs font-bold">
                      {conversation.title}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[0.65rem] text-stone-500">
                      <Clock3 aria-hidden="true" size={11} />
                      {updatedLabel(conversation.updatedAt)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </nav>
  )
}
