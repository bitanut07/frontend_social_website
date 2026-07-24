import { Bot, Sparkles, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { AssistantResponse } from '../../types/api'
import { AssistantQuestionForm } from './AssistantQuestionForm'
import { AssistantResponseContent } from './AssistantResponseContent'

export const DEFAULT_ASSISTANT_PROMPT =
  'Có bao nhiêu bài nói về chủ đề phong cảnh?'

export interface AssistantPanelProps {
  isOpen: boolean
  question: string
  response: AssistantResponse | null
  isLoading?: boolean
  error?: string | null
  suggestedPrompt?: string
  onOpenChange: (isOpen: boolean) => void
  onQuestionChange: (value: string) => void
  onSubmit: () => void
  onUseSuggestion?: (prompt: string) => void
  onRetry?: () => void
}

export function AssistantPanel({
  isOpen,
  question,
  response,
  isLoading = false,
  error = null,
  suggestedPrompt = DEFAULT_ASSISTANT_PROMPT,
  onOpenChange,
  onQuestionChange,
  onSubmit,
  onUseSuggestion,
  onRetry,
}: AssistantPanelProps) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const wasOpenRef = useRef(isOpen)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus()
    }

    wasOpenRef.current = isOpen
  }, [isOpen])

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

  return (
    <>
      <button
        ref={triggerRef}
        aria-controls="artly-assistant-drawer"
        aria-expanded={isOpen}
        aria-hidden={isOpen}
        aria-label="Mở trợ lý thống kê"
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
          className="fixed inset-x-3 bottom-20 z-40 flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl sm:right-6 sm:bottom-6 sm:left-auto sm:max-h-[calc(100dvh-3rem)] sm:w-[25rem]"
          id="artly-assistant-drawer"
          role="dialog"
          onKeyDown={handleKeyDown}
        >
          <header className="flex items-center gap-3 border-b border-orange-200 bg-orange-50 px-4 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-700 text-white">
              <Bot aria-hidden="true" size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="assistant-title"
                className="text-base font-bold text-slate-950"
              >
                Trợ lý thống kê
              </h2>
              <p className="text-xs text-slate-600">
                Đếm bài viết theo chủ đề Artly
              </p>
            </div>
            <button
              aria-label="Đóng trợ lý thống kê"
              className="grid size-10 shrink-0 place-items-center text-slate-600 hover:bg-orange-100 hover:text-slate-950"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              <X aria-hidden="true" size={20} />
            </button>
          </header>

          <div className="overflow-y-auto px-4 py-4">
            <p className="text-xs font-semibold tracking-wide text-orange-800 uppercase">
              Gợi ý câu hỏi
            </p>
            <button
              className="mt-2 w-full border border-orange-200 bg-orange-50 px-3 py-2.5 text-left text-sm leading-5 text-slate-800 transition hover:border-orange-300 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              type="button"
              onClick={handleSuggestion}
            >
              “{suggestedPrompt}”
            </button>

            <AssistantResponseContent
              error={error}
              isLoading={isLoading}
              response={response}
              onRetry={onRetry}
            />
          </div>

          <AssistantQuestionForm
            inputRef={inputRef}
            isLoading={isLoading}
            question={question}
            onQuestionChange={onQuestionChange}
            onSubmit={onSubmit}
          />
        </aside>
      )}
    </>
  )
}
