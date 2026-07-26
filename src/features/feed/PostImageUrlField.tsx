import { Image as ImageIcon, Link } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  isHttpImageUrl,
  type CreatePostDraft,
  type CreatePostErrors,
} from './createPostForm'
import { CreatePostFieldError } from './CreatePostField'

interface PostImageUrlFieldProps {
  draft: CreatePostDraft
  errors: CreatePostErrors
  busy: boolean
  onChange: (value: string) => void
}

export function PostImageUrlField({
  draft,
  errors,
  busy,
  onChange,
}: PostImageUrlFieldProps) {
  const [previewFailed, setPreviewFailed] = useState(false)
  const imageUrl = draft.imageUrl.trim()
  const canPreview = isHttpImageUrl(imageUrl) && !previewFailed
  const error = errors.imageUrl

  useEffect(() => {
    setPreviewFailed(false)
  }, [imageUrl])

  return (
    <div
      role="group"
      aria-labelledby="post-image-url-label"
      aria-describedby="post-image-url-help post-image-url-error"
      aria-invalid={Boolean(error)}
    >
      <label
        id="post-image-url-label"
        className="text-sm font-bold text-stone-900"
        htmlFor="post-image-url"
      >
        URL ảnh tác phẩm <span aria-hidden="true">*</span>
      </label>
      <p
        id="post-image-url-help"
        className="mt-1 text-xs leading-5 text-stone-500"
      >
        Dùng liên kết ảnh HTTP hoặc HTTPS công khai.
      </p>

      <div className="relative mt-3">
        <Link
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3.5 size-4 text-stone-400"
        />
        <input
          id="post-image-url"
          name="imageUrl"
          type="url"
          inputMode="url"
          autoComplete="url"
          disabled={busy}
          aria-label="URL ảnh tác phẩm"
          aria-invalid={Boolean(error)}
          className="min-h-11 w-full rounded-md border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-orange-700 focus:ring-3 focus:ring-orange-200 disabled:cursor-wait disabled:opacity-60"
          placeholder="https://example.com/tac-pham.webp"
          value={draft.imageUrl}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>

      <CreatePostFieldError id="post-image-url-error" message={error} />

      <div className="mt-4 aspect-[4/3] overflow-hidden rounded-md border border-orange-200 bg-white">
        {canPreview ? (
          <img
            alt="Xem trước ảnh tác phẩm"
            className="size-full object-contain"
            src={imageUrl}
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          <div
            className="grid size-full place-items-center px-6 text-center text-stone-500"
            role="status"
          >
            <div>
              <ImageIcon aria-hidden="true" className="mx-auto size-8" />
              <p className="mt-3 text-sm font-semibold">
                {previewFailed
                  ? 'Không thể xem trước ảnh từ URL này.'
                  : 'Nhập URL hợp lệ để xem trước ảnh.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
