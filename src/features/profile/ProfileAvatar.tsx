import { useEffect, useState } from 'react'
import type { User } from '../../types/api'

interface ProfileAvatarProps {
  user: Pick<User, 'avatarUrl' | 'displayName'>
  className?: string
}

function getInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return 'A'

  return words
    .slice(-2)
    .map((word) => word.charAt(0))
    .join('')
    .toLocaleUpperCase('vi-VN')
}

export function ProfileAvatar({
  user,
  className = 'size-10',
}: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(user.avatarUrl) && !imageFailed

  useEffect(() => {
    setImageFailed(false)
  }, [user.avatarUrl])

  return (
    <span
      aria-hidden="true"
      className={`${className} grid shrink-0 place-items-center overflow-hidden rounded-full border border-stone-200 bg-stone-100 text-sm font-black text-stone-700`}
    >
      {showImage ? (
        <img
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
          src={user.avatarUrl ?? undefined}
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitials(user.displayName)
      )}
    </span>
  )
}
