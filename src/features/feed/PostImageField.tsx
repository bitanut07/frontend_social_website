import { Image as ImageIcon } from 'lucide-react'
import type {
  CreatePostDraft,
  CreatePostErrors,
} from './createPostForm'
import { isHttpImageUrl } from './createPostForm'
import {
  CreatePostFieldError,
  createPostInputClassName,
} from './CreatePostField'

interface PostImageFieldProps {
  draft: CreatePostDraft
  errors: CreatePostErrors
  previewFailed: boolean
  onChange: (value: string) => void
  onPreviewError: () => void
}

export function PostImageField({
  draft,
  errors,
  previewFailed,
  onChange,
  onPreviewError,
}: PostImageFieldProps) {
  const showPreview =
    isHttpImageUrl(draft.imageUrl.trim()) && !previewFailed

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="post-image"
          className="text-sm font-semibold text-stone-800"
        >
          URL ảnh <span aria-hidden="true">*</span>
        </label>
        <input
          id="post-image"
          name="imageUrl"
          type="url"
          inputMode="url"
          value={draft.imageUrl}
          maxLength={2048}
          required
          aria-invalid={Boolean(errors.imageUrl)}
          aria-describedby={
            errors.imageUrl ? 'post-image-error' : 'post-image-help'
          }
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://example.com/tac-pham.jpg"
          className={createPostInputClassName}
        />
        <p
          id="post-image-help"
          className="mt-1.5 text-xs leading-5 text-stone-500"
        >
          Dùng liên kết trực tiếp bắt đầu bằng http:// hoặc https://.
        </p>
        <CreatePostFieldError
          id="post-image-error"
          message={errors.imageUrl}
        />
      </div>

      <div
        aria-label="Xem trước ảnh tác phẩm"
        className="grid aspect-square place-items-center overflow-hidden rounded-md border border-stone-200 bg-white"
      >
        {showPreview ? (
          <img
            src={draft.imageUrl.trim()}
            alt="Xem trước tác phẩm sẽ đăng"
            referrerPolicy="no-referrer"
            onError={onPreviewError}
            className="size-full object-cover"
          />
        ) : (
          <span className="px-6 text-center text-sm text-stone-500">
            <ImageIcon
              aria-hidden="true"
              className="mx-auto mb-2 size-7 text-stone-400"
            />
            {previewFailed
              ? 'Không tải được ảnh từ URL này.'
              : 'Ảnh xem trước sẽ xuất hiện tại đây.'}
          </span>
        )}
      </div>
      {previewFailed ? (
        <p role="status" aria-live="polite" className="sr-only">
          Không tải được ảnh xem trước từ URL đã nhập.
        </p>
      ) : null}
    </div>
  )
}
