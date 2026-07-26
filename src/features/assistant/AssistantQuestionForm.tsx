import { LoaderCircle, Send } from 'lucide-react'
import { useId } from 'react'
import type {
  FormEvent,
  KeyboardEvent,
  RefObject,
} from 'react'

interface AssistantQuestionFormProps {
  inputRef: RefObject<HTMLTextAreaElement | null>
  question: string
  isLoading: boolean
  onQuestionChange: (value: string) => void
  onSubmit: () => void
}

export function AssistantQuestionForm({
  inputRef,
  question,
  isLoading,
  onQuestionChange,
  onSubmit,
}: AssistantQuestionFormProps) {
  const inputId = useId()
  const canSubmit = question.trim().length > 0 && !isLoading

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (canSubmit) {
      onSubmit()
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSubmit) {
        onSubmit()
      }
    }
  }

  return (
    <form
      aria-label="Đặt câu hỏi cho trợ lý"
      className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4"
      onSubmit={handleSubmit}
    >
      <label
        className="sr-only"
        htmlFor={inputId}
      >
        Nhắn tin cho Trợ lý Artly
      </label>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <textarea
            ref={inputRef}
            aria-describedby={`${inputId}-count`}
            id={inputId}
            className="max-h-28 min-h-11 w-full resize-none rounded-3xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm leading-5 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-200"
            maxLength={500}
            placeholder="Hỏi Artly bất cứ điều gì…"
            rows={1}
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span
            className={
              question.length >= 450
                ? 'mt-1 block px-2 text-right text-xs tabular-nums text-slate-500'
                : 'sr-only'
            }
            id={`${inputId}-count`}
          >
            {question.length}/500 ký tự
          </span>
        </div>
        <button
          aria-label={isLoading ? 'Artly đang trả lời' : 'Gửi tin nhắn'}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-orange-700 text-white transition hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canSubmit}
          title={isLoading ? 'Artly đang trả lời' : 'Gửi'}
          type="submit"
        >
          {isLoading ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin"
              size={17}
            />
          ) : (
            <Send aria-hidden="true" size={17} />
          )}
        </button>
      </div>
      <p className="mt-1.5 px-2 text-[0.7rem] text-slate-500">
        Enter để gửi · Shift + Enter để xuống dòng
      </p>
    </form>
  )
}
