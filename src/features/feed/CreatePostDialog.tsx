import { LoaderCircle, Send, X } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ResourceId } from '../../types/api'
import {
  emptyCreatePostDraft,
  toCreatePostInput,
  type CreatePostDraft,
  type CreatePostErrors,
  validateCreatePost,
} from './createPostForm'
import { PostDetailsFields } from './PostDetailsFields'
import type { CreatePostTextField } from './PostDetailsFields'
import { PostImageField } from './PostImageField'
import { PostTopicSelector } from './PostTopicSelector'
import type { CreatePostDialogProps } from './feedTypes'
import { useDialogFocus } from './useDialogFocus'

export function CreatePostDialog({
  open,
  topics,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CreatePostDialogProps) {
  const [draft, setDraft] = useState<CreatePostDraft>(
    emptyCreatePostDraft,
  )
  const [errors, setErrors] = useState<CreatePostErrors>({})
  const [isSubmittingLocally, setIsSubmittingLocally] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const submissionCancelledRef = useRef(false)
  const busy = isSubmitting || isSubmittingLocally

  const resetAndClose = () => {
    submissionCancelledRef.current = true
    setDraft(emptyCreatePostDraft)
    setErrors({})
    setPreviewFailed(false)
    onClose()
  }

  const { dialogRef, titleInputRef, handleDialogKeyDown } =
    useDialogFocus(open, resetAndClose)

  useEffect(() => {
    setPreviewFailed(false)
  }, [draft.imageUrl])

  if (!open) {
    return null
  }

  const updateField = (field: CreatePostTextField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      form: undefined,
    }))
  }

  const toggleTopic = (topicId: ResourceId) => {
    setDraft((current) => {
      const selected = current.topicIds.includes(topicId)
      return {
        ...current,
        topicIds: selected
          ? current.topicIds.filter((id) => id !== topicId)
          : [...current.topicIds, topicId],
      }
    })
    setErrors((current) => ({
      ...current,
      topicIds: undefined,
      form: undefined,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateCreatePost(draft)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      requestAnimationFrame(() => {
        dialogRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus()
      })
      return
    }

    setErrors({})
    setIsSubmittingLocally(true)
    submissionCancelledRef.current = false

    try {
      await onSubmit(toCreatePostInput(draft))
      if (!submissionCancelledRef.current) {
        setDraft(emptyCreatePostDraft)
        onClose()
      }
    } catch (error) {
      if (!submissionCancelledRef.current) {
        setErrors({
          form:
            error instanceof Error && error.message
              ? error.message
              : 'Chưa thể đăng tác phẩm. Vui lòng thử lại.',
        })
      }
    } finally {
      setIsSubmittingLocally(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/60 p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          resetAndClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-post-title"
        aria-describedby="create-post-description"
        onKeyDown={handleDialogKeyDown}
        className="max-h-dvh w-full overflow-y-auto rounded-t-lg bg-orange-50 shadow-xl sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-2xl sm:rounded-lg"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-stone-200 bg-orange-50/95 px-4 py-4 backdrop-blur sm:px-6">
          <div>
            <h2
              id="create-post-title"
              className="text-lg font-bold text-stone-950"
            >
              Đăng tác phẩm mới
            </h2>
            <p
              id="create-post-description"
              className="mt-1 text-sm text-stone-600"
            >
              Chia sẻ bài vẽ bằng một đường dẫn ảnh công khai.
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng hộp thoại đăng tác phẩm"
            onClick={resetAndClose}
            className="grid size-10 shrink-0 place-items-center rounded-md text-stone-600 transition-colors hover:bg-white hover:text-stone-950"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <form
          noValidate
          aria-busy={busy}
          onSubmit={handleSubmit}
          className="px-4 py-5 sm:px-6"
        >
          <p role="status" aria-live="polite" className="sr-only">
            {busy ? 'Đang đăng tác phẩm…' : ''}
          </p>
          {errors.form ? (
            <div
              role="alert"
              className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {errors.form}
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <PostDetailsFields
              draft={draft}
              errors={errors}
              titleInputRef={titleInputRef}
              onChange={updateField}
            />
            <PostImageField
              draft={draft}
              errors={errors}
              previewFailed={previewFailed}
              onChange={(value) => updateField('imageUrl', value)}
              onPreviewError={() => setPreviewFailed(true)}
            />
          </div>

          <PostTopicSelector
            topics={topics}
            selectedTopicIds={draft.topicIds}
            error={errors.topicIds}
            busy={busy}
            onToggle={toggleTopic}
          />

          <footer className="mt-7 flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-md border border-stone-500 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-800 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? (
                <>
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 motion-safe:animate-spin motion-reduce:animate-none"
                  />
                  Đang đăng…
                </>
              ) : (
                <>
                  <Send aria-hidden="true" className="size-4" />
                  Đăng tác phẩm
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
