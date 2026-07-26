import { Bot, History, Plus, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type {
  AssistantConversationSummary,
  ResourceId,
} from '../../types/api'
import { AssistantConversationList } from './AssistantConversationList'
import { AssistantQuestionForm } from './AssistantQuestionForm'
import { AssistantResponseContent } from './AssistantResponseContent'
import type { AssistantChatMessage } from './types'

export const DEFAULT_ASSISTANT_PROMPT =
  'Bạn có thể giúp mình những gì?'

export interface AssistantPanelProps {
  isOpen: boolean
  question: string
  messages: AssistantChatMessage[]
  isLoading?: boolean
  error?: string | null
  conversations?: AssistantConversationSummary[]
  selectedConversationId?: ResourceId | null
  isHistoryLoading?: boolean
  historyError?: string | null
  isConversationLoading?: boolean
  suggestedPrompt?: string
  onOpenChange: (isOpen: boolean) => void
  onQuestionChange: (value: string) => void
  onSubmit: () => void
  onUseSuggestion?: (prompt: string) => void
  onRetry?: () => void
  onSelectConversation?: (conversationId: ResourceId) => void
  onNewConversation?: () => void
  onRetryHistory?: () => void
}

export function AssistantPanel({
  isOpen,
  question,
  messages,
  isLoading = false,
  error = null,
  conversations = [],
  selectedConversationId = null,
  isHistoryLoading = false,
  historyError = null,
  isConversationLoading = false,
  suggestedPrompt = DEFAULT_ASSISTANT_PROMPT,
  onOpenChange,
  onQuestionChange,
  onSubmit,
  onUseSuggestion,
  onRetry,
  onSelectConversation,
  onNewConversation,
  onRetryHistory,
}: AssistantPanelProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const wasOpenRef = useRef(isOpen)
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus()
    }

    wasOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return

    const desktop = window.matchMedia('(min-width: 640px)')
    const closeMobileHistory = () => {
      if (desktop.matches) setMobileHistoryOpen(false)
    }
    closeMobileHistory()
    desktop.addEventListener('change', closeMobileHistory)
    return () => desktop.removeEventListener('change', closeMobileHistory)
  }, [])

  function handleSuggestion() {
    onQuestionChange(suggestedPrompt)
    onUseSuggestion?.(suggestedPrompt)
    inputRef.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      onOpenChange(false)
    }
  }

  function handleSelectConversation(conversationId: ResourceId) {
    onSelectConversation?.(conversationId)
    setMobileHistoryOpen(false)
  }

  function handleNewConversation() {
    onNewConversation?.()
    setMobileHistoryOpen(false)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const activeTitle =
    conversations.find(
      (conversation) => conversation.id === selectedConversationId,
    )?.title ?? 'Chat mới'
  const busy = isLoading || isConversationLoading

  return (
    <>
      <button
        ref={triggerRef}
        aria-controls="artly-assistant-drawer"
        aria-expanded={isOpen}
        aria-hidden={isOpen}
        aria-label="Mở trợ lý Artly"
        className={`fixed right-4 bottom-20 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-orange-700 px-4 text-sm font-bold text-white shadow-lg transition hover:bg-orange-800 sm:right-6 sm:bottom-6 ${
          isOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        tabIndex={isOpen ? -1 : 0}
        type="button"
        onClick={() => onOpenChange(true)}
      >
        <Sparkles aria-hidden="true" size={19} />
        Hỏi Artly
      </button>

      {isOpen && (
        <aside
          aria-labelledby="assistant-title"
          aria-modal="false"
          className="fixed inset-x-3 bottom-20 z-40 flex h-[min(44rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:right-6 sm:bottom-6 sm:left-auto sm:h-[min(44rem,calc(100dvh-3rem))] sm:w-[42rem]"
          id="artly-assistant-drawer"
          role="dialog"
          onKeyDown={handleKeyDown}
        >
          <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-700 text-white">
              <Bot aria-hidden="true" size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="assistant-title"
                className="text-base font-bold text-slate-950"
              >
                Trợ lý Artly
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-emerald-500"
                />
                Đang trực tuyến
              </p>
            </div>
            <button
              aria-expanded={mobileHistoryOpen}
              aria-label="Lịch sử chat"
              className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-orange-100 hover:text-slate-950 sm:hidden"
              type="button"
              onClick={() => setMobileHistoryOpen((current) => !current)}
            >
              <History aria-hidden="true" size={19} />
            </button>
            <button
              aria-label="Chat mới"
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-orange-800 hover:bg-orange-100 disabled:opacity-50"
              type="button"
              onClick={handleNewConversation}
            >
              <Plus aria-hidden="true" size={17} />
              <span className="hidden xs:inline sm:inline">Chat mới</span>
            </button>
            <button
              aria-label="Đóng trợ lý Artly"
              className="grid size-10 shrink-0 place-items-center text-slate-600 hover:bg-orange-100 hover:text-slate-950"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              <X aria-hidden="true" size={20} />
            </button>
          </header>

          <div className="relative flex min-h-0 flex-1">
            <aside
              className={`absolute inset-0 z-10 w-full min-w-0 overflow-hidden border-r border-stone-200 sm:static sm:flex sm:w-56 sm:shrink-0 ${
                mobileHistoryOpen ? 'flex' : 'hidden'
              }`}
            >
              <AssistantConversationList
                conversations={conversations}
                error={historyError}
                isLoading={isHistoryLoading}
                selectedConversationId={selectedConversationId}
                onRetry={onRetryHistory}
                onSelect={handleSelectConversation}
              />
            </aside>

            <section
              aria-hidden={mobileHistoryOpen || undefined}
              aria-label={activeTitle}
              className="flex min-w-0 flex-1 flex-col"
              inert={mobileHistoryOpen || undefined}
            >
              <div className="border-b border-slate-200 bg-white px-4 py-2">
                <p className="truncate text-xs font-bold text-slate-700">
                  {activeTitle}
                </p>
              </div>

              {isConversationLoading ? (
                <div
                  aria-label="Đang tải hội thoại"
                  className="grid flex-1 place-items-center bg-slate-100 text-sm font-semibold text-slate-500"
                  role="status"
                >
                  Đang tải hội thoại…
                </div>
              ) : (
                <AssistantResponseContent
                  error={error}
                  isLoading={isLoading}
                  messages={messages}
                  suggestedPrompt={suggestedPrompt}
                  onRetry={onRetry}
                  onUseSuggestion={handleSuggestion}
                />
              )}

              <AssistantQuestionForm
                inputRef={inputRef}
                isLoading={busy}
                question={question}
                onQuestionChange={onQuestionChange}
                onSubmit={onSubmit}
              />
            </section>
          </div>
        </aside>
      )}
    </>
  )
}
