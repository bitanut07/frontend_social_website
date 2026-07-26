import { ImagePlus, LoaderCircle, Save, X } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import type { UpdateProfileInput, User } from '../../types/api'
import { ProfileAvatar } from './ProfileAvatar'

const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

interface EditProfileDialogProps {
  allowAvatarUpload?: boolean
  error?: string | null
  isSubmitting?: boolean
  open: boolean
  user: User | null
  onClose: () => void
  onSubmit: (input: UpdateProfileInput) => void | Promise<unknown>
}

export function EditProfileDialog({
  allowAvatarUpload = true,
  error = null,
  isSubmitting = false,
  open,
  user,
  onClose,
  onSubmit,
}: EditProfileDialogProps) {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [avatarInputError, setAvatarInputError] = useState('')
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const avatarObjectUrlRef = useRef<string | null>(null)

  function clearAvatarObjectUrl() {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current)
      avatarObjectUrlRef.current = null
    }
  }

  useEffect(() => {
    if (!open || !user) return
    clearAvatarObjectUrl()
    setDisplayName(user.displayName)
    setUsername(user.username)
    setCurrentAvatarUrl(user.avatarUrl ?? '')
    setAvatarFile(null)
    setAvatarPreviewUrl(user.avatarUrl ?? '')
    setAvatarInputError('')
    setIsDraggingAvatar(false)
    window.setTimeout(() => firstFieldRef.current?.focus(), 0)
  }, [open, user])

  useEffect(() => {
    return () => clearAvatarObjectUrl()
  }, [])

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSubmitting, onClose, open])

  const previewUser = useMemo<User | null>(() => {
    if (!user) return null

    return {
      ...user,
      displayName: displayName.trim() || user.displayName,
      username: username.trim() || user.username,
      avatarUrl: avatarPreviewUrl || null,
    }
  }, [avatarPreviewUrl, displayName, user, username])

  if (!open || !user || !previewUser) return null

  function selectAvatarFile(file: File) {
    if (!AVATAR_MIME_TYPES.has(file.type)) {
      setAvatarInputError('Avatar chỉ hỗ trợ JPG, PNG hoặc WebP.')
      return
    }
    if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
      setAvatarInputError('Avatar không được vượt quá 5 MB.')
      return
    }

    clearAvatarObjectUrl()
    const objectUrl = URL.createObjectURL(file)
    avatarObjectUrlRef.current = objectUrl
    setAvatarFile(file)
    setAvatarPreviewUrl(objectUrl)
    setAvatarInputError('')
  }

  function firstDroppedFile(files: FileList | null) {
    return files && files.length > 0 ? files[0] : null
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (avatarInputError) return

    const input: UpdateProfileInput = {
      displayName,
      username,
    }
    if (allowAvatarUpload && avatarFile) {
      input.avatarFile = avatarFile
    } else {
      input.avatarUrl = currentAvatarUrl || null
    }

    void onSubmit(input)
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose()
        }
      }}
    >
      <section
        aria-labelledby="edit-profile-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-lg bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2
            className="text-lg font-black tracking-tight text-stone-950"
            id="edit-profile-title"
          >
            Chỉnh sửa profile
          </h2>
          <button
            aria-label="Đóng chỉnh sửa profile"
            className="grid size-10 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900 disabled:cursor-wait disabled:opacity-60"
            disabled={isSubmitting}
            type="button"
            onClick={onClose}
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <form className="p-5" onSubmit={handleSubmit}>
          <div className="flex items-center gap-4 rounded-lg bg-stone-50 p-4">
            <ProfileAvatar className="size-16" user={previewUser} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-stone-950">
                {previewUser.displayName}
              </p>
              <p className="truncate text-sm text-stone-500">
                @{previewUser.username}
              </p>
            </div>
          </div>

          <div className="mt-5">
            {allowAvatarUpload ? (
              <>
                <span className="text-sm font-bold text-stone-800">
                  Avatar
                </span>
                <label
                  className={`mt-1 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${
                    isDraggingAvatar
                      ? 'border-orange-700 bg-orange-50 text-orange-900'
                      : 'border-stone-300 bg-white text-stone-600 hover:border-orange-400 hover:bg-orange-50'
                  }`}
                  htmlFor="profile-avatar-file"
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setIsDraggingAvatar(true)
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault()
                    if (event.currentTarget === event.target) {
                      setIsDraggingAvatar(false)
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDraggingAvatar(true)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setIsDraggingAvatar(false)
                    const file = firstDroppedFile(event.dataTransfer.files)
                    if (file) selectAvatarFile(file)
                  }}
                >
                  <ImagePlus aria-hidden="true" className="size-7" />
                  <span className="mt-2 text-sm font-bold">
                    Kéo thả ảnh vào đây hoặc chọn ảnh
                  </span>
                  <span className="mt-1 text-xs text-stone-500">
                    JPG, PNG, WebP · tối đa 5 MB
                  </span>
                  {avatarFile ? (
                    <span className="mt-2 max-w-full truncate text-xs font-semibold text-orange-800">
                      {avatarFile.name}
                    </span>
                  ) : null}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    id="profile-avatar-file"
                    type="file"
                    onChange={(event) => {
                      const file = firstDroppedFile(event.currentTarget.files)
                      if (file) selectAvatarFile(file)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
                {avatarInputError ? (
                  <p
                    className="mt-2 text-sm font-medium text-rose-700"
                    role="alert"
                  >
                    {avatarInputError}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <label
                  className="text-sm font-bold text-stone-800"
                  htmlFor="profile-avatar-url"
                >
                  URL avatar
                </label>
                <input
                  className="mt-1 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none placeholder:text-stone-400 focus:border-orange-700 focus:ring-2 focus:ring-orange-200"
                  id="profile-avatar-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com/avatar.webp"
                  value={currentAvatarUrl}
                  onChange={(event) => {
                    clearAvatarObjectUrl()
                    setAvatarFile(null)
                    setCurrentAvatarUrl(event.target.value)
                    setAvatarPreviewUrl(event.target.value)
                    setAvatarInputError('')
                  }}
                />
              </>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label
                className="text-sm font-bold text-stone-800"
                htmlFor="profile-display-name"
              >
                Tên hiển thị
              </label>
              <input
                className="mt-1 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950 focus:border-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-200"
                id="profile-display-name"
                maxLength={100}
                ref={firstFieldRef}
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>

            <div>
              <label
                className="text-sm font-bold text-stone-800"
                htmlFor="profile-username"
              >
                Username
              </label>
              <div className="mt-1 flex min-h-11 rounded-md border border-stone-300 bg-white focus-within:border-orange-700 focus-within:ring-2 focus-within:ring-orange-200">
                <span className="grid place-items-center px-3 text-sm font-semibold text-stone-400">
                  @
                </span>
                <input
                  className="min-w-0 flex-1 bg-transparent pr-3 text-sm text-stone-950 outline-none"
                  id="profile-username"
                  maxLength={50}
                  pattern="(?:[a-z0-9._]|-){3,50}"
                  required
                  value={username}
                  onChange={(event) =>
                    setUsername(event.target.value.toLowerCase())
                  }
                />
              </div>
            </div>

          </div>

          {error ? (
            <p
              className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <button
              className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60"
              disabled={isSubmitting}
              type="button"
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              aria-busy={isSubmitting}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-orange-700 px-4 text-sm font-bold text-white hover:bg-orange-800 disabled:cursor-wait disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 motion-safe:animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Save aria-hidden="true" className="size-4" />
              )}
              {isSubmitting ? 'Đang lưu…' : 'Lưu profile'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
