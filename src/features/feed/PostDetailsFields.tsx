import type { RefObject } from 'react'
import type {
  CreatePostDraft,
  CreatePostErrors,
} from './createPostForm'
import {
  CreatePostFieldError,
  createPostInputClassName,
} from './CreatePostField'

export type CreatePostTextField =
  | 'title'
  | 'caption'
  | 'examName'

interface PostDetailsFieldsProps {
  draft: CreatePostDraft
  errors: CreatePostErrors
  titleInputRef: RefObject<HTMLInputElement | null>
  onChange: (field: CreatePostTextField, value: string) => void
}

export function PostDetailsFields({
  draft,
  errors,
  titleInputRef,
  onChange,
}: PostDetailsFieldsProps) {
  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="post-title"
          className="text-sm font-semibold text-stone-800"
        >
          Tiêu đề <span aria-hidden="true">*</span>
        </label>
        <input
          ref={titleInputRef}
          id="post-title"
          name="title"
          value={draft.title}
          maxLength={120}
          required
          aria-invalid={Boolean(errors.title)}
          aria-describedby={
            errors.title ? 'post-title-error' : 'post-title-help'
          }
          onChange={(event) => onChange('title', event.target.value)}
          placeholder="Ví dụ: Mầm xanh tương lai"
          className={createPostInputClassName}
        />
        <div
          id="post-title-help"
          className="mt-1.5 flex justify-between gap-3 text-xs text-stone-500"
        >
          <span>Tên ngắn gọn, dễ nhớ.</span>
          <span>{draft.title.length}/120</span>
        </div>
        <CreatePostFieldError
          id="post-title-error"
          message={errors.title}
        />
      </div>

      <div>
        <label
          htmlFor="post-exam"
          className="text-sm font-semibold text-stone-800"
        >
          Bài thi hoặc cuộc thi{' '}
          <span className="font-normal text-stone-500">
            (không bắt buộc)
          </span>
        </label>
        <input
          id="post-exam"
          name="examName"
          value={draft.examName}
          maxLength={160}
          aria-invalid={Boolean(errors.examName)}
          aria-describedby={
            errors.examName ? 'post-exam-error' : undefined
          }
          onChange={(event) => onChange('examName', event.target.value)}
          placeholder="Ví dụ: Sắc màu quê hương 2026"
          className={createPostInputClassName}
        />
        <CreatePostFieldError
          id="post-exam-error"
          message={errors.examName}
        />
      </div>

      <div>
        <label
          htmlFor="post-caption"
          className="text-sm font-semibold text-stone-800"
        >
          Mô tả <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="post-caption"
          name="caption"
          value={draft.caption}
          maxLength={2000}
          required
          rows={5}
          aria-invalid={Boolean(errors.caption)}
          aria-describedby={
            errors.caption
              ? 'post-caption-error'
              : 'post-caption-help'
          }
          onChange={(event) => onChange('caption', event.target.value)}
          placeholder="Chất liệu, ý tưởng hoặc câu chuyện phía sau tác phẩm…"
          className={`${createPostInputClassName} resize-y`}
        />
        <div
          id="post-caption-help"
          className="mt-1.5 text-right text-xs text-stone-500"
        >
          {draft.caption.length}/2.000
        </div>
        <CreatePostFieldError
          id="post-caption-error"
          message={errors.caption}
        />
      </div>
    </div>
  )
}
