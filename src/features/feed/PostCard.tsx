import { Award, Heart, ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Post } from '../../types/api'
import {
  formatPostDate,
  formatReactionCount,
  getInitials,
} from './feedFormatting'
import type { PostCardProps } from './feedTypes'

interface ReactionView {
  count: number
  reacted: boolean
}

function AuthorAvatar({ post }: { post: Post }) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [post.author.avatarUrl])

  if (post.author.avatarUrl && !imageFailed) {
    return (
      <img
        src={post.author.avatarUrl}
        alt=""
        onError={() => setImageFailed(true)}
        className="size-10 shrink-0 rounded-full border border-stone-200 object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-100 text-xs font-bold text-orange-800 ring-1 ring-orange-200"
    >
      {getInitials(post.author.displayName)}
    </span>
  )
}

export function PostCard({ post, onToggleReaction }: PostCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const [optimisticReaction, setOptimisticReaction] =
    useState<ReactionView | null>(null)
  const [isUpdatingReaction, setIsUpdatingReaction] = useState(false)
  const [reactionError, setReactionError] = useState('')

  useEffect(() => {
    setImageFailed(false)
  }, [post.imageUrl])

  useEffect(() => {
    setOptimisticReaction(null)
    setReactionError('')
  }, [post.id, post.reactionCount, post.viewerHasReacted])

  const reaction = optimisticReaction ?? {
    count: post.reactionCount,
    reacted: post.viewerHasReacted,
  }

  const handleReaction = async () => {
    if (isUpdatingReaction) {
      return
    }

    const previous = reaction
    const next = {
      reacted: !previous.reacted,
      count: Math.max(0, previous.count + (previous.reacted ? -1 : 1)),
    }

    setOptimisticReaction(next)
    setReactionError('')
    setIsUpdatingReaction(true)

    try {
      await onToggleReaction(post.id, next.reacted)
    } catch {
      setOptimisticReaction(previous)
      setReactionError(
        'Chưa thể cập nhật lượt yêu thích. Trạng thái cũ đã được khôi phục.',
      )
    } finally {
      setIsUpdatingReaction(false)
    }
  }

  const roleLabel =
    post.author.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'
  const formattedDate = formatPostDate(post.createdAt)

  return (
    <article
      aria-labelledby={`post-title-${post.id}`}
      className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm"
    >
      <header className="flex items-center gap-3 px-4 py-3.5">
        <AuthorAvatar post={post} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-semibold text-stone-950">
              {post.author.displayName}
            </p>
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
              {roleLabel}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-stone-500">
            @{post.author.username} ·{' '}
            <time dateTime={post.createdAt}>{formattedDate}</time>
          </p>
        </div>
      </header>

      <div className="aspect-square overflow-hidden bg-stone-100">
        {imageFailed ? (
          <div
            role="img"
            aria-label={`Không tải được ảnh tác phẩm ${post.title}`}
            className="grid size-full place-items-center px-6 text-center text-stone-500"
          >
            <span>
              <ImageOff aria-hidden="true" className="mx-auto size-8" />
              <span className="mt-2 block text-sm">
                Không tải được ảnh tác phẩm
              </span>
            </span>
          </div>
        ) : (
          <img
            src={post.imageUrl}
            alt={`Tác phẩm “${post.title}” của ${post.author.displayName}`}
            decoding="async"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="size-full object-cover"
          />
        )}
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-pressed={reaction.reacted}
            aria-label={`Yêu thích tác phẩm ${post.title}`}
            aria-describedby={`reaction-count-${post.id}`}
            aria-busy={isUpdatingReaction}
            disabled={isUpdatingReaction}
            onClick={handleReaction}
            className="group -m-2 grid size-11 place-items-center rounded-md text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-800 disabled:cursor-wait disabled:opacity-70"
          >
            <Heart
              aria-hidden="true"
              className={
                reaction.reacted
                  ? 'size-6 fill-orange-600 text-orange-600'
                  : 'size-6 transition-transform group-hover:scale-105'
              }
            />
          </button>
          <span
            id={`reaction-count-${post.id}`}
            role="status"
            aria-live="polite"
            className="text-sm text-stone-600"
          >
            <span className="font-semibold text-stone-800">
              {formatReactionCount(reaction.count)}
            </span>{' '}
            lượt yêu thích
            {isUpdatingReaction ? (
              <span className="sr-only">, đang cập nhật</span>
            ) : null}
          </span>
        </div>

        {reactionError ? (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {reactionError}
          </p>
        ) : null}

        <h3
          id={`post-title-${post.id}`}
          className="mt-3 text-base font-semibold leading-6 text-stone-950"
        >
          {post.title}
        </h3>

        {post.examName ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-orange-800">
            <Award aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{post.examName}</span>
          </p>
        ) : null}

        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">
          {post.caption}
        </p>

        <ul
          aria-label="Chủ đề của tác phẩm"
          className="mt-3 flex flex-wrap gap-2"
        >
          {post.topics.map((topic) => (
            <li
              key={topic.id}
              className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 ring-1 ring-inset ring-orange-200"
            >
              {topic.name}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
