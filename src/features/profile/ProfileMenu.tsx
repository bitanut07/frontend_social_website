import {
  ChevronDown,
  LogOut,
  Pencil,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { User } from '../../types/api'
import { ProfileAvatar } from './ProfileAvatar'

interface ProfileMenuProps {
  currentUser: User
  onEditProfile: () => void
  onOpenProfile: () => void
  onSignOut?: () => Promise<void>
}

export function ProfileMenu({
  currentUser,
  onEditProfile,
  onOpenProfile,
  onSignOut,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function closeThen(callback: () => void) {
    callback()
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Mở menu tài khoản ${currentUser.displayName}`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-1.5 py-1 text-sm font-semibold text-stone-800 shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <ProfileAvatar className="size-8 sm:size-9" user={currentUser} />
        <span className="hidden max-w-36 truncate pr-0.5 sm:inline">
          {currentUser.displayName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`mr-1 size-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-72 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xl"
          role="menu"
        >
          <div className="flex items-center gap-3 border-b border-stone-100 p-3">
            <ProfileAvatar className="size-11" user={currentUser} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-stone-950">
                {currentUser.displayName}
              </p>
              <p className="truncate text-xs text-stone-500">
                @{currentUser.username}
              </p>
            </div>
          </div>

          <div className="p-1.5">
            <button
              className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-stone-700 hover:bg-stone-50"
              role="menuitem"
              type="button"
              onClick={() => closeThen(onOpenProfile)}
            >
              <UserRound aria-hidden="true" className="size-4.5" />
              Xem profile
            </button>
            <button
              className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-stone-700 hover:bg-stone-50"
              role="menuitem"
              type="button"
              onClick={() => closeThen(onEditProfile)}
            >
              <Pencil aria-hidden="true" className="size-4.5" />
              Chỉnh sửa profile
            </button>
          </div>

          {onSignOut ? (
            <div className="border-t border-stone-100 p-1.5">
              <button
                className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false)
                  void onSignOut()
                }}
              >
                <LogOut aria-hidden="true" className="size-4.5" />
                Đăng xuất
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
