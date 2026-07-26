import { LoaderCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { CreatePostDialog } from './CreatePostDialog'
import {
  FeedEmptyState,
  FeedErrorState,
  FeedLoadingState,
} from './FeedStates'
import { PostCard } from './PostCard'
import { TopicFilter } from './TopicFilter'
import type { FeedProps } from './feedTypes'

export function Feed({
  posts,
  topics,
  currentUserId,
  selectedTopicId,
  onTopicChange,
  onCreatePost,
  onDeletePost,
  onToggleReaction,
  onListPostComments,
  onCreatePostComment,
  onDeletePostComment,
  isLoading = false,
  error = null,
  onRetry,
  isCreatingPost = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  imageInputMode = 'upload',
}: FeedProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const selectedTopic = topics.find(
    (topic) => topic.id === selectedTopicId,
  )

  return (
    <section
      aria-labelledby="feed-title"
      className="mx-auto w-full max-w-2xl"
    >
      <header className="mb-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-orange-700 uppercase">
              Phòng tranh hôm nay
            </p>
            <h2
              id="feed-title"
              className="mt-1 text-2xl font-bold tracking-tight text-stone-950"
            >
              Bảng tin nghệ thuật
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Khám phá bài thi vẽ mới nhất từ cộng đồng Artly.
            </p>
          </div>
          <button
            type="button"
            data-feed-create-trigger="true"
            onClick={() => setCreateDialogOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-orange-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-800 sm:px-4"
          >
            <Plus aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Đăng tác phẩm</span>
            <span className="sm:hidden">Đăng bài</span>
          </button>
        </div>

        <div className="mt-5 border-y border-stone-200 py-3">
          <TopicFilter
            topics={topics}
            selectedTopicId={selectedTopicId}
            onChange={onTopicChange}
          />
        </div>
      </header>

      {isLoading ? (
        <FeedLoadingState />
      ) : error && posts.length === 0 ? (
        <FeedErrorState
          message={error}
          onRetry={onRetry ? () => void onRetry() : undefined}
        />
      ) : posts.length === 0 ? (
        <FeedEmptyState
          topicName={selectedTopic?.name}
          onCreate={() => setCreateDialogOpen(true)}
        />
      ) : (
        <>
          {error ? (
            <div
              role="alert"
              className="mb-5 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              <p>{error}</p>
              {onRetry ? (
                <button
                  type="button"
                  className="mt-2 font-bold text-amber-950 underline underline-offset-2"
                  onClick={() => void onRetry()}
                >
                  Tải lại bảng tin
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-5">
            {posts.map((post) => (
              <PostCard
                canDelete={post.author.id === currentUserId}
                currentUserId={currentUserId}
                key={`${currentUserId}:${post.id}`}
                post={post}
                onCreatePostComment={onCreatePostComment}
                onDeletePostComment={onDeletePostComment}
                onDeletePost={onDeletePost}
                onListPostComments={onListPostComments}
                onToggleReaction={onToggleReaction}
              />
            ))}
          </div>

          {hasMore && onLoadMore ? (
            <div className="mt-6 text-center">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={() => void onLoadMore()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-500 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 transition-colors hover:border-orange-700 hover:bg-orange-50 hover:text-orange-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoadingMore ? (
                  <>
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 motion-safe:animate-spin motion-reduce:animate-none"
                    />
                    Đang tải…
                  </>
                ) : (
                  'Xem thêm tác phẩm'
                )}
              </button>
            </div>
          ) : null}
        </>
      )}

      <CreatePostDialog
        imageInputMode={imageInputMode}
        open={createDialogOpen}
        topics={topics}
        isSubmitting={isCreatingPost}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={onCreatePost}
      />
    </section>
  )
}
