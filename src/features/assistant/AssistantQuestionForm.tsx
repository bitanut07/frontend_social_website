import { LoaderCircle, Send } from 'lucide-react'
import { useId } from 'react'
import type { FormEvent, RefObject } from 'react'

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

  return (
    <form
      aria-label="Đặt câu hỏi cho trợ lý"
      className="border-t border-slate-200 bg-white px-4 py-4"
      onSubmit={handleSubmit}
    >
      <label
        className="block text-xs font-semibold text-slate-700"
        htmlFor={inputId}
      >
        Câu hỏi của bạn
      </label>
      <textarea
        ref={inputRef}
        id={inputId}
        className="mt-1.5 min-h-20 w-full resize-y border border-slate-300 px-3 py-2.5 text-sm leading-5 text-slate-950 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
        disabled={isLoading}
        maxLength={500}
        placeholder="Ví dụ: Có bao nhiêu bài về chủ đề chân dung?"
        rows={3}
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-slate-500">
          {question.length}/500
        </span>
        <button
          className="inline-flex min-h-10 items-center gap-2 bg-orange-700 px-4 text-sm font-bold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canSubmit}
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
          {isLoading ? 'Đang hỏi' : 'Gửi câu hỏi'}
        </button>
      </div>
    </form>
  )
}
