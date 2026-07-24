import type { CreatePostInput, Post, Topic } from '../../types/api'

export type FeedActionResult = void | Promise<unknown>

export interface FeedProps {
  posts: Post[]
  topics: Topic[]
  selectedTopicId: number | null
  onTopicChange: (topicId: number | null) => void
  onCreatePost: (input: CreatePostInput) => FeedActionResult
  onToggleReaction: (postId: number, reacted: boolean) => FeedActionResult
  isLoading?: boolean
  error?: string | null
  onRetry?: () => FeedActionResult
  isCreatingPost?: boolean
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => FeedActionResult
}

export interface PostCardProps {
  post: Post
  onToggleReaction: (postId: number, reacted: boolean) => FeedActionResult
}

export interface CreatePostDialogProps {
  open: boolean
  topics: Topic[]
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (input: CreatePostInput) => FeedActionResult
}
