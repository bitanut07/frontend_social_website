import {
  Image as ImageIcon,
  ImagePlus,
  LoaderCircle,
  Send,
  Smile,
  X,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
} from 'react'
import type { User } from '../../types/api'

const MESSAGE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
const MAX_MESSAGE_IMAGE_BYTES = 50 * 1024 * 1024

interface ChatComposerProps {
  selectedPeer: User | null
  draft: string
  imageFile?: File | null
  allowImageAttachments?: boolean
  error?: string | null
  isSending: boolean
  onDraftChange: (value: string) => void
  onImageChange?: (file: File | null) => void
  onSend: () => void
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function imageValidationError(file: File) {
  if (!MESSAGE_IMAGE_TYPES.has(file.type)) {
    return 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'
  }
  if (file.size <= 0 || file.size > MAX_MESSAGE_IMAGE_BYTES) {
    return 'Ảnh không được vượt quá 50 MB.'
  }
  return null
}

export function ChatComposer({
  selectedPeer,
  draft,
  imageFile = null,
  allowImageAttachments = true,
  error = null,
  isSending,
  onDraftChange,
  onImageChange,
  onSend,
}: ChatComposerProps) {
  const inputId = useId()
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const attachedImage = allowImageAttachments ? imageFile : null
  const canAttach =
    allowImageAttachments &&
    Boolean(selectedPeer) &&
    Boolean(onImageChange) &&
    !isSending
  const canSend =
    Boolean(selectedPeer) &&
    (draft.trim().length > 0 || Boolean(attachedImage)) &&
    !isSending

  useEffect(() => {
    if (
      !attachedImage ||
      typeof URL === 'undefined' ||
      typeof URL.createObjectURL !== 'function'
    ) {
      setPreviewUrl(null)
      return
    }

    const nextPreviewUrl = URL.createObjectURL(attachedImage)
    setPreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [attachedImage])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (canSend) {
      onSend()
    }
  }

  function applyImageFile(file: File) {
    const validationError = imageValidationError(file)
    if (validationError) {
      setImageError(validationError)
      return
    }

    setImageError(null)
    onImageChange?.(file)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) applyImageFile(file)
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (!allowImageAttachments) return

    const image = Array.from(event.clipboardData.files).find((file) =>
      MESSAGE_IMAGE_TYPES.has(file.type),
    )
    if (image) applyImageFile(image)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (canSend) onSend()
    }
  }

  function handleRemoveImage() {
    setImageError(null)
    onImageChange?.(null)
  }

  const currentError = imageError ?? error

  return (
    <form
      aria-label="Gửi tin nhắn"
      className="border-t border-stone-200 bg-white px-3 py-3"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor={inputId}>
        Tin nhắn mới
      </label>
      {allowImageAttachments ? (
        <>
          <label className="sr-only" htmlFor={fileInputId}>
            Chọn ảnh để gửi
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={!canAttach}
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
          />
        </>
      ) : null}

      {currentError && (
        <p
          className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {currentError}
        </p>
      )}

      {attachedImage && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-2">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-stone-200 text-stone-500">
            {previewUrl ? (
              <img
                alt=""
                className="size-full object-cover"
                src={previewUrl}
              />
            ) : (
              <ImageIcon aria-hidden="true" size={20} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-stone-900">
              {attachedImage.name}
            </p>
            <p className="mt-0.5 text-xs font-medium text-stone-500">
              {formatFileSize(attachedImage.size)}
            </p>
          </div>
          <button
            aria-label="Gỡ ảnh đã chọn"
            className="grid size-9 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-white hover:text-stone-950 disabled:cursor-not-allowed disabled:text-stone-300"
            disabled={isSending}
            type="button"
            onClick={handleRemoveImage}
          >
            <X aria-hidden="true" size={17} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {allowImageAttachments ? (
          <button
            aria-label="Đính kèm ảnh"
            className="grid size-11 shrink-0 place-items-center rounded-full text-[#8b35c9] transition hover:bg-[#f3e8ff] disabled:cursor-not-allowed disabled:text-stone-300"
            disabled={!canAttach}
            title="Đính kèm ảnh"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus aria-hidden="true" size={22} />
          </button>
        ) : null}
        <textarea
          id={inputId}
          className="min-h-11 max-h-32 flex-1 resize-none rounded-full border-0 bg-stone-100 px-4 py-2.5 text-base leading-6 text-stone-950 outline-none placeholder:text-stone-500 focus:ring-2 focus:ring-[#e4b8d4] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
          disabled={!selectedPeer || isSending}
          maxLength={2000}
          placeholder={selectedPeer ? 'Aa' : 'Chọn người nhận'}
          rows={1}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <button
          aria-label="Thêm biểu tượng cảm xúc"
          className="grid size-11 shrink-0 place-items-center rounded-full text-[#8b35c9] transition hover:bg-[#f3e8ff] disabled:cursor-not-allowed disabled:text-stone-300"
          disabled={!selectedPeer || isSending}
          title="Thêm biểu tượng cảm xúc"
          type="button"
          onClick={() => onDraftChange(draft ? `${draft} 😊` : '😊')}
        >
          <Smile aria-hidden="true" size={22} />
        </button>
        <button
          aria-label={isSending ? 'Đang gửi tin nhắn' : 'Gửi tin nhắn'}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-[#8b35c9] text-white transition-colors hover:bg-[#762ab0] disabled:cursor-not-allowed disabled:bg-stone-300"
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
      <div aria-live="polite" className="sr-only">
        {isSending ? 'Đang gửi…' : `${draft.length}/2000 ký tự`}
      </div>
    </form>
  )
}
