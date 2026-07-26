import {
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import {
  type ChangeEvent,
  type DragEvent,
  useRef,
  useState,
} from 'react'
import {
  MAX_POST_IMAGE_BYTES,
  POST_IMAGE_MIME_TYPES,
  type CreatePostDraft,
  type CreatePostErrors,
} from './createPostForm'
import { CreatePostFieldError } from './CreatePostField'

interface PostImageFieldProps {
  draft: CreatePostDraft
  errors: CreatePostErrors
  previewUrl: string
  busy: boolean
  onChange: (file: File | null) => void
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileValidationMessage(file: File | null) {
  if (!file) return undefined
  if (
    !POST_IMAGE_MIME_TYPES.includes(
      file.type as (typeof POST_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return 'Chỉ nhận ảnh JPG, PNG hoặc WebP.'
  }
  if (file.size <= 0 || file.size > MAX_POST_IMAGE_BYTES) {
    return 'Ảnh phải có dung lượng không quá 50 MB.'
  }
  return undefined
}

export function PostImageField({
  draft,
  errors,
  previewUrl,
  busy,
  onChange,
}: PostImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const localError = fileValidationMessage(draft.imageFile)
  const error = errors.imageFile ?? localError

  const selectFile = (file?: File) => {
    if (file) onChange(file)
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0])
  }

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (busy) return
    dragDepthRef.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDragging(false)
    if (busy) return
    selectFile(event.dataTransfer.files?.[0])
  }

  const openPicker = () => {
    inputRef.current?.click()
  }

  return (
    <div
      role="group"
      className="min-w-0 border-0 p-0"
      aria-labelledby="post-image-label"
      aria-describedby="post-image-help post-image-error"
      aria-invalid={Boolean(error)}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p id="post-image-label" className="text-sm font-bold text-stone-900">
            Ảnh tác phẩm <span aria-hidden="true">*</span>
            <span className="sr-only"> (bắt buộc)</span>
          </p>
          <p
            id="post-image-help"
            className="mt-1 text-xs leading-5 text-stone-500"
          >
            JPG, PNG hoặc WebP · tối đa 50 MB
          </p>
        </div>
        {draft.imageFile ? (
          <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">
            Sẵn sàng tải lên
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id="post-image"
        name="imageFile"
        type="file"
        accept={POST_IMAGE_MIME_TYPES.join(',')}
        disabled={busy}
        aria-label="Chọn ảnh tác phẩm từ máy"
        aria-invalid={Boolean(error)}
        className="hidden"
        onChange={handleInput}
        onClick={(event) => {
          event.currentTarget.value = ''
        }}
      />

      <div
        role="region"
        aria-label="Vùng kéo thả ảnh tác phẩm"
        className={`group relative mt-3 overflow-hidden rounded-xl border-2 border-dashed transition ${
          isDragging
            ? 'border-orange-700 bg-orange-100 ring-4 ring-orange-200/60'
            : error
              ? 'border-rose-400 bg-rose-50/60'
              : 'border-orange-300 bg-[#fffdf1] hover:border-orange-700 hover:bg-orange-50'
        } ${draft.imageFile && previewUrl ? 'aspect-[4/3]' : 'min-h-80'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        {draft.imageFile && previewUrl && !localError ? (
          <>
            <img
              src={previewUrl}
              alt={`Xem trước ảnh ${draft.imageFile.name}`}
              className="size-full object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-stone-950/85 via-stone-950/55 to-transparent px-4 pt-14 pb-4 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {draft.imageFile.name}
                </p>
                <p className="mt-0.5 text-xs text-white/75">
                  {formatFileSize(draft.imageFile.size)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={openPicker}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/40 bg-white/15 px-3 text-xs font-bold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-50"
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Đổi ảnh
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Xóa ảnh ${draft.imageFile.name}`}
                  onClick={() => onChange(null)}
                  className="grid size-10 place-items-center rounded-md border border-white/40 bg-white/15 text-white backdrop-blur transition hover:bg-rose-600 disabled:opacity-50"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid min-h-80 place-items-center px-6 py-10 text-center">
            <div>
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-orange-100 text-orange-800 ring-8 ring-orange-50">
                {isDragging ? (
                  <ImageIcon aria-hidden="true" className="size-7" />
                ) : (
                  <UploadCloud aria-hidden="true" className="size-7" />
                )}
              </span>
              <p className="mt-6 text-base font-bold text-stone-900">
                {isDragging
                  ? 'Thả ảnh vào khung tranh'
                  : draft.imageFile
                    ? 'Ảnh này chưa được hỗ trợ'
                    : 'Kéo ảnh vào đây'}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                hoặc chọn một tệp có sẵn trên thiết bị
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={openPicker}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-orange-700 px-5 text-sm font-bold text-white transition hover:bg-orange-800 disabled:cursor-wait disabled:opacity-50"
              >
                <UploadCloud aria-hidden="true" className="size-4" />
                Chọn ảnh từ máy
              </button>
              {draft.imageFile ? (
                <p className="mt-3 max-w-xs truncate text-xs text-stone-500">
                  {draft.imageFile.name} ·{' '}
                  {formatFileSize(draft.imageFile.size)}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <CreatePostFieldError id="post-image-error" message={error} />
      <p className="mt-2 flex items-center gap-2 text-xs text-stone-500">
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full bg-orange-600"
        />
        Ảnh được lưu riêng tư trong Supabase Storage và chỉ người có quyền mới
        xem được.
      </p>
    </div>
  )
}
