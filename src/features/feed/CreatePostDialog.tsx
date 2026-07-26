import { LoaderCircle, Palette, Send, X } from 'lucide-react'
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
import { PostImageUrlField } from './PostImageUrlField'
import { PostTopicSelector } from './PostTopicSelector'
import type { CreatePostDialogProps } from './feedTypes'
import { useDialogFocus } from './useDialogFocus'

export function CreatePostDialog({
  open,
  topics,
  isSubmitting = false,
  imageInputMode = 'upload',
  onClose,
  onSubmit,
}: CreatePostDialogProps) {
  const [draft, setDraft] = useState<CreatePostDraft>(
    emptyCreatePostDraft,
  )
  const [errors, setErrors] = useState<CreatePostErrors>({})
  const [isSubmittingLocally, setIsSubmittingLocally] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const submissionCancelledRef = useRef(false)
  const formErrorRef = useRef<HTMLDivElement>(null)
  const busy = isSubmitting || isSubmittingLocally

  const resetAndClose = () => {
    submissionCancelledRef.current = true
    setDraft(emptyCreatePostDraft)
    setErrors({})
    onClose()
  }

  const { dialogRef, titleInputRef, handleDialogKeyDown } =
    useDialogFocus(open, resetAndClose)

  useEffect(() => {
    if (
      !draft.imageFile ||
      typeof URL.createObjectURL !== 'function'
    ) {
      setPreviewUrl('')
      return
    }

    const nextPreviewUrl = URL.createObjectURL(draft.imageFile)
    setPreviewUrl(nextPreviewUrl)
    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [draft.imageFile])

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

  const updateImage = (file: File | null) => {
    setDraft((current) => ({ ...current, imageFile: file }))
    setErrors((current) => ({
      ...current,
      imageFile: undefined,
      form: undefined,
    }))
  }

  const updateImageUrl = (value: string) => {
    setDraft((current) => ({ ...current, imageUrl: value }))
    setErrors((current) => ({
      ...current,
      imageUrl: undefined,
      form: undefined,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validateCreatePost(draft, imageInputMode)

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
      await onSubmit(toCreatePostInput(draft, imageInputMode))
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
        window.setTimeout(() => formErrorRef.current?.focus(), 0)
      }
    } finally {
      setIsSubmittingLocally(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
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
        className="max-h-dvh w-full overflow-y-auto rounded-t-2xl border border-orange-200 bg-[#fffdf1] shadow-[0_28px_90px_rgba(32,38,30,0.28)] sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-5xl sm:rounded-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-orange-200 bg-[#fffdf1]/95 px-5 py-5 backdrop-blur sm:px-8 sm:py-6">
          <div className="flex min-w-0 items-start gap-4">
            <span className="hidden size-12 shrink-0 place-items-center rounded-xl bg-orange-700 text-white sm:grid">
              <Palette aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-[0.68rem] font-black tracking-[0.18em] text-orange-600 uppercase">
                Phòng tranh Artly
              </p>
            <h2
              id="create-post-title"
                className="font-display mt-1 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl"
            >
              Đăng tác phẩm mới
            </h2>
            <p
              id="create-post-description"
                className="mt-1.5 max-w-2xl text-sm leading-6 text-stone-600"
            >
                {imageInputMode === 'upload'
                  ? 'Chọn ảnh từ thiết bị, kể câu chuyện phía sau tác phẩm và chia sẻ với cộng đồng.'
                  : 'Dùng URL ảnh, kể câu chuyện phía sau tác phẩm và chia sẻ với cộng đồng.'}
            </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng hộp thoại đăng tác phẩm"
            onClick={resetAndClose}
            className="grid size-10 shrink-0 place-items-center rounded-full text-stone-600 transition-colors hover:bg-orange-100 hover:text-stone-950"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <form
          noValidate
          aria-busy={busy}
          onSubmit={handleSubmit}
          className="px-5 py-6 sm:px-8 sm:py-8"
        >
          <p role="status" aria-live="polite" className="sr-only">
            {busy ? 'Đang đăng tác phẩm…' : ''}
          </p>
          {errors.form ? (
            <div
              ref={formErrorRef}
              role="alert"
              tabIndex={-1}
              className="mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {errors.form}
            </div>
          ) : null}

          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(20rem,0.95fr)]">
            <section aria-labelledby="post-details-heading">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-orange-700 text-xs font-black text-white">
                  1
                </span>
                <h3
                  id="post-details-heading"
                  className="text-sm font-black tracking-wide text-stone-900 uppercase"
                >
                  Câu chuyện tác phẩm
                </h3>
              </div>
              <PostDetailsFields
                draft={draft}
                errors={errors}
                titleInputRef={titleInputRef}
                onChange={updateField}
              />
            </section>

            <section
              aria-labelledby="post-media-heading"
              className="min-w-0 rounded-xl border border-orange-200 bg-orange-50/45 p-4 sm:p-5"
            >
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-orange-700 text-xs font-black text-white">
                  2
                </span>
                <h3
                  id="post-media-heading"
                  className="text-sm font-black tracking-wide text-stone-900 uppercase"
                >
                  Chọn ảnh trưng bày
                </h3>
              </div>
              {imageInputMode === 'upload' ? (
                <PostImageField
                  draft={draft}
                  errors={errors}
                  previewUrl={previewUrl}
                  busy={busy}
                  onChange={updateImage}
                />
              ) : (
                <PostImageUrlField
                  busy={busy}
                  draft={draft}
                  errors={errors}
                  onChange={updateImageUrl}
                />
              )}
            </section>
          </div>

          <section
            aria-labelledby="post-topics-heading"
            className="mt-8 border-t border-orange-200 pt-7"
          >
            <div className="mb-1 flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-full bg-orange-700 text-xs font-black text-white">
                3
              </span>
              <h3
                id="post-topics-heading"
                className="text-sm font-black tracking-wide text-stone-900 uppercase"
              >
                Gắn chủ đề
              </h3>
            </div>
            <PostTopicSelector
              topics={topics}
              selectedTopicIds={draft.topicIds}
              error={errors.topicIds}
              busy={busy}
              onToggle={toggleTopic}
            />
          </section>

          <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-orange-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden max-w-md text-xs leading-5 text-stone-500 sm:block">
              Bằng việc đăng, bạn xác nhận đây là tác phẩm phù hợp để chia sẻ
              trong cộng đồng học đường.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
                disabled={busy}
              onClick={resetAndClose}
                className="rounded-md border border-stone-400 bg-white px-5 py-2.5 text-sm font-bold text-stone-700 transition-colors hover:border-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-orange-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-800 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? (
                <>
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 motion-safe:animate-spin motion-reduce:animate-none"
                  />
                    Đang tải ảnh lên…
                </>
              ) : (
                <>
                  <Send aria-hidden="true" className="size-4" />
                  Đăng tác phẩm
                </>
              )}
            </button>
            </div>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  )
}
