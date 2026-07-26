import type {
  CreatePostCommentInput,
  CreatePostInput,
  PaginationParams,
  Post,
  PostComment,
  PostCommentListResponse,
  ResourceId,
  Topic,
} from '../../types/api'

export type FeedActionResult = void | Promise<unknown>
export type PostImageInputMode = 'upload' | 'url'

export interface FeedProps {
  posts: Post[]
  topics: Topic[]
  currentUserId: ResourceId
  selectedTopicId: ResourceId | null
  onTopicChange: (topicId: ResourceId | null) => void
  onCreatePost: (input: CreatePostInput) => FeedActionResult
  onDeletePost: (postId: ResourceId) => FeedActionResult
  onToggleReaction: (
    postId: ResourceId,
    reacted: boolean,
  ) => FeedActionResult
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
  isLoading?: boolean
  error?: string | null
  onRetry?: () => FeedActionResult
  isCreatingPost?: boolean
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => FeedActionResult
  imageInputMode?: PostImageInputMode
}

export interface PostCardProps {
  post: Post
  canDelete: boolean
  currentUserId: ResourceId
  onDeletePost: (postId: ResourceId) => FeedActionResult
  onToggleReaction: (
    postId: ResourceId,
    reacted: boolean,
  ) => FeedActionResult
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
}

export interface CreatePostDialogProps {
  open: boolean
  topics: Topic[]
  isSubmitting?: boolean
  imageInputMode?: PostImageInputMode
  onClose: () => void
  onSubmit: (input: CreatePostInput) => FeedActionResult
}
