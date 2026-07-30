import type {
  AssistantConversation,
  AssistantConversationListResponse,
  AssistantQuestionInput,
  AssistantResponse,
  CreateMessageInput,
  CreatePostCommentInput,
  CreatePostInput,
  DataResponse,
  DemoLoginInput,
  Message,
  MessageListParams,
  MessageListResponse,
  PaginationParams,
  Post,
  PostComment,
  PostCommentListResponse,
  PostListParams,
  PostListResponse,
  ReactionState,
  ResourceId,
  TopicListResponse,
  UpdateProfileInput,
  User,
  UserListResponse,
} from '../types/api'

const LOCAL_API_BASE_URL = 'http://127.0.0.1:3000/api/v1'

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || LOCAL_API_BASE_URL

export interface ApiErrorInit {
  status: number
  code: string
  message: string
  details?: unknown
  cause?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor({
    status,
    code,
    message,
    details = {},
    cause,
  }: ApiErrorInit) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface ApiClient {
  loginDemo(input: DemoLoginInput): Promise<User>
  listUsers(params?: PaginationParams): Promise<UserListResponse>
  updateProfile(
    userId: ResourceId,
    input: UpdateProfileInput,
  ): Promise<User>
  listTopics(params?: PaginationParams): Promise<TopicListResponse>
  listPosts(
    userId: ResourceId,
    params?: PostListParams,
  ): Promise<PostListResponse>
  createPost(userId: ResourceId, input: CreatePostInput): Promise<Post>
  listPostComments(
    userId: ResourceId,
    postId: ResourceId,
    params?: PaginationParams,
    signal?: AbortSignal,
  ): Promise<PostCommentListResponse>
  createPostComment(
    userId: ResourceId,
    postId: ResourceId,
    input: CreatePostCommentInput,
  ): Promise<PostComment>
  deletePostComment(
    userId: ResourceId,
    postId: ResourceId,
    commentId: ResourceId,
  ): Promise<void>
  deletePost(userId: ResourceId, postId: ResourceId): Promise<void>
  setPostReaction(
    userId: ResourceId,
    postId: ResourceId,
    reacted: boolean,
  ): Promise<ReactionState>
  listMessages(
    userId: ResourceId,
    params: MessageListParams,
    signal?: AbortSignal,
  ): Promise<MessageListResponse>
  sendMessage(
    userId: ResourceId,
    input: CreateMessageInput,
  ): Promise<Message>
  listAssistantConversations(
    userId: ResourceId,
    params?: PaginationParams,
  ): Promise<AssistantConversationListResponse>
  getAssistantConversation(
    userId: ResourceId,
    conversationId: ResourceId,
  ): Promise<AssistantConversation>
  askAssistant(
    userId: ResourceId,
    input: AssistantQuestionInput | string,
  ): Promise<AssistantResponse>
}

export interface ApiClientOptions {
  baseUrl?: string
  fetcher?: typeof fetch
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  userId?: ResourceId
  body?: unknown
  signal?: AbortSignal
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function apiErrorFromResponse(
  response: Response,
  payload: unknown,
): ApiError {
  if (isRecord(payload) && isRecord(payload.error)) {
    const { code, message, details } = payload.error

    if (typeof code === 'string' && typeof message === 'string') {
      return new ApiError({
        status: response.status,
        code,
        message,
        details,
      })
    }
  }

  return new ApiError({
    status: response.status,
    code: 'HTTP_ERROR',
    message:
      response.statusText ||
      `Yêu cầu đến máy chủ thất bại (${response.status})`,
    details: {},
  })
}

function queryString(
  params: Record<string, string | number | null | undefined>,
): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value))
    }
  }

  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export function createApiClient(
  options: ApiClientOptions = {},
): ApiClient {
  const baseUrl = (options.baseUrl?.trim() || API_BASE_URL).replace(/\/+$/, '')

  async function request<T>(
    path: string,
    {
      method = 'GET',
      userId,
      body,
      signal,
    }: RequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    if (userId !== undefined) {
      headers['X-User-ID'] = userId
    }

    const requestInit: RequestInit = {
      method,
      headers,
      signal,
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      requestInit.body = JSON.stringify(body)
    }

    let response: Response

    try {
      const fetcher = options.fetcher ?? globalThis.fetch
      response = await fetcher(`${baseUrl}${path}`, requestInit)
    } catch (cause) {
      throw new ApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Không thể kết nối đến máy chủ',
        details: {},
        cause,
      })
    }

    let payload: unknown

    try {
      const responseText = await response.text()
      payload = responseText ? JSON.parse(responseText) : undefined
    } catch (cause) {
      if (!response.ok) {
        throw apiErrorFromResponse(response, undefined)
      }

      throw new ApiError({
        status: response.status,
        code: 'INVALID_RESPONSE',
        message: 'Máy chủ trả về dữ liệu không hợp lệ',
        details: {},
        cause,
      })
    }

    if (!response.ok) {
      throw apiErrorFromResponse(response, payload)
    }

    return payload as T
  }

  return {
    async loginDemo(input) {
      const response = await request<DataResponse<User>>('/demo/sessions', {
        method: 'POST',
        body: input,
      })
      return response.data
    },

    listUsers(params = {}) {
      return request<UserListResponse>(
        `/users${queryString({
          page: params.page,
          pageSize: params.pageSize,
        })}`,
      )
    },

    listTopics(params = {}) {
      return request<TopicListResponse>(
        `/topics${queryString({
          page: params.page,
          pageSize: params.pageSize,
        })}`,
      )
    },

    listPosts(userId, params = {}) {
      return request<PostListResponse>(
        `/posts${queryString({
          page: params.page,
          pageSize: params.pageSize,
          topicId: params.topicId,
          authorId: params.authorId,
        })}`,
        { userId },
      )
    },

    async updateProfile(userId, input) {
      if (input.avatarFile) {
        throw new ApiError({
          status: 0,
          code: 'SUPABASE_STORAGE_REQUIRED',
          message:
            'Tải avatar từ file cần bật Supabase Storage. Vui lòng dùng backend Supabase.',
          details: {},
        })
      }
      const response = await request<DataResponse<User>>('/users/me', {
        method: 'PUT',
        userId,
        body: {
          username: input.username,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl ?? null,
        },
      })
      return response.data
    },

    async createPost(userId, input) {
      if (input.imageFile || (input.imageFiles?.length ?? 0) > 0) {
        throw new ApiError({
          status: 0,
          code: 'SUPABASE_STORAGE_REQUIRED',
          message:
            'Tải ảnh bài viết từ file cần bật backend Supabase Storage.',
          details: {},
        })
      }

      const response = await request<DataResponse<Post>>('/posts', {
        method: 'POST',
        userId,
        body: input,
      })
      return response.data
    },

    listPostComments(userId, postId, params = {}, signal) {
      return request<PostCommentListResponse>(
        `/posts/${postId}/comments${queryString({
          page: params.page,
          pageSize: params.pageSize,
        })}`,
        { userId, signal },
      )
    },

    async createPostComment(userId, postId, input) {
      const response = await request<DataResponse<PostComment>>(
        `/posts/${postId}/comments`,
        {
          method: 'POST',
          userId,
          body: { body: input.body },
        },
      )
      return response.data
    },

    async deletePostComment(userId, postId, commentId) {
      await request<void>(
        `/posts/${postId}/comments/${commentId}`,
        {
          method: 'DELETE',
          userId,
        },
      )
    },

    async deletePost(userId, postId) {
      await request<void>(`/posts/${postId}`, {
        method: 'DELETE',
        userId,
      })
    },

    async setPostReaction(userId, postId, reacted) {
      const response = await request<DataResponse<ReactionState>>(
        `/posts/${postId}/reaction`,
        {
          method: reacted ? 'PUT' : 'DELETE',
          userId,
        },
      )
      return response.data
    },

    listMessages(userId, params, signal) {
      return request<MessageListResponse>(
        `/messages${queryString({
          peerId: params.peerId,
          page: params.page,
          pageSize: params.pageSize,
        })}`,
        { userId, signal },
      )
    },

    async sendMessage(userId, input) {
      if (input.imageFile || input.imageUrl) {
        throw new ApiError({
          status: 0,
          code: 'SUPABASE_STORAGE_REQUIRED',
          message:
            'Gửi ảnh trong tin nhắn cần bật backend Supabase Storage.',
          details: {},
        })
      }

      const response = await request<DataResponse<Message>>('/messages', {
        method: 'POST',
        userId,
        body: {
          recipientId: input.recipientId,
          body: input.body ?? '',
        },
      })
      return response.data
    },

    listAssistantConversations(userId, params = {}) {
      return request<AssistantConversationListResponse>(
        `/assistant/conversations${queryString({
          page: params.page,
          pageSize: params.pageSize,
        })}`,
        { userId },
      )
    },

    async getAssistantConversation(userId, conversationId) {
      const response = await request<DataResponse<AssistantConversation>>(
        `/assistant/conversations/${conversationId}`,
        { userId },
      )
      return response.data
    },

    askAssistant(userId, input) {
      const question =
        typeof input === 'string' ? { question: input } : input

      return request<AssistantResponse>('/assistant/questions', {
        method: 'POST',
        userId,
        body: question,
      })
    },
  }
}

export const api = createApiClient()
export const apiClient = api
