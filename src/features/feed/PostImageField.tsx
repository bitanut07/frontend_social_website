import {
  Image as ImageIcon,
  Plus,
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
  MAX_POST_IMAGES,
  POST_IMAGE_MIME_TYPES,
  type CreatePostDraft,
  type CreatePostErrors,
} from './createPostForm'
import { CreatePostFieldError } from './CreatePostField'

interface PostImageFieldProps {
  draft: CreatePostDraft
  errors: CreatePostErrors
  previewUrls: string[]
  busy: boolean
  onChange: (files: File[]) => void
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function filesValidationMessage(files: File[]) {
  if (files.length > MAX_POST_IMAGES) {
    return `Mỗi bài chỉ được đăng tối đa ${MAX_POST_IMAGES} ảnh.`
  }
  if (
    files.some(
      (file) =>
        !POST_IMAGE_MIME_TYPES.includes(
          file.type as (typeof POST_IMAGE_MIME_TYPES)[number],
        ),
    )
  ) {
    return 'Chỉ nhận ảnh JPG, PNG hoặc WebP.'
  }
  if (
    files.some(
      (file) =>
        file.size <= 0 || file.size > MAX_POST_IMAGE_BYTES,
    )
  ) {
    return 'Mỗi ảnh phải có dung lượng không quá 50 MB.'
  }
  return undefined
}

function sameFile(left: File, right: File) {
  return (
    left.name === right.name &&
    left.size === right.size &&
    left.lastModified === right.lastModified
  )
}

export function PostImageField({
  draft,
  errors,
  previewUrls,
  busy,
  onChange,
}: PostImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const localError = filesValidationMessage(draft.imageFiles)
  const error = errors.imageFiles ?? localError

  const selectFiles = (selectedFiles: FileList | File[]) => {
    const nextFiles = [...draft.imageFiles]
    Array.from(selectedFiles).forEach((file) => {
      if (!nextFiles.some((current) => sameFile(current, file))) {
        nextFiles.push(file)
      }
    })
    onChange(nextFiles)
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) selectFiles(event.target.files)
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
    if (!busy) selectFiles(event.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    onChange(draft.imageFiles.filter((_, fileIndex) => fileIndex !== index))
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
            Tối đa {MAX_POST_IMAGES} ảnh JPG, PNG hoặc WebP · 50 MB mỗi ảnh
          </p>
        </div>
        {draft.imageFiles.length > 0 ? (
          <div className="flex shrink-0 items-center gap-2 text-xs font-bold">
            <span className="hidden text-orange-800 sm:inline">
              Sẵn sàng tải lên
            </span>
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-800">
              {draft.imageFiles.length}/{MAX_POST_IMAGES} ảnh
            </span>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id="post-image"
        name="imageFiles"
        type="file"
        multiple
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
        className={`mt-3 rounded-xl border-2 border-dashed p-3 transition ${
          isDragging
            ? 'border-orange-700 bg-orange-100 ring-4 ring-orange-200/60'
            : error
              ? 'border-rose-400 bg-rose-50/60'
              : 'border-orange-300 bg-[#fffdf1] hover:border-orange-700 hover:bg-orange-50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        {draft.imageFiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {draft.imageFiles.map((file, index) => (
              <figure
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="group relative min-w-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
              >
                <div className="aspect-square">
                  {previewUrls[index] && !filesValidationMessage([file]) ? (
                    <img
                      src={previewUrls[index]}
                      alt={`Xem trước ảnh ${file.name}`}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="grid size-full place-items-center text-stone-400">
                      <ImageIcon aria-hidden="true" className="size-7" />
                    </span>
                  )}
                </div>
                <figcaption className="min-w-0 border-t border-stone-200 bg-white px-2.5 py-2 pr-10">
                  <p className="truncate text-xs font-bold text-stone-800">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] text-stone-500">
                    {formatFileSize(file.size)}
                  </p>
                </figcaption>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Xóa ảnh ${file.name}`}
                  onClick={() => removeFile(index)}
                  className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-stone-950/80 text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              </figure>
            ))}

            {draft.imageFiles.length < MAX_POST_IMAGES ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="grid aspect-square min-h-32 place-items-center rounded-lg border border-dashed border-orange-400 bg-orange-50/60 px-3 text-center text-sm font-bold text-orange-800 transition hover:border-orange-700 hover:bg-orange-100 disabled:opacity-50"
              >
                <span>
                  <Plus aria-hidden="true" className="mx-auto mb-2 size-6" />
                  Thêm ảnh
                </span>
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-6 py-10 text-center">
            <div>
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-orange-100 text-orange-800 ring-8 ring-orange-50">
                {isDragging ? (
                  <ImageIcon aria-hidden="true" className="size-7" />
                ) : (
                  <UploadCloud aria-hidden="true" className="size-7" />
                )}
              </span>
              <p className="mt-6 text-base font-bold text-stone-900">
                {isDragging ? 'Thả ảnh vào đây' : 'Kéo một hoặc nhiều ảnh vào đây'}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                Ảnh sẽ được giữ đúng thứ tự bạn chọn
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-orange-700 px-5 text-sm font-bold text-white transition hover:bg-orange-800 disabled:cursor-wait disabled:opacity-50"
              >
                <UploadCloud aria-hidden="true" className="size-4" />
                Chọn ảnh từ máy
              </button>
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
