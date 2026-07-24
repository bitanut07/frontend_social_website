import { useState } from 'react'
import type { User } from '../../types/api'

interface UserAvatarProps {
  user: User
  className?: string
}

function getInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/)

  return words
    .slice(-2)
    .map((word) => word.charAt(0))
    .join('')
    .toLocaleUpperCase('vi-VN')
}

export function UserAvatar({ user, className = 'size-10' }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(user.avatarUrl) && !imageFailed

  return (
    <span
      aria-hidden="true"
      className={`${className} relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-orange-200 bg-orange-100 text-xs font-bold text-orange-900`}
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          src={user.avatarUrl ?? undefined}
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitials(user.displayName)
      )}
    </span>
  )
}
