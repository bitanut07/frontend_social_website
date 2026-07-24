import { LoaderCircle, Send } from 'lucide-react'
import { useId } from 'react'
import type { FormEvent } from 'react'
import type { User } from '../../types/api'

interface ChatComposerProps {
  selectedPeer: User | null
  draft: string
  error?: string | null
  isSending: boolean
  onDraftChange: (value: string) => void
  onSend: () => void
}

export function ChatComposer({
  selectedPeer,
  draft,
  error = null,
  isSending,
  onDraftChange,
  onSend,
}: ChatComposerProps) {
  const inputId = useId()
  const canSend = Boolean(selectedPeer) && draft.trim().length > 0 && !isSending

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (canSend) {
      onSend()
    }
  }

  return (
    <form
      aria-label="Gửi tin nhắn"
      className="border-t border-slate-200 bg-white p-4"
      onSubmit={handleSubmit}
    >
      <label
        className="block text-xs font-semibold text-slate-700"
        htmlFor={inputId}
      >
        Tin nhắn mới
      </label>
      {error && (
        <p
          className="mt-2 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="mt-1.5 flex items-end gap-2">
        <textarea
          id={inputId}
          className="min-h-11 max-h-32 flex-1 resize-y border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
          disabled={!selectedPeer || isSending}
          maxLength={2000}
          placeholder={
            selectedPeer ? 'Viết tin nhắn…' : 'Hãy chọn người nhận trước'
          }
          rows={1}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
        />
        <button
          aria-label={isSending ? 'Đang gửi tin nhắn' : 'Gửi tin nhắn'}
          className="grid size-11 shrink-0 place-items-center bg-orange-700 text-white transition-colors hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canSend}
          type="submit"
        >
          {isSending ? (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin"
              size={19}
            />
          ) : (
            <Send aria-hidden="true" size={19} />
          )}
        </button>
      </div>
      <div aria-live="polite" className="mt-1.5 flex justify-between gap-3">
        <p className="text-xs text-slate-500">
          {isSending ? 'Đang gửi…' : 'Tối đa 2.000 ký tự'}
        </p>
        <p className="text-xs tabular-nums text-slate-500">
          {draft.length}/2000
        </p>
      </div>
    </form>
  )
}
