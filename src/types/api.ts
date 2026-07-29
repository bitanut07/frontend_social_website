export type ResourceId = `${string}-${string}-${string}-${string}-${string}`

const RESOURCE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const NIL_RESOURCE_ID = '00000000-0000-0000-0000-000000000000'

export function isResourceId(value: unknown): value is ResourceId {
  return (
    typeof value === 'string' &&
    RESOURCE_ID_PATTERN.test(value.trim()) &&
    value.trim() !== NIL_RESOURCE_ID
  )
}

export function parseResourceId(value: unknown, field = 'id'): ResourceId {
  if (!isResourceId(value)) {
    throw new Error(`${field} phải là UUID hợp lệ`)
  }

  return value.trim().toLowerCase() as ResourceId
}

export function createResourceId(): ResourceId {
  return parseResourceId(crypto.randomUUID())
}

export type UserRole = 'STUDENT' | 'TEACHER'

export interface User {
  id: ResourceId
  username: string
  displayName: string
  role: UserRole
  avatarUrl?: string | null
  isSuperAdmin: boolean
}

export interface UpdateProfileInput {
  username: string
  displayName: string
  avatarUrl?: string | null
  avatarFile?: File
}

export interface DemoLoginInput {
  username: string
  password: string
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
  commentCount: number
  viewerHasReacted: boolean
  createdAt: string
}

export interface PostComment {
  id: ResourceId
  postId: ResourceId
  author: User
  body: string
  createdAt: string
}

export interface PostListParams extends PaginationParams {
  topicId?: ResourceId
  authorId?: ResourceId
}

export interface CreatePostInput {
  title: string
  caption: string
  imageFile?: File
  imageUrl?: string
  examName?: string
  topicIds: ResourceId[]
}

export interface CreatePostCommentInput {
  body: string
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
  attachments?: MessageAttachment[]
  createdAt: string
}

export type MessageAttachmentKind = 'IMAGE'

export interface MessageAttachment {
  id: ResourceId
  kind: MessageAttachmentKind
  url: string
  mimeType?: string | null
  originalFileName?: string | null
  sizeBytes?: number | null
  width?: number | null
  height?: number | null
}

export interface MessageListParams extends PaginationParams {
  peerId: ResourceId
}

export interface CreateMessageInput {
  recipientId: ResourceId
  body?: string
  imageFile?: File
  imageUrl?: string
}

export type AssistantStatus = 'ANSWERED' | 'NEEDS_CLARIFICATION'

export type AssistantIntent =
  | 'COUNT_POSTS_BY_TOPIC'
  | 'APP_SERVICE_HELP'
  | 'CHAT'
  | 'UNKNOWN'

export type AssistantProvider = 'LOCAL' | 'OPENAI' | 'MODEL_LLM'

export type AssistantAppService =
  | 'GENERAL'
  | 'ACCOUNT'
  | 'FEED'
  | 'POSTS'
  | 'REACTIONS'
  | 'MESSAGES'
  | 'PROFILE'
  | 'ASSISTANT'

export type AssistantConversationRole = 'USER' | 'ASSISTANT'

export interface AssistantConversationMessage {
  role: AssistantConversationRole
  content: string
}

export interface AssistantQuestionInput {
  question: string
  conversationId?: ResourceId
  history?: AssistantConversationMessage[]
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
  appService?: AssistantAppService
  result?: AssistantCountResult
  conversation?: AssistantConversationSummary
}

export interface AssistantConversationSummary {
  id: ResourceId
  title: string
  createdAt: string
  updatedAt: string
}

export interface AssistantStoredMessage {
  id: ResourceId
  role: AssistantConversationRole
  content: string
  createdAt: string
  response?: AssistantResponse
}

export interface AssistantConversation
  extends AssistantConversationSummary {
  messages: AssistantStoredMessage[]
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
export type PostCommentListResponse = PaginatedResponse<PostComment>
export type MessageListResponse = PaginatedResponse<Message>
export type AssistantConversationListResponse =
  PaginatedResponse<AssistantConversationSummary>

export interface DataResponse<T> {
  data: T
}

export type CreatePostRequest = CreatePostInput
export type UpdateProfileRequest = UpdateProfileInput
export type DemoLoginRequest = DemoLoginInput
export type CreateMessageRequest = CreateMessageInput
export type AssistantQuestionRequest = AssistantQuestionInput
