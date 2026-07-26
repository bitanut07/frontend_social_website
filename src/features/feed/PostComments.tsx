import {
  LoaderCircle,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type {
  CreatePostCommentInput,
  Pagination,
  PaginationParams,
  PostComment,
  PostCommentListResponse,
  ResourceId,
} from '../../types/api'
import { formatPostDate, getInitials } from './feedFormatting'

const COMMENTS_PER_PAGE = 20
const MAX_COMMENT_LENGTH = 3_000
const MAX_RAW_DRAFT_UNITS = 16_384
const DELETE_LABEL_EXCERPT_LENGTH = 72
const RAW_DRAFT_TOO_LARGE_MESSAGE =
  'Bản nháp quá lớn để xử lý an toàn. Hãy rút gọn rồi thử lại.'

export interface PostCommentsProps {
  commentCount: number
  currentUserId: ResourceId
  hidden?: boolean
  id: string
  postId: ResourceId
  postTitle: string
  onListPostComments: (
    postId: ResourceId,
    params?: PaginationParams,
    signal?: AbortSignal,
  ) => Promise<PostCommentListResponse>
  onCreatePostComment: (
    postId: ResourceId,
    input: CreatePostCommentInput,
  ) => Promise<PostComment>
  onDeletePostComment: (
    postId: ResourceId,
    commentId: ResourceId,
  ) => Promise<void>
  onCommentCreated: (previousCount: number) => void
  onCommentDeleted: (previousCount: number) => void
}

function newestFirst(comments: PostComment[]) {
  return [...comments].sort((left, right) => {
    const leftTime = new Date(left.createdAt).getTime()
    const rightTime = new Date(right.createdAt).getTime()
    return (Number.isNaN(rightTime) ? 0 : rightTime) -
      (Number.isNaN(leftTime) ? 0 : leftTime)
  })
}

function mergeComments(
  current: PostComment[],
  incoming: PostComment[],
  replace: boolean,
) {
  const comments = replace ? [] : current
  return newestFirst(
    Array.from(
      new Map(
        [...comments, ...incoming].map((comment) => [
          comment.id,
          comment,
        ]),
      ).values(),
    ),
  )
}

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

function countCodePointsUpTo(value: string, maximum: number) {
  let count = 0

  for (const character of value) {
    if (character.length > 0) count += 1
    if (count >= maximum) return count
  }

  return count
}

function commentDeleteLabel(
  position: number,
  comment: PostComment,
) {
  const normalizedBody = comment.body.trim().replace(/\s+/gu, ' ')
  let excerpt = ''
  let length = 0
  let truncated = false

  for (const character of normalizedBody) {
    if (length >= DELETE_LABEL_EXCERPT_LENGTH) {
      truncated = true
      break
    }
    excerpt += character
    length += 1
  }

  const context = excerpt || 'không có nội dung'
  return `Xóa bình luận số ${position} của ${comment.author.displayName}: ${context}${truncated ? '…' : ''}`
}

function CommentAuthorAvatar({
  author,
}: {
  author: PostComment['author']
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const avatarUrl = author.avatarUrl?.trim() ?? ''

  useEffect(() => {
    setImageFailed(false)
  }, [author.id, avatarUrl])

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="size-8 shrink-0 rounded-full border border-stone-200 bg-stone-100 object-cover"
        decoding="async"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-stone-100 text-[0.65rem] font-bold text-stone-700 ring-1 ring-stone-200"
    >
      {getInitials(author.displayName)}
    </span>
  )
}

interface CommentItemProps {
  comment: PostComment
  position: number
  canDelete: boolean
  deleteDisabled: boolean
  deleteDialogOpen: boolean
  deleteError: string
  isDeleting: boolean
  onCancelDelete: () => void
  onConfirmDelete: () => void
  onOpenDelete: () => void
}

function CommentItem({
  comment,
  position,
  canDelete,
  deleteDisabled,
  deleteDialogOpen,
  deleteError,
  isDeleting,
  onCancelDelete,
  onConfirmDelete,
  onOpenDelete,
}: CommentItemProps) {
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const deleteDialogWasOpenRef = useRef(false)
  const cancelDeleteRef = useRef<HTMLButtonElement>(null)
  const confirmDeleteRef = useRef<HTMLButtonElement>(null)
  const deleteDialogRef = useRef<HTMLElement>(null)
  const deleteDialogId = `delete-comment-dialog-${comment.id}`
  const deleteTitleId = `delete-comment-title-${comment.id}`
  const deleteDescriptionId = `delete-comment-description-${comment.id}`

  useEffect(() => {
    if (deleteDialogWasOpenRef.current && !deleteDialogOpen) {
      deleteTriggerRef.current?.focus()
    }
    deleteDialogWasOpenRef.current = deleteDialogOpen
  }, [deleteDialogOpen])

  useLayoutEffect(() => {
    if (deleteDialogOpen && isDeleting) {
      deleteDialogRef.current?.focus()
    }
  }, [deleteDialogOpen, isDeleting])

  return (
    <li className="flex gap-3 border-b border-stone-100 py-3 last:border-0">
      <CommentAuthorAvatar author={comment.author} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-xs text-stone-500">
            <span className="font-semibold text-stone-900">
              {comment.author.displayName}
            </span>{' '}
            ·{' '}
            <time dateTime={comment.createdAt}>
              {formatPostDate(comment.createdAt)}
            </time>
          </p>
          {canDelete ? (
            <button
              type="button"
              aria-controls={deleteDialogId}
              aria-expanded={deleteDialogOpen}
              aria-haspopup="dialog"
              aria-label={commentDeleteLabel(position, comment)}
              className="grid size-5 shrink-0 place-items-center rounded-md text-stone-500 transition-colors hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={deleteDisabled}
              onClick={onOpenDelete}
              ref={deleteTriggerRef}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-stone-700">
          {comment.body}
        </p>
        {deleteDialogOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 p-4"
            onClick={(event) => {
              if (
                event.target === event.currentTarget &&
                !isDeleting
              ) {
                event.preventDefault()
                onCancelDelete()
              }
            }}
          >
            <section
              aria-describedby={deleteDescriptionId}
              aria-labelledby={deleteTitleId}
              aria-modal="true"
              className="w-full max-w-md rounded-lg border border-rose-200 bg-white p-4 shadow-xl outline-none focus:ring-2 focus:ring-orange-200"
              id={deleteDialogId}
              ref={deleteDialogRef}
              role="alertdialog"
              tabIndex={-1}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  if (!isDeleting) onCancelDelete()
                  return
                }

                if (event.key !== 'Tab') return
                if (isDeleting) {
                  event.preventDefault()
                  return
                }

                const activeElement =
                  event.currentTarget.ownerDocument.activeElement
                if (
                  event.shiftKey &&
                  (activeElement === cancelDeleteRef.current ||
                    activeElement === event.currentTarget)
                ) {
                  event.preventDefault()
                  confirmDeleteRef.current?.focus()
                } else if (
                  !event.shiftKey &&
                  (activeElement === confirmDeleteRef.current ||
                    activeElement === event.currentTarget)
                ) {
                  event.preventDefault()
                  cancelDeleteRef.current?.focus()
                }
              }}
            >
              <h4
                className="text-sm font-bold text-stone-950"
                id={deleteTitleId}
              >
                Xóa bình luận?
              </h4>
              <p
                className="mt-1 text-sm leading-6 text-stone-700"
                id={deleteDescriptionId}
              >
                Bình luận sẽ bị xóa khỏi bài viết và không thể hoàn
                tác.
              </p>
              {deleteError ? (
                <p
                  className="mt-2 text-sm font-medium text-rose-800"
                  role="alert"
                >
                  {deleteError}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  autoFocus
                  className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60"
                  disabled={isDeleting}
                  onClick={onCancelDelete}
                  ref={cancelDeleteRef}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  aria-busy={isDeleting}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-rose-700 px-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-70"
                  disabled={isDeleting}
                  onClick={onConfirmDelete}
                  ref={confirmDeleteRef}
                >
                  {isDeleting ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 motion-safe:animate-spin"
                    />
                  ) : (
                    <Trash2 aria-hidden="true" className="size-4" />
                  )}
                  {isDeleting ? 'Đang xóa…' : 'Xóa'}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </li>
  )
}

export function PostComments({
  commentCount,
  currentUserId,
  hidden = false,
  id,
  postId,
  postTitle,
  onListPostComments,
  onCreatePostComment,
  onDeletePostComment,
  onCommentCreated,
  onCommentDeleted,
}: PostCommentsProps) {
  const [comments, setComments] = useState<PostComment[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [failedPage, setFailedPage] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [rawDraftError, setRawDraftError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [deleteCandidateId, setDeleteCandidateId] =
    useState<ResourceId | null>(null)
  const [deletingCommentId, setDeletingCommentId] =
    useState<ResourceId | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [isRefreshingAfterDelete, setIsRefreshingAfterDelete] =
    useState(false)
  const [focusComposerAfterDelete, setFocusComposerAfterDelete] =
    useState(false)
  const requestControllerRef = useRef<AbortController | null>(null)
  const requestVersionRef = useRef(0)
  const listRequestActiveRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const isDeletingRef = useRef(false)
  const isComposingRef = useRef(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const deleteRefreshStatusRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  const loadPage = useCallback(
    async (page: number, replace: boolean) => {
      if (
        isSubmittingRef.current ||
        isDeletingRef.current ||
        (page > 1 && listRequestActiveRef.current)
      ) {
        return
      }

      const requestVersion = ++requestVersionRef.current
      requestControllerRef.current?.abort()
      const controller = new AbortController()
      requestControllerRef.current = controller
      listRequestActiveRef.current = true
      setLoadError('')
      setFailedPage(null)
      if (page === 1) setIsInitialLoading(true)
      else setIsLoadingMore(true)

      try {
        const response = await onListPostComments(
          postId,
          { page, pageSize: COMMENTS_PER_PAGE },
          controller.signal,
        )
        if (requestVersion !== requestVersionRef.current) return
        setComments((current) =>
          mergeComments(current, response.data, replace),
        )
        setPagination(response.pagination)
      } catch (error) {
        if (
          requestVersion !== requestVersionRef.current ||
          isAbortError(error)
        ) {
          return
        }
        setLoadError(
          'Chưa thể tải bình luận. Vui lòng kiểm tra kết nối và thử lại.',
        )
        setFailedPage(page)
      } finally {
        if (requestVersion === requestVersionRef.current) {
          listRequestActiveRef.current = false
          setIsInitialLoading(false)
          setIsLoadingMore(false)
        }
      }
    },
    [onListPostComments, postId],
  )

  useEffect(() => {
    void loadPage(1, true)
    return () => {
      requestVersionRef.current += 1
      listRequestActiveRef.current = false
      requestControllerRef.current?.abort()
    }
  }, [loadPage])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useLayoutEffect(() => {
    if (!focusComposerAfterDelete || hidden) return
    composerRef.current?.focus()
    setFocusComposerAfterDelete(false)
  }, [focusComposerAfterDelete, hidden])

  useLayoutEffect(() => {
    if (!isRefreshingAfterDelete || hidden) return
    deleteRefreshStatusRef.current?.focus()
  }, [hidden, isRefreshingAfterDelete])

  const submitComment = async () => {
    const body = draft.trim()
    const bodyLength = countCodePointsUpTo(
      body,
      MAX_COMMENT_LENGTH + 1,
    )
    if (
      !body ||
      bodyLength > MAX_COMMENT_LENGTH ||
      Boolean(rawDraftError) ||
      isSubmittingRef.current ||
      isDeletingRef.current ||
      listRequestActiveRef.current ||
      isSubmitting ||
      Boolean(deleteCandidateId) ||
      Boolean(deletingCommentId) ||
      isRefreshingAfterDelete ||
      isInitialLoading ||
      isLoadingMore
    ) {
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const created = await onCreatePostComment(postId, { body })
      setComments((current) => [
        created,
        ...current.filter((comment) => comment.id !== created.id),
      ])
      setDraft('')
      setPagination((current) => {
        if (!current) return current
        const totalItems = current.totalItems + 1
        return {
          ...current,
          totalItems,
          totalPages: Math.ceil(totalItems / current.pageSize),
        }
      })
      onCommentCreated(commentCount)
    } catch {
      setSubmitError(
        'Chưa thể đăng bình luận. Nội dung của bạn vẫn được giữ lại.',
      )
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const deleteComment = async (comment: PostComment) => {
    if (
      comment.author.id !== currentUserId ||
      isDeletingRef.current ||
      isSubmittingRef.current ||
      listRequestActiveRef.current
    ) {
      return
    }

    const previousCount = commentCount
    isDeletingRef.current = true
    setDeletingCommentId(comment.id)
    setDeleteError('')
    let deleted = false

    try {
      await onDeletePostComment(postId, comment.id)
      setComments((current) =>
        current.filter((item) => item.id !== comment.id),
      )
      setPagination((current) => {
        if (!current) return current
        const totalItems = Math.max(0, current.totalItems - 1)
        return {
          ...current,
          totalItems,
          totalPages:
            totalItems === 0
              ? 0
              : Math.ceil(totalItems / current.pageSize),
        }
      })
      onCommentDeleted(previousCount)
      setIsRefreshingAfterDelete(true)
      setDeleteCandidateId(null)
      deleted = true
    } catch {
      setDeleteError(
        'Chưa thể xóa bình luận. Bình luận vẫn được giữ lại.',
      )
    } finally {
      isDeletingRef.current = false
      setDeletingCommentId(null)
    }

    if (deleted && mountedRef.current) {
      await loadPage(1, true)
      if (mountedRef.current) {
        setIsRefreshingAfterDelete(false)
        setFocusComposerAfterDelete(true)
      }
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitComment()
  }

  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing ||
      isComposingRef.current
    ) {
      return
    }
    event.preventDefault()
    void submitComment()
  }

  const handleDraftChange = (value: string) => {
    if (value.length > MAX_RAW_DRAFT_UNITS) {
      setRawDraftError(RAW_DRAFT_TOO_LARGE_MESSAGE)
      return
    }

    setRawDraftError('')
    setDraft(value)
  }

  const handleComposerPaste = (
    event: ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const pastedText = event.clipboardData.getData('text')
    const selectionStart = event.currentTarget.selectionStart
    const selectionEnd = event.currentTarget.selectionEnd
    const nextLength =
      event.currentTarget.value.length -
      (selectionEnd - selectionStart) +
      pastedText.length

    if (
      pastedText.length > MAX_RAW_DRAFT_UNITS ||
      nextLength > MAX_RAW_DRAFT_UNITS
    ) {
      event.preventDefault()
      setRawDraftError(RAW_DRAFT_TOO_LARGE_MESSAGE)
    }
  }

  const hasMore = Boolean(
    pagination && pagination.page < pagination.totalPages,
  )
  const trimmedDraft = draft.trim()
  const draftLength = countCodePointsUpTo(
    trimmedDraft,
    MAX_COMMENT_LENGTH + 1,
  )
  const draftTooLong = draftLength > MAX_COMMENT_LENGTH
  const commentActionsLocked =
    isSubmitting ||
    isInitialLoading ||
    isLoadingMore ||
    isRefreshingAfterDelete ||
    Boolean(deleteCandidateId)
  const composerHelpId = `comment-composer-help-${postId}`
  const validationErrorId = `comment-validation-error-${postId}`
  const rawDraftErrorId = `comment-raw-draft-error-${postId}`
  const submitErrorId = `comment-submit-error-${postId}`
  const composerDescriptionIds = [
    composerHelpId,
    draftTooLong ? validationErrorId : '',
    rawDraftError ? rawDraftErrorId : '',
    submitError ? submitErrorId : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      id={id}
      aria-label={`Bình luận của tác phẩm ${postTitle}`}
      className="mt-4 border-t border-stone-200 pt-4"
      hidden={hidden}
    >
      {isRefreshingAfterDelete ? (
        <div
          aria-busy="true"
          aria-label="Đang cập nhật bình luận sau khi xóa"
          className="mb-3 flex min-h-11 items-center gap-2 rounded-md bg-orange-50 px-3 text-sm font-medium text-orange-900 outline-none focus:ring-2 focus:ring-orange-200"
          ref={deleteRefreshStatusRef}
          role="status"
          tabIndex={-1}
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-4 motion-safe:animate-spin"
          />
          Đang cập nhật bình luận sau khi xóa…
        </div>
      ) : null}

      {isInitialLoading ? (
        <div
          aria-busy="true"
          aria-label="Đang tải bình luận"
          className="flex min-h-20 items-center justify-center gap-2 text-sm text-stone-500"
          role="status"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-4 motion-safe:animate-spin"
          />
          Đang tải bình luận…
        </div>
      ) : comments.length > 0 ? (
        <ul aria-label="Danh sách bình luận">
          {comments.map((comment, index) => (
            <CommentItem
              canDelete={comment.author.id === currentUserId}
              comment={comment}
              deleteDialogOpen={deleteCandidateId === comment.id}
              deleteDisabled={commentActionsLocked}
              deleteError={
                deleteCandidateId === comment.id ? deleteError : ''
              }
              isDeleting={deletingCommentId === comment.id}
              key={comment.id}
              position={index + 1}
              onCancelDelete={() => {
                if (isDeletingRef.current) return
                setDeleteCandidateId(null)
                setDeleteError('')
              }}
              onConfirmDelete={() => void deleteComment(comment)}
              onOpenDelete={() => {
                if (commentActionsLocked) return
                setDeleteError('')
                setDeleteCandidateId(comment.id)
              }}
            />
          ))}
        </ul>
      ) : !loadError ? (
        <p
          aria-label="Chưa có bình luận"
          className="rounded-md bg-stone-50 px-3 py-4 text-center text-sm text-stone-600"
          role="status"
        >
          Chưa có bình luận. Hãy là người đầu tiên chia sẻ cảm nhận.
        </p>
      ) : null}

      {loadError ? (
        <div
          className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950"
          role="alert"
        >
          <p>{loadError}</p>
          <button
            type="button"
            className="mt-2 inline-flex min-h-10 items-center gap-2 font-semibold underline underline-offset-2"
            disabled={commentActionsLocked}
            onClick={() =>
              void loadPage(failedPage ?? 1, (failedPage ?? 1) === 1)
            }
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Thử tải lại bình luận
          </button>
        </div>
      ) : null}

      {hasMore && !loadError ? (
        <button
          type="button"
          aria-busy={isLoadingMore}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:border-orange-600 hover:bg-orange-50 hover:text-orange-800 disabled:cursor-wait disabled:opacity-60"
          disabled={commentActionsLocked}
          onClick={() => void loadPage((pagination?.page ?? 0) + 1, false)}
        >
          {isLoadingMore ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 motion-safe:animate-spin"
            />
          ) : null}
          {isLoadingMore ? 'Đang tải…' : 'Xem thêm bình luận'}
        </button>
      ) : null}

      <form className="mt-4" onSubmit={handleSubmit}>
        <label
          className="text-sm font-semibold text-stone-900"
          htmlFor={`comment-composer-${postId}`}
        >
          Viết bình luận
        </label>
        <textarea
          id={`comment-composer-${postId}`}
          aria-describedby={composerDescriptionIds}
          aria-errormessage={
            rawDraftError
              ? rawDraftErrorId
              : draftTooLong
                ? validationErrorId
                : undefined
          }
          aria-invalid={
            draftTooLong || Boolean(rawDraftError) || undefined
          }
          aria-label={`Viết bình luận cho ${postTitle}`}
          className="mt-2 min-h-24 w-full resize-y rounded-md border border-stone-300 bg-white px-3 py-2 text-sm leading-6 text-stone-900 outline-none placeholder:text-stone-400 focus:border-orange-600 focus:ring-2 focus:ring-orange-100 disabled:cursor-wait disabled:bg-stone-50"
          disabled={commentActionsLocked}
          placeholder="Chia sẻ cảm nhận hoặc lời góp ý tích cực…"
          ref={composerRef}
          value={draft}
          onChange={(event) => {
            if (event.target.value.length > MAX_RAW_DRAFT_UNITS) {
              event.target.value = draft
              setRawDraftError(RAW_DRAFT_TOO_LARGE_MESSAGE)
              return
            }
            handleDraftChange(event.target.value)
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false
          }}
          onCompositionStart={() => {
            isComposingRef.current = true
          }}
          onKeyDown={handleComposerKeyDown}
          onPaste={handleComposerPaste}
        />
        {rawDraftError ? (
          <p
            className="mt-2 text-sm text-rose-700"
            id={rawDraftErrorId}
            role="alert"
          >
            {rawDraftError}
          </p>
        ) : null}
        {draftTooLong ? (
          <p
            className="mt-2 text-sm text-rose-700"
            id={validationErrorId}
            role="alert"
          >
            Bình luận tối đa 3.000 ký tự sau khi bỏ khoảng trắng ở đầu
            và cuối.
          </p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-3">
          <span
            className="text-xs text-stone-500"
            id={composerHelpId}
          >
            Enter để đăng · Shift+Enter để xuống dòng · {draftLength}/3.000
          </span>
          <button
            type="submit"
            aria-busy={isSubmitting}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-orange-700 px-4 text-sm font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isSubmitting ||
              isInitialLoading ||
              isLoadingMore ||
              Boolean(deleteCandidateId) ||
              Boolean(deletingCommentId) ||
              Boolean(rawDraftError) ||
              !trimmedDraft ||
              draftTooLong
            }
          >
            {isSubmitting ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 motion-safe:animate-spin"
              />
            ) : (
              <Send aria-hidden="true" className="size-4" />
            )}
            {isSubmitting ? 'Đang đăng…' : 'Đăng bình luận'}
          </button>
        </div>
        {submitError ? (
          <p
            className="mt-2 text-sm text-rose-700"
            id={submitErrorId}
            role="alert"
          >
            {submitError}
          </p>
        ) : null}
      </form>
    </section>
  )
}
