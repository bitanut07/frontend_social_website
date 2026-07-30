import {
  Award,
  Heart,
  LoaderCircle,
  MessageCircle,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Post } from '../../types/api'
import {
  formatPostDate,
  formatReactionCount,
  getInitials,
} from './feedFormatting'
import { PostComments } from './PostComments'
import { PostMediaGallery } from './PostMediaGallery'
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

export function PostCard({
  post,
  canDelete,
  currentUserId,
  onDeletePost,
  onToggleReaction,
  onListPostComments,
  onCreatePostComment,
  onDeletePostComment,
}: PostCardProps) {
  const [optimisticReaction, setOptimisticReaction] =
    useState<ReactionView | null>(null)
  const [isUpdatingReaction, setIsUpdatingReaction] = useState(false)
  const [reactionError, setReactionError] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentsMounted, setCommentsMounted] = useState(false)
  const [displayedCommentCount, setDisplayedCommentCount] = useState(
    Math.max(0, post.commentCount),
  )

  useEffect(() => {
    setOptimisticReaction(null)
    setReactionError('')
  }, [post.id, post.reactionCount, post.viewerHasReacted])

  useEffect(() => {
    setCommentsOpen(false)
    setCommentsMounted(false)
  }, [post.id])

  useEffect(() => {
    setDisplayedCommentCount(Math.max(0, post.commentCount))
  }, [post.commentCount, post.id])

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

  const handleDelete = async () => {
    if (isDeleting) return

    setIsDeleting(true)
    setDeleteError('')
    try {
      await onDeletePost(post.id)
      setDeleteDialogOpen(false)
    } catch {
      setDeleteError(
        'Chưa thể xóa bài viết. Vui lòng kiểm tra kết nối và thử lại.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const roleLabel =
    post.author.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'
  const formattedDate = formatPostDate(post.createdAt)
  const commentsPanelId = `post-comments-${post.id}`
  const handleToggleComments = () => {
    const nextOpen = !commentsOpen
    if (nextOpen) setCommentsMounted(true)
    setCommentsOpen(nextOpen)
  }

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
        {canDelete ? (
          <button
            type="button"
            aria-label={`Xóa bài viết ${post.title}`}
            className="grid size-10 shrink-0 place-items-center rounded-md text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
            onClick={() => {
              setDeleteError('')
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 aria-hidden="true" className="size-4.5" />
          </button>
        ) : null}
      </header>

      <PostMediaGallery post={post} />

      <div className="px-4 pb-4 pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="-ml-2 flex items-center">
            <button
              type="button"
              aria-pressed={reaction.reacted}
              aria-label={`Yêu thích tác phẩm ${post.title}`}
              aria-describedby={`reaction-count-${post.id}`}
              aria-busy={isUpdatingReaction}
              disabled={isUpdatingReaction}
              onClick={handleReaction}
              className="group grid size-11 place-items-center rounded-md text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-800 disabled:cursor-wait disabled:opacity-70"
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
            <button
              type="button"
              aria-controls={commentsPanelId}
              aria-describedby={`comment-count-${post.id}`}
              aria-expanded={commentsOpen}
              aria-label={`Bình luận về tác phẩm ${post.title}`}
              className="group grid size-11 place-items-center rounded-md text-stone-700 transition-colors hover:bg-orange-50 hover:text-orange-800"
              onClick={handleToggleComments}
            >
              <MessageCircle
                aria-hidden="true"
                className={
                  commentsOpen
                    ? 'size-6 fill-orange-100 text-orange-700'
                    : 'size-6 transition-transform group-hover:scale-105'
                }
              />
            </button>
          </div>
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
          <span
            id={`comment-count-${post.id}`}
            aria-live="polite"
            className="text-sm text-stone-600"
          >
            <span className="font-semibold text-stone-800">
              {formatReactionCount(displayedCommentCount)}
            </span>{' '}
            bình luận
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

        {commentsMounted ? (
          <PostComments
            commentCount={displayedCommentCount}
            currentUserId={currentUserId}
            hidden={!commentsOpen}
            id={commentsPanelId}
            postId={post.id}
            postTitle={post.title}
            onCommentCreated={(previousCount) => {
              setDisplayedCommentCount((current) =>
                Math.max(current, previousCount + 1, post.commentCount),
              )
            }}
            onCommentDeleted={(previousCount) => {
              setDisplayedCommentCount((current) =>
                Math.max(0, Math.min(current, previousCount - 1)),
              )
            }}
            onCreatePostComment={onCreatePostComment}
            onDeletePostComment={onDeletePostComment}
            onListPostComments={onListPostComments}
          />
        ) : null}
      </div>

      {deleteDialogOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-stone-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setDeleteDialogOpen(false)
            }
          }}
        >
          <section
            aria-describedby={`delete-post-description-${post.id}`}
            aria-labelledby={`delete-post-title-${post.id}`}
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            role="alertdialog"
          >
            <h2
              className="text-lg font-bold text-stone-950"
              id={`delete-post-title-${post.id}`}
            >
              Xóa bài viết?
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-stone-600"
              id={`delete-post-description-${post.id}`}
            >
              Bài viết sẽ biến mất khỏi bảng tin. Ảnh gốc vẫn được giữ an
              toàn để quản trị viên có thể phục hồi khi cần.
            </p>

            {deleteError ? (
              <p
                className="mt-3 text-sm font-medium text-rose-700"
                role="alert"
              >
                {deleteError}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => setDeleteDialogOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                aria-busy={isDeleting}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-70"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
              >
                {isDeleting ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 motion-safe:animate-spin"
                  />
                ) : (
                  <Trash2 aria-hidden="true" className="size-4" />
                )}
                {isDeleting ? 'Đang xóa…' : 'Xóa bài viết'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  )
}
