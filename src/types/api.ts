export type ResourceId = number

export type UserRole = 'STUDENT' | 'TEACHER'

export interface User {
  id: ResourceId
  username: string
  displayName: string
  role: UserRole
  avatarUrl?: string | null
}

export interface Topic {
  id: ResourceId
  slug: string
  name: string
  aliases?: string[]
}

export interface Pagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export interface Post {
  id: ResourceId
  title: string
  caption: string
  imageUrl: string
  examName?: string
  author: User
  topics: Topic[]
  reactionCount: number
  viewerHasReacted: boolean
  createdAt: string
}

export interface PostListParams extends PaginationParams {
  topicId?: ResourceId
}

export interface CreatePostInput {
  title: string
  caption: string
  imageUrl: string
  examName?: string
  topicIds: ResourceId[]
}

export interface ReactionState {
  reactionCount: number
  viewerHasReacted: boolean
}

export interface Message {
  id: ResourceId
  sender: User
  receiver: User
  body: string
  createdAt: string
}

export interface MessageListParams extends PaginationParams {
  peerId: ResourceId
}

export interface CreateMessageInput {
  recipientId: ResourceId
  body: string
}

export type AssistantStatus = 'ANSWERED' | 'NEEDS_CLARIFICATION'

export type AssistantIntent = 'COUNT_POSTS_BY_TOPIC' | 'UNKNOWN'

export type AssistantProvider = 'LOCAL' | 'OPENAI'

export interface AssistantQuestionInput {
  question: string
}

export interface AssistantCountResult {
  count: number
  topic: Topic
}

export interface AssistantResponse {
  status: AssistantStatus
  intent: AssistantIntent
  answer: string
  provider: AssistantProvider
  result?: AssistantCountResult
}

export interface ApiErrorPayload {
  error: {
    code: string
    message: string
    details: unknown
  }
}

export type UserListResponse = PaginatedResponse<User>
export type TopicListResponse = PaginatedResponse<Topic>
export type PostListResponse = PaginatedResponse<Post>
export type MessageListResponse = PaginatedResponse<Message>

export interface DataResponse<T> {
  data: T
}

export type CreatePostRequest = CreatePostInput
export type CreateMessageRequest = CreateMessageInput
export type AssistantQuestionRequest = AssistantQuestionInput
