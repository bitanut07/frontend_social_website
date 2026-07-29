import {
  Bell,
  Bot,
  GraduationCap,
  Home,
  MessageCircle,
  Palette,
  UserRound,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  AssistantPanel,
  type AssistantChatMessage,
} from './features/assistant'
import { AuthGate, DemoAuthGate } from './features/auth'
import { ChatModal } from './features/chat'
import { Feed } from './features/feed'
import {
  EditProfileDialog,
  ProfileMenu,
  ProfilePage,
} from './features/profile'
import { api, type ApiClient } from './lib/api'
import { createAssistantAwareApi } from './lib/assistantAwareApi'
import { shouldUseSupabaseBackend } from './lib/dataBackend'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import {
  subscribeToDirectMessages,
  subscribeToNotifications,
  supabaseApi,
  unreadNotificationCount,
} from './lib/supabaseApi'
import {
  createResourceId,
  parseResourceId,
  type AssistantConversationSummary,
  type AssistantConversationMessage,
  type CreatePostCommentInput,
  type CreatePostInput,
  type Message,
  type Pagination,
  type PaginationParams,
  type Post,
  type ResourceId,
  type Topic,
  type UpdateProfileInput,
  type User,
} from './types/api'

const POSTS_PER_PAGE = 10
const PROFILE_POSTS_PER_PAGE = 30
const MESSAGES_PER_PAGE = 50
const MESSAGE_POLL_INTERVAL = 5_000
const MESSAGE_REQUEST_TIMEOUT = 10_000
const CHAT_READ_MESSAGE_PREFIX = 'artly.chatReadMessage'
const DEFAULT_USER_ID: ResourceId =
  '00000000-0000-4000-8000-000000000001'
const USE_SUPABASE = shouldUseSupabaseBackend({
  mode: import.meta.env.MODE,
  requestedBackend: import.meta.env.VITE_DATA_BACKEND,
  supabaseConfigured: isSupabaseConfigured,
})
const SUPABASE_WITH_MODEL_ASSISTANT = createAssistantAwareApi(
  supabaseApi,
  api,
)

type ActiveView = 'feed' | 'profile'

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function uniquePosts(posts: Post[]) {
  return Array.from(new Map(posts.map((post) => [post.id, post])).values())
}

function messageBelongsToConversation(
  message: Message,
  currentUserId: ResourceId,
  peerId: ResourceId,
) {
  return (
    (message.sender.id === currentUserId &&
      message.receiver.id === peerId) ||
    (message.sender.id === peerId &&
      message.receiver.id === currentUserId)
  )
}

function latestConversationMessage(
  messages: Message[],
  currentUserId: ResourceId,
  peerId: ResourceId,
) {
  return messages
    .filter((message) =>
      messageBelongsToConversation(message, currentUserId, peerId),
    )
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )[0]
}

function chatReadMessageKey(userId: ResourceId, peerId: ResourceId) {
  return `${CHAT_READ_MESSAGE_PREFIX}.${userId}.${peerId}`
}

async function runSerializedPostCommentMutation<T>(
  barriers: Map<ResourceId, Promise<void>>,
  postId: ResourceId,
  operation: () => Promise<T>,
) {
  const previousBarrier = barriers.get(postId) ?? Promise.resolve()
  const operationPromise = previousBarrier.then(operation)
  const barrier = operationPromise.then(
    () => undefined,
    () => undefined,
  )
  barriers.set(postId, barrier)

  try {
    return await operationPromise
  } finally {
    if (barriers.get(postId) === barrier) barriers.delete(postId)
  }
}

async function waitForPostCommentMutations(
  barriers: Map<ResourceId, Promise<void>>,
  postId: ResourceId,
  signal?: AbortSignal,
) {
  while (true) {
    if (signal?.aborted) {
      const error = new Error('Request aborted')
      error.name = 'AbortError'
      throw error
    }

    const barrier = barriers.get(postId)
    if (!barrier) return
    await barrier
  }
}

function assistantHistoryFromMessages(
  messages: AssistantChatMessage[],
): AssistantConversationMessage[] {
  const completed: AssistantConversationMessage[] = []
  let pendingUser: AssistantChatMessage | null = null

  for (const message of messages) {
    if (message.role === 'USER') {
      pendingUser = message
      continue
    }
    if (!pendingUser) continue

    completed.push(
      { role: 'USER', content: pendingUser.content },
      { role: 'ASSISTANT', content: message.content },
    )
    pendingUser = null
  }

  return completed.slice(-8)
}

function AppMark() {
  return (
    <span
      aria-hidden="true"
      className="artly-mark grid size-10 shrink-0 place-items-center bg-orange-700 text-lg font-black text-white"
    >
      A
    </span>
  )
}

interface ArtlyWorkspaceProps {
  authenticatedUserId?: ResourceId
  dataApi: ApiClient
  storageUploadsEnabled: boolean
  onSignOut?: () => Promise<void>
}

function ArtlyWorkspace({
  authenticatedUserId,
  dataApi,
  storageUploadsEnabled,
  onSignOut,
}: ArtlyWorkspaceProps) {
  const feedGenerationRef = useRef(0)
  const profileGenerationRef = useRef(0)
  const postCommentMutationBarriersRef = useRef(
    new Map<ResourceId, Promise<void>>(),
  )
  const messageRequestVersion = useRef(0)
  const messageRequestsInFlightRef = useRef(
    new Map<string, AbortController>(),
  )
  const messageSendVersionRef = useRef(0)
  const assistantRequestVersionRef = useRef(0)
  const assistantHistoryRequestVersionRef = useRef(0)
  const assistantConversationRequestVersionRef = useRef(0)
  const [activeView, setActiveView] = useState<ActiveView>('feed')
  const [users, setUsers] = useState<User[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedUserId, setSelectedUserId] =
    useState<ResourceId>(authenticatedUserId ?? DEFAULT_USER_ID)
  const [notificationCount, setNotificationCount] = useState(0)
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const [directoryReload, setDirectoryReload] = useState(0)

  const [selectedTopicId, setSelectedTopicId] =
    useState<ResourceId | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [postPagination, setPostPagination] = useState<Pagination | null>(null)
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedLoadingMore, setFeedLoadingMore] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [feedReload, setFeedReload] = useState(0)
  const [creatingPost, setCreatingPost] = useState(false)
  const [profilePosts, setProfilePosts] = useState<Post[]>([])
  const [profilePagination, setProfilePagination] =
    useState<Pagination | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileLoadingMore, setProfileLoadingMore] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileReload, setProfileReload] = useState(0)
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveError, setProfileSaveError] =
    useState<string | null>(null)

  const [selectedPeerId, setSelectedPeerId] =
    useState<ResourceId | null>(null)
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationPreviews, setConversationPreviews] = useState<
    Message[]
  >([])
  const [readMessageIds, setReadMessageIds] = useState<Set<ResourceId>>(
    () => new Set(),
  )
  const [messageDraft, setMessageDraft] = useState('')
  const [messageImageFile, setMessageImageFile] = useState<File | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageSending, setMessageSending] = useState(false)
  const [messagesLoadError, setMessagesLoadError] =
    useState<string | null>(null)
  const [messageSendError, setMessageSendError] =
    useState<string | null>(null)
  const [messagesReload, setMessagesReload] = useState(0)

  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantQuestion, setAssistantQuestion] = useState('')
  const [assistantMessages, setAssistantMessages] = useState<
    AssistantChatMessage[]
  >([])
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantError, setAssistantError] = useState<string | null>(null)
  const [assistantConversations, setAssistantConversations] = useState<
    AssistantConversationSummary[]
  >([])
  const [assistantConversationId, setAssistantConversationId] =
    useState<ResourceId | null>(null)
  const [assistantHistoryLoading, setAssistantHistoryLoading] =
    useState(false)
  const [assistantHistoryError, setAssistantHistoryError] =
    useState<string | null>(null)
  const [assistantHistoryReload, setAssistantHistoryReload] = useState(0)
  const [assistantConversationLoading, setAssistantConversationLoading] =
    useState(false)
  const selectedUserIdRef = useRef(selectedUserId)
  const selectedPeerIdRef = useRef(selectedPeerId)
  const selectedTopicIdRef = useRef(selectedTopicId)

  selectedUserIdRef.current = selectedUserId
  selectedPeerIdRef.current = selectedPeerId
  selectedTopicIdRef.current = selectedTopicId

  const currentUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  )
  const peers = useMemo(
    () => users.filter((user) => user.id !== selectedUserId),
    [selectedUserId, users],
  )

  useEffect(() => {
    const storedMessageIds = new Set<ResourceId>()
    for (const peer of peers) {
      const stored = window.localStorage.getItem(
        chatReadMessageKey(selectedUserId, peer.id),
      )
      if (!stored) continue
      try {
        storedMessageIds.add(parseResourceId(stored))
      } catch {
        window.localStorage.removeItem(
          chatReadMessageKey(selectedUserId, peer.id),
        )
      }
    }
    setReadMessageIds(storedMessageIds)
  }, [peers, selectedUserId])

  const markConversationRead = useCallback(
    (peerId: ResourceId, messageId: ResourceId) => {
      window.localStorage.setItem(
        chatReadMessageKey(selectedUserId, peerId),
        messageId,
      )
      setReadMessageIds((current) => {
        if (current.has(messageId)) return current
        const next = new Set(current)
        next.add(messageId)
        return next
      })
    },
    [selectedUserId],
  )

  useEffect(() => {
    let active = true

    setDirectoryLoading(true)
    setDirectoryError(null)

    Promise.all([
      dataApi.listUsers({ page: 1, pageSize: 20 }),
      dataApi.listTopics({ page: 1, pageSize: 50 }),
    ])
      .then(([userResult, topicResult]) => {
        if (!active) return

        setUsers(userResult.data)
        setTopics(topicResult.data)
        setSelectedUserId((currentId) => {
          if (authenticatedUserId) return authenticatedUserId
          return userResult.data.some((user) => user.id === currentId)
            ? currentId
            : (userResult.data[0]?.id ?? currentId)
        })
      })
      .catch((error: unknown) => {
        if (!active) return
        setDirectoryError(
          errorMessage(
            error,
            'Chưa thể tải tài khoản và chủ đề từ máy chủ.',
          ),
        )
      })
      .finally(() => {
        if (active) setDirectoryLoading(false)
      })

    return () => {
      active = false
    }
  }, [authenticatedUserId, dataApi, directoryReload])

  useEffect(() => {
    if (!authenticatedUserId || !USE_SUPABASE) return
    let active = true
    const refreshCount = () => {
      void unreadNotificationCount(authenticatedUserId)
        .then((count) => {
          if (active) setNotificationCount(count)
        })
        .catch(() => {
          if (active) setNotificationCount(0)
        })
    }
    refreshCount()
    const channel = subscribeToNotifications(
      authenticatedUserId,
      refreshCount,
    )

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [authenticatedUserId])

  useEffect(() => {
    if (peers.length === 0) {
      setSelectedPeerId(null)
      return
    }

    setSelectedPeerId((currentId) =>
      peers.some((peer) => peer.id === currentId) ? currentId : null,
    )
  }, [peers])

  useEffect(() => {
    if (!assistantOpen || !currentUser) return

    let active = true
    const requestVersion = ++assistantHistoryRequestVersionRef.current
    const requestUserId = selectedUserId
    setAssistantHistoryLoading(true)
    setAssistantHistoryError(null)

    dataApi
      .listAssistantConversations(requestUserId, {
        page: 1,
        pageSize: 30,
      })
      .then((result) => {
        if (
          !active ||
          requestVersion !== assistantHistoryRequestVersionRef.current ||
          requestUserId !== selectedUserIdRef.current
        ) {
          return
        }
        setAssistantConversations(result.data)
      })
      .catch((error: unknown) => {
        if (
          !active ||
          requestVersion !== assistantHistoryRequestVersionRef.current ||
          requestUserId !== selectedUserIdRef.current
        ) {
          return
        }
        setAssistantHistoryError(
          errorMessage(
            error,
            'Chưa thể tải lịch sử chat. Vui lòng thử lại.',
          ),
        )
      })
      .finally(() => {
        if (
          active &&
          requestVersion === assistantHistoryRequestVersionRef.current
        ) {
          setAssistantHistoryLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [
    assistantHistoryReload,
    assistantOpen,
    currentUser,
    dataApi,
    selectedUserId,
  ])

  useEffect(() => {
    if (directoryLoading) return
    if (!currentUser) {
      setFeedLoading(false)
      setFeedLoadingMore(false)
      setPosts([])
      setPostPagination(null)
      setFeedError('Vui lòng chọn một tài khoản mẫu')
      return
    }

    let active = true
    const requestGeneration = ++feedGenerationRef.current
    const params = {
      page: 1,
      pageSize: POSTS_PER_PAGE,
      ...(selectedTopicId ? { topicId: selectedTopicId } : {}),
    }

    setFeedLoading(true)
    setFeedLoadingMore(false)
    setFeedError(null)

    dataApi
      .listPosts(selectedUserId, params)
      .then((result) => {
        if (
          !active ||
          requestGeneration !== feedGenerationRef.current
        ) {
          return
        }
        setPosts(result.data)
        setPostPagination(result.pagination)
      })
      .catch((error: unknown) => {
        if (
          !active ||
          requestGeneration !== feedGenerationRef.current
        ) {
          return
        }
        setPosts([])
        setFeedError(
          errorMessage(error, 'Chưa thể tải bảng tin. Vui lòng thử lại.'),
        )
      })
      .finally(() => {
        if (
          active &&
          requestGeneration === feedGenerationRef.current
        ) {
          setFeedLoading(false)
        }
      })

    return () => {
      active = false
      if (feedGenerationRef.current === requestGeneration) {
        feedGenerationRef.current += 1
      }
    }
  }, [
    currentUser,
    dataApi,
    directoryLoading,
    feedReload,
    selectedTopicId,
    selectedUserId,
  ])

  useEffect(() => {
    if (activeView !== 'profile') return
    if (directoryLoading) return
    if (!currentUser) {
      setProfileLoading(false)
      setProfileLoadingMore(false)
      setProfilePosts([])
      setProfilePagination(null)
      setProfileError('Vui lòng chọn một tài khoản mẫu')
      return
    }

    let active = true
    const requestGeneration = ++profileGenerationRef.current
    const requestUserId = selectedUserId

    setProfileLoading(true)
    setProfileLoadingMore(false)
    setProfileError(null)

    dataApi
      .listPosts(requestUserId, {
        page: 1,
        pageSize: PROFILE_POSTS_PER_PAGE,
        authorId: requestUserId,
      })
      .then((result) => {
        if (
          !active ||
          requestGeneration !== profileGenerationRef.current ||
          requestUserId !== selectedUserIdRef.current
        ) {
          return
        }
        setProfilePosts(result.data)
        setProfilePagination(result.pagination)
      })
      .catch((error: unknown) => {
        if (
          !active ||
          requestGeneration !== profileGenerationRef.current ||
          requestUserId !== selectedUserIdRef.current
        ) {
          return
        }
        setProfilePosts([])
        setProfileError(
          errorMessage(
            error,
            'Chưa thể tải profile. Vui lòng thử lại.',
          ),
        )
      })
      .finally(() => {
        if (
          active &&
          requestGeneration === profileGenerationRef.current
        ) {
          setProfileLoading(false)
        }
      })

    return () => {
      active = false
      if (profileGenerationRef.current === requestGeneration) {
        profileGenerationRef.current += 1
      }
    }
  }, [
    activeView,
    currentUser,
    dataApi,
    directoryLoading,
    profileReload,
    selectedUserId,
  ])

  function resetMessageComposer() {
    messageSendVersionRef.current += 1
    setMessageSending(false)
    setMessageDraft('')
    setMessageImageFile(null)
    setMessageSendError(null)
  }

  function openMessagesList() {
    selectedPeerIdRef.current = null
    setChatModalOpen(true)
    setSelectedPeerId(null)
    setMessagesLoadError(null)
    resetMessageComposer()
  }

  function closeChatModal() {
    setChatModalOpen(false)
    setMessagesLoadError(null)
    resetMessageComposer()
  }

  function handleSelectPeer(peerId: ResourceId) {
    const latestMessage = latestConversationMessage(
      conversationPreviews,
      selectedUserId,
      peerId,
    )
    if (latestMessage?.receiver.id === selectedUserId) {
      markConversationRead(peerId, latestMessage.id)
    }
    selectedPeerIdRef.current = peerId
    setChatModalOpen(true)
    setSelectedPeerId(peerId)
    setMessages([])
    setMessagesLoadError(null)
    resetMessageComposer()
  }

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!selectedPeerId) return

      const requestKey = `${selectedUserId}:${selectedPeerId}`
      if (messageRequestsInFlightRef.current.has(requestKey)) return

      const abortController = new AbortController()
      messageRequestsInFlightRef.current.set(requestKey, abortController)
      const requestVersion = ++messageRequestVersion.current
      const requestUserId = selectedUserId
      const requestPeerId = selectedPeerId
      let timedOut = false
      const timeoutId = window.setTimeout(() => {
        timedOut = true
        abortController.abort()
        if (
          messageRequestsInFlightRef.current.get(requestKey) ===
          abortController
        ) {
          messageRequestsInFlightRef.current.delete(requestKey)
        }
        if (
          requestVersion === messageRequestVersion.current &&
          requestUserId === selectedUserIdRef.current &&
          requestPeerId === selectedPeerIdRef.current
        ) {
          setMessagesLoading(false)
          if (!silent) {
            setMessagesLoadError(
              'Máy chủ phản hồi quá lâu. Vui lòng thử lại.',
            )
          }
        }
      }, MESSAGE_REQUEST_TIMEOUT)
      if (!silent) {
        setMessagesLoading(true)
        setMessagesLoadError(null)
      }

      try {
        const result = await dataApi.listMessages(
          requestUserId,
          {
            peerId: requestPeerId,
            page: 1,
            pageSize: MESSAGES_PER_PAGE,
          },
          abortController.signal,
        )
        if (
          timedOut ||
          requestVersion !== messageRequestVersion.current ||
          requestUserId !== selectedUserIdRef.current ||
          requestPeerId !== selectedPeerIdRef.current
        ) {
          return
        }
        setMessages(result.data)
        const latestMessage = latestConversationMessage(
          result.data,
          requestUserId,
          requestPeerId,
        )
        if (latestMessage) {
          setConversationPreviews((current) => [
            latestMessage,
            ...current.filter(
              (message) =>
                !messageBelongsToConversation(
                  message,
                  requestUserId,
                  requestPeerId,
                ),
            ),
          ])
          if (latestMessage.receiver.id === requestUserId) {
            markConversationRead(requestPeerId, latestMessage.id)
          }
        }
        setMessagesLoadError(null)
      } catch (error) {
        if (timedOut) return
        if (
          !silent &&
          requestVersion === messageRequestVersion.current &&
          requestUserId === selectedUserIdRef.current &&
          requestPeerId === selectedPeerIdRef.current
        ) {
          setMessagesLoadError(
            errorMessage(
              error,
              'Chưa thể tải cuộc trò chuyện. Vui lòng thử lại.',
            ),
          )
        }
      } finally {
        window.clearTimeout(timeoutId)
        if (
          messageRequestsInFlightRef.current.get(requestKey) ===
          abortController
        ) {
          messageRequestsInFlightRef.current.delete(requestKey)
        }
        if (
          requestVersion === messageRequestVersion.current &&
          requestUserId === selectedUserIdRef.current &&
          requestPeerId === selectedPeerIdRef.current
        ) {
          setMessagesLoading(false)
        }
      }
    },
    [dataApi, markConversationRead, selectedPeerId, selectedUserId],
  )

  useEffect(() => {
    if (!chatModalOpen || selectedPeerId || peers.length === 0) return

    const abortController = new AbortController()
    const requestUserId = selectedUserId

    async function refreshConversationPreviews() {
      const results = await Promise.allSettled(
        peers.map((peer) =>
          dataApi.listMessages(
            requestUserId,
            { peerId: peer.id, page: 1, pageSize: 1 },
            abortController.signal,
          ),
        ),
      )
      if (
        abortController.signal.aborted ||
        requestUserId !== selectedUserIdRef.current
      ) {
        return
      }

      setConversationPreviews(
        results.flatMap((result) =>
          result.status === 'fulfilled' ? result.value.data.slice(0, 1) : [],
        ),
      )
    }

    void refreshConversationPreviews()
    const interval = window.setInterval(
      () => void refreshConversationPreviews(),
      MESSAGE_POLL_INTERVAL,
    )

    return () => {
      abortController.abort()
      window.clearInterval(interval)
    }
  }, [chatModalOpen, dataApi, peers, selectedPeerId, selectedUserId])

  useEffect(() => {
    if (!chatModalOpen || !selectedPeerId) return

    const requestsInFlight = messageRequestsInFlightRef.current
    void loadMessages()
    let cancelled = false
    let realtimeChannel: Awaited<
      ReturnType<typeof subscribeToDirectMessages>
    > | null = null
    const interval = USE_SUPABASE
      ? null
      : window.setInterval(
          () => void loadMessages(true),
          MESSAGE_POLL_INTERVAL,
        )

    if (USE_SUPABASE) {
      void subscribeToDirectMessages(selectedPeerId, () => {
        void loadMessages(true)
      }).then((channel) => {
        if (cancelled) {
          void supabase.removeChannel(channel)
          return
        }
        realtimeChannel = channel
      })
    }

    return () => {
      cancelled = true
      if (interval !== null) window.clearInterval(interval)
      if (realtimeChannel) void supabase.removeChannel(realtimeChannel)
      messageRequestVersion.current += 1
      for (const request of requestsInFlight.values()) {
        request.abort()
      }
      requestsInFlight.clear()
    }
  }, [chatModalOpen, loadMessages, messagesReload, selectedPeerId])

  async function handleLoadMore() {
    if (
      !postPagination ||
      postPagination.page >= postPagination.totalPages ||
      feedLoadingMore
    ) {
      return
    }

    setFeedLoadingMore(true)
    setFeedError(null)

    const requestGeneration = feedGenerationRef.current
    const requestUserId = selectedUserId
    const requestTopicId = selectedTopicId

    try {
      const nextPage = postPagination.page + 1
      const result = await dataApi.listPosts(requestUserId, {
        page: nextPage,
        pageSize: POSTS_PER_PAGE,
        ...(requestTopicId ? { topicId: requestTopicId } : {}),
      })
      if (
        requestGeneration !== feedGenerationRef.current ||
        requestUserId !== selectedUserIdRef.current ||
        requestTopicId !== selectedTopicIdRef.current
      ) {
        return
      }
      setPosts((current) => uniquePosts([...current, ...result.data]))
      setPostPagination(result.pagination)
    } catch (error) {
      if (
        requestGeneration !== feedGenerationRef.current ||
        requestUserId !== selectedUserIdRef.current ||
        requestTopicId !== selectedTopicIdRef.current
      ) {
        return
      }
      setFeedError(
        errorMessage(error, 'Chưa thể tải thêm tác phẩm. Vui lòng thử lại.'),
      )
    } finally {
      if (
        requestGeneration === feedGenerationRef.current &&
        requestUserId === selectedUserIdRef.current &&
        requestTopicId === selectedTopicIdRef.current
      ) {
        setFeedLoadingMore(false)
      }
    }
  }

  async function handleLoadMoreProfile() {
    if (
      !profilePagination ||
      profilePagination.page >= profilePagination.totalPages ||
      profileLoadingMore
    ) {
      return
    }

    setProfileLoadingMore(true)
    setProfileError(null)

    const requestGeneration = profileGenerationRef.current
    const requestUserId = selectedUserId

    try {
      const nextPage = profilePagination.page + 1
      const result = await dataApi.listPosts(requestUserId, {
        page: nextPage,
        pageSize: PROFILE_POSTS_PER_PAGE,
        authorId: requestUserId,
      })
      if (
        requestGeneration !== profileGenerationRef.current ||
        requestUserId !== selectedUserIdRef.current
      ) {
        return
      }
      setProfilePosts((current) => uniquePosts([...current, ...result.data]))
      setProfilePagination(result.pagination)
    } catch (error) {
      if (
        requestGeneration !== profileGenerationRef.current ||
        requestUserId !== selectedUserIdRef.current
      ) {
        return
      }
      setProfileError(
        errorMessage(
          error,
          'Chưa thể tải thêm tác phẩm cá nhân. Vui lòng thử lại.',
        ),
      )
    } finally {
      if (
        requestGeneration === profileGenerationRef.current &&
        requestUserId === selectedUserIdRef.current
      ) {
        setProfileLoadingMore(false)
      }
    }
  }

  async function handleUpdateProfile(input: UpdateProfileInput) {
    if (profileSaving) return

    setProfileSaving(true)
    setProfileSaveError(null)
    try {
      const updatedUser = await dataApi.updateProfile(selectedUserId, input)
      setUsers((current) =>
        current.map((user) =>
          user.id === updatedUser.id ? updatedUser : user,
        ),
      )
      setPosts((current) =>
        current.map((post) =>
          post.author.id === updatedUser.id
            ? { ...post, author: updatedUser }
            : post,
        ),
      )
      setProfilePosts((current) =>
        current.map((post) =>
          post.author.id === updatedUser.id
            ? { ...post, author: updatedUser }
            : post,
        ),
      )
      setProfileEditorOpen(false)
    } catch (error) {
      setProfileSaveError(
        errorMessage(error, 'Chưa thể cập nhật profile. Vui lòng thử lại.'),
      )
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleCreatePost(input: CreatePostInput) {
    setCreatingPost(true)
    try {
      await dataApi.createPost(selectedUserId, input)
      setFeedReload((value) => value + 1)
      setProfileReload((value) => value + 1)
    } finally {
      setCreatingPost(false)
    }
  }

  async function handleDeletePost(postId: ResourceId) {
    const requestGeneration = feedGenerationRef.current
    const requestUserId = selectedUserId
    const requestTopicId = selectedTopicId

    await dataApi.deletePost(requestUserId, postId)
    if (
      requestGeneration !== feedGenerationRef.current ||
      requestUserId !== selectedUserIdRef.current ||
      requestTopicId !== selectedTopicIdRef.current
    ) {
      return
    }

    setPosts((current) => current.filter((post) => post.id !== postId))
    setProfilePosts((current) => current.filter((post) => post.id !== postId))
    setPostPagination((current) => {
      if (!current) return current
      const totalItems = Math.max(0, current.totalItems - 1)
      return {
        ...current,
        totalItems,
        totalPages:
          totalItems === 0 ? 0 : Math.ceil(totalItems / current.pageSize),
      }
    })
    setProfilePagination((current) => {
      if (!current) return current
      const totalItems = Math.max(0, current.totalItems - 1)
      return {
        ...current,
        totalItems,
        totalPages:
          totalItems === 0 ? 0 : Math.ceil(totalItems / current.pageSize),
      }
    })
  }

  async function handleToggleReaction(
    postId: ResourceId,
    reacted: boolean,
  ) {
    const requestGeneration = feedGenerationRef.current
    const requestUserId = selectedUserId
    const requestTopicId = selectedTopicId
    const state = await dataApi.setPostReaction(
      requestUserId,
      postId,
      reacted,
    )
    if (
      requestGeneration !== feedGenerationRef.current ||
      requestUserId !== selectedUserIdRef.current ||
      requestTopicId !== selectedTopicIdRef.current
    ) {
      return
    }
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              reactionCount: state.reactionCount,
              viewerHasReacted: state.viewerHasReacted,
            }
          : post,
      ),
    )
  }

  const handleListPostComments = useCallback(
    async (
      postId: ResourceId,
      params?: PaginationParams,
      signal?: AbortSignal,
    ) => {
      const requestGeneration = feedGenerationRef.current
      const requestUserId = selectedUserId
      const requestTopicId = selectedTopicId
      await waitForPostCommentMutations(
        postCommentMutationBarriersRef.current,
        postId,
        signal,
      )
      const response = await dataApi.listPostComments(
        requestUserId,
        postId,
        params,
        signal,
      )

      if (
        requestGeneration === feedGenerationRef.current &&
        requestUserId === selectedUserIdRef.current &&
        requestTopicId === selectedTopicIdRef.current
      ) {
        setPosts((current) =>
          current.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  commentCount: Math.max(
                    0,
                    response.pagination.totalItems,
                  ),
                }
              : post,
          ),
        )
      }

      return response
    },
    [dataApi, selectedTopicId, selectedUserId],
  )

  const handleCreatePostComment = useCallback(
    async (
      postId: ResourceId,
      input: CreatePostCommentInput,
    ) => {
      const requestGeneration = feedGenerationRef.current
      const requestUserId = selectedUserId
      const requestTopicId = selectedTopicId
      return runSerializedPostCommentMutation(
        postCommentMutationBarriersRef.current,
        postId,
        async () => {
          const comment = await dataApi.createPostComment(
            requestUserId,
            postId,
            input,
          )

          if (requestUserId === selectedUserIdRef.current) {
            profileGenerationRef.current += 1
            setProfileReload((value) => value + 1)

            const feedContextIsCurrent =
              requestGeneration === feedGenerationRef.current &&
              requestTopicId === selectedTopicIdRef.current

            if (!feedContextIsCurrent) {
              feedGenerationRef.current += 1
              setFeedReload((value) => value + 1)
              return comment
            }

            const incrementCommentCount = (current: Post[]) =>
              current.map((post) =>
                post.id === postId
                  ? {
                      ...post,
                      commentCount: post.commentCount + 1,
                    }
                  : post,
              )

            setPosts(incrementCommentCount)
          }

          return comment
        },
      )
    },
    [dataApi, selectedTopicId, selectedUserId],
  )

  const handleDeletePostComment = useCallback(
    async (postId: ResourceId, commentId: ResourceId) => {
      const requestGeneration = feedGenerationRef.current
      const requestUserId = selectedUserId
      const requestTopicId = selectedTopicId
      return runSerializedPostCommentMutation(
        postCommentMutationBarriersRef.current,
        postId,
        async () => {
          await dataApi.deletePostComment(
            requestUserId,
            postId,
            commentId,
          )

          if (requestUserId !== selectedUserIdRef.current) return

          profileGenerationRef.current += 1
          setProfileReload((value) => value + 1)

          if (
            requestGeneration === feedGenerationRef.current &&
            requestTopicId === selectedTopicIdRef.current
          ) {
            const decrementCommentCount = (current: Post[]) =>
              current.map((post) =>
                post.id === postId
                  ? {
                      ...post,
                      commentCount: Math.max(
                        0,
                        post.commentCount - 1,
                      ),
                    }
                  : post,
              )

            setPosts(decrementCommentCount)
          } else {
            feedGenerationRef.current += 1
            setFeedReload((value) => value + 1)
          }
        },
      )
    },
    [dataApi, selectedTopicId, selectedUserId],
  )

  async function handleSendMessage() {
    const body = messageDraft.trim()
    const imageFile = messageImageFile
    if (!selectedPeerId || (!body && !imageFile) || messageSending) return

    const requestVersion = ++messageSendVersionRef.current
    const senderId = selectedUserId
    const recipientId = selectedPeerId
    setMessageSending(true)
    setMessageSendError(null)

    try {
      const sent = await dataApi.sendMessage(senderId, {
        recipientId,
        body,
        ...(imageFile ? { imageFile } : {}),
      })
      if (
        requestVersion !== messageSendVersionRef.current ||
        senderId !== selectedUserIdRef.current ||
        recipientId !== selectedPeerIdRef.current
      ) {
        return
      }
      setMessages((current) =>
        current.some((message) => message.id === sent.id)
          ? current
          : [...current, sent],
      )
      setConversationPreviews((current) => [
        sent,
        ...current.filter(
          (message) =>
            !messageBelongsToConversation(
              message,
              senderId,
              recipientId,
            ),
        ),
      ])
      setMessageDraft('')
      setMessageImageFile(null)
    } catch (error) {
      if (requestVersion !== messageSendVersionRef.current) return
      setMessageSendError(
        errorMessage(error, 'Chưa thể gửi tin nhắn. Vui lòng thử lại.'),
      )
    } finally {
      if (requestVersion === messageSendVersionRef.current) {
        setMessageSending(false)
      }
    }
  }

  function nextAssistantMessageID() {
    return createResourceId()
  }

  async function sendAssistantQuestion(
    question: string,
    historySource: AssistantChatMessage[],
    appendUserMessage: boolean,
  ) {
    const requestVersion = assistantRequestVersionRef.current + 1
    const requestUserId = selectedUserId
    const requestConversationId = assistantConversationId
    assistantRequestVersionRef.current = requestVersion

    if (appendUserMessage) {
      setAssistantMessages((current) => [
        ...current,
        {
          id: nextAssistantMessageID(),
          role: 'USER',
          content: question,
        },
      ])
      setAssistantQuestion('')
    }

    setAssistantLoading(true)
    setAssistantError(null)

    try {
      const fallbackHistory = assistantHistoryFromMessages(historySource)
      const response = await dataApi.askAssistant(requestUserId, {
        question,
        ...(requestConversationId
          ? { conversationId: requestConversationId }
          : fallbackHistory.length > 0
            ? { history: fallbackHistory }
            : {}),
      })
      if (
        requestVersion !== assistantRequestVersionRef.current ||
        requestUserId !== selectedUserIdRef.current
      ) {
        return
      }
      setAssistantMessages((current) => [
        ...current,
        {
          id: nextAssistantMessageID(),
          role: 'ASSISTANT',
          content: response.answer,
          response,
        },
      ])
      if (response.conversation) {
        setAssistantConversationId(response.conversation.id)
        setAssistantConversations((current) => [
          response.conversation!,
          ...current.filter(
            (conversation) =>
              conversation.id !== response.conversation!.id,
          ),
        ])
      }
    } catch (error) {
      if (
        requestVersion !== assistantRequestVersionRef.current ||
        requestUserId !== selectedUserIdRef.current
      ) {
        return
      }
      setAssistantError(
        errorMessage(error, 'Artly chưa thể trả lời. Bạn thử gửi lại nhé.'),
      )
    } finally {
      if (requestVersion === assistantRequestVersionRef.current) {
        setAssistantLoading(false)
      }
    }
  }

  async function handleAskAssistant() {
    const question = assistantQuestion.trim()
    if (!question || assistantLoading) return

    await sendAssistantQuestion(question, assistantMessages, true)
  }

  async function handleRetryAssistant() {
    if (assistantLoading) return

    let lastUserIndex = -1
    for (let index = assistantMessages.length - 1; index >= 0; index -= 1) {
      if (assistantMessages[index].role === 'USER') {
        lastUserIndex = index
        break
      }
    }
    if (lastUserIndex < 0) return

    await sendAssistantQuestion(
      assistantMessages[lastUserIndex].content,
      assistantMessages.slice(0, lastUserIndex),
      false,
    )
  }

  async function handleSelectAssistantConversation(
    conversationId: ResourceId,
  ) {
    const requestVersion =
      ++assistantConversationRequestVersionRef.current
    const requestUserId = selectedUserId
    assistantRequestVersionRef.current += 1
    setAssistantLoading(false)
    setAssistantConversationLoading(true)
    setAssistantConversationId(conversationId)
    setAssistantMessages([])
    setAssistantQuestion('')
    setAssistantError(null)

    try {
      const conversation = await dataApi.getAssistantConversation(
        requestUserId,
        conversationId,
      )
      if (
        requestVersion !==
          assistantConversationRequestVersionRef.current ||
        requestUserId !== selectedUserIdRef.current
      ) {
        return
      }
      setAssistantConversationId(conversation.id)
      setAssistantMessages(
        conversation.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          response: message.response,
        })),
      )
    } catch (error) {
      if (
        requestVersion !==
          assistantConversationRequestVersionRef.current ||
        requestUserId !== selectedUserIdRef.current
      ) {
        return
      }
      setAssistantConversationId(null)
      setAssistantError(
        errorMessage(
          error,
          'Chưa thể mở đoạn chat này. Vui lòng thử lại.',
        ),
      )
    } finally {
      if (
        requestVersion ===
        assistantConversationRequestVersionRef.current
      ) {
        setAssistantConversationLoading(false)
      }
    }
  }

  function handleNewAssistantConversation() {
    assistantRequestVersionRef.current += 1
    assistantConversationRequestVersionRef.current += 1
    setAssistantConversationId(null)
    setAssistantConversationLoading(false)
    setAssistantLoading(false)
    setAssistantMessages([])
    setAssistantQuestion('')
    setAssistantError(null)
  }

  const hasMore = Boolean(
    postPagination &&
      postPagination.page < postPagination.totalPages,
  )
  const profileHasMore = Boolean(
    profilePagination &&
      profilePagination.page < profilePagination.totalPages,
  )

  return (
    <div className="artly-app min-h-dvh bg-[#FEFAE0] text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200/90 bg-[#FEFAE0]/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <a
            aria-label="Artly - về bảng tin"
            className="flex items-center gap-3"
            href="#main-content"
            onClick={() => setActiveView('feed')}
          >
            <AppMark />
            <span>
              <h1 className="block text-xl font-black tracking-tight">
                Artly
              </h1>
              <span className="hidden text-[0.65rem] font-bold tracking-[0.14em] text-orange-700 uppercase sm:block">
                Mỹ thuật học đường
              </span>
            </span>
          </a>

          <nav
            aria-label="Điều hướng chính"
            className="ml-auto hidden items-center gap-1 sm:flex"
          >
            <button
              aria-current={activeView === 'feed' ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center gap-2 px-3 text-sm font-semibold ${
                activeView === 'feed'
                  ? 'bg-orange-50 text-orange-800'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
              }`}
              type="button"
              onClick={() => setActiveView('feed')}
            >
              <Home aria-hidden="true" size={17} />
              Bảng tin
            </button>
            <button
              aria-current={activeView === 'profile' ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center gap-2 px-3 text-sm font-semibold ${
                activeView === 'profile'
                  ? 'bg-orange-50 text-orange-800'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
              }`}
              type="button"
              onClick={() => setActiveView('profile')}
            >
              <UserRound aria-hidden="true" size={17} />
              Profile
            </button>
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:ml-3">
            <button
              aria-expanded={chatModalOpen}
              aria-haspopup="dialog"
              aria-label="Mở chat"
              className={`relative grid size-10 place-items-center rounded-full transition ${
                chatModalOpen
                  ? 'bg-[#e7f1ff] text-[#0967d8]'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-950'
              }`}
              type="button"
              onClick={openMessagesList}
            >
              <MessageCircle aria-hidden="true" size={20} />
            </button>
            {authenticatedUserId ? (
              <>
                {USE_SUPABASE ? (
                  <span
                    aria-label={`${notificationCount} thông báo chưa đọc`}
                    className="relative grid size-10 place-items-center text-[#5F6F52]"
                    role="status"
                  >
                    <Bell aria-hidden="true" size={19} />
                    {notificationCount > 0 ? (
                      <span className="absolute right-0.5 top-0.5 grid min-h-4 min-w-4 place-items-center bg-[#B99470] px-1 text-[0.6rem] font-bold text-white">
                        {notificationCount > 9 ? '9+' : notificationCount}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {currentUser ? (
                  <ProfileMenu
                    currentUser={currentUser}
                    onEditProfile={() => {
                      setProfileSaveError(null)
                      setProfileEditorOpen(true)
                    }}
                    onOpenProfile={() => setActiveView('profile')}
                    onSignOut={onSignOut}
                  />
                ) : (
                  <span
                    className="inline-flex min-h-10 items-center rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-500"
                    role="status"
                  >
                    Đang tải…
                  </span>
                )}
              </>
            ) : (
              currentUser ? (
                <ProfileMenu
                  currentUser={currentUser}
                  onEditProfile={() => {
                    setProfileSaveError(null)
                    setProfileEditorOpen(true)
                  }}
                  onOpenProfile={() => setActiveView('profile')}
                />
              ) : (
                <span
                  className="inline-flex min-h-10 items-center rounded-full border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-500"
                  role="status"
                >
                  {directoryLoading ? 'Đang tải…' : 'Chưa có tài khoản'}
                </span>
              )
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-6 sm:px-6 lg:grid-cols-[13rem_minmax(0,42rem)_minmax(14rem,1fr)] lg:py-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <section className="border border-stone-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold tracking-widest text-orange-700 uppercase">
                Đang tham gia
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Artly</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Nơi học sinh và giáo viên chia sẻ bài thi vẽ, góp ý và cùng
                nuôi dưỡng cảm hứng.
              </p>
              {currentUser && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <p className="text-sm font-bold text-stone-900">
                    {currentUser.displayName}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    @{currentUser.username} ·{' '}
                    {currentUser.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}
                  </p>
                </div>
              )}
            </section>

            <nav
              aria-label="Lối tắt"
              className="border border-stone-200 bg-white p-2 shadow-sm"
            >
              <button
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-800"
                type="button"
                onClick={() => setActiveView('feed')}
              >
                <Palette aria-hidden="true" size={18} />
                Phòng tranh
              </button>
              <button
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-800"
                type="button"
                onClick={openMessagesList}
              >
                <MessageCircle aria-hidden="true" size={18} />
                Trò chuyện
              </button>
              <button
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-800"
                type="button"
                onClick={() => setActiveView('profile')}
              >
                <UserRound aria-hidden="true" size={18} />
                Profile cá nhân
              </button>
              <button
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-800"
                type="button"
                onClick={() => setAssistantOpen(true)}
              >
                <Bot aria-hidden="true" size={18} />
                Hỏi trợ lý
              </button>
            </nav>
          </div>
        </aside>

        <main
          id="main-content"
          className={`min-w-0 pb-20 sm:pb-8 ${
            activeView === 'profile' ? 'lg:col-span-2' : ''
          }`}
        >
          {directoryError && (
            <div
              className="mb-5 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
              role="alert"
            >
              <p className="font-semibold">Chưa tải đủ dữ liệu danh mục</p>
              <p className="mt-1">{directoryError}</p>
              <button
                className="mt-3 border border-amber-400 bg-white px-3 py-1.5 text-xs font-bold hover:bg-amber-100"
                type="button"
                onClick={() => setDirectoryReload((value) => value + 1)}
              >
                Thử lại
              </button>
            </div>
          )}

          {activeView === 'profile' && currentUser ? (
            <ProfilePage
              error={profileError}
              hasMore={profileHasMore}
              isLoading={profileLoading}
              isLoadingMore={profileLoadingMore}
              pagination={profilePagination}
              posts={profilePosts}
              user={currentUser}
              onEditProfile={() => {
                setProfileSaveError(null)
                setProfileEditorOpen(true)
              }}
              onLoadMore={handleLoadMoreProfile}
              onOpenFeed={() => setActiveView('feed')}
              onRetry={() => setProfileReload((value) => value + 1)}
            />
          ) : activeView === 'profile' ? (
            <section
              className="border border-stone-200 bg-white p-8 text-center text-sm text-stone-600"
              role="status"
            >
              Hãy chọn một tài khoản demo để mở profile.
            </section>
          ) : (
            <Feed
              canDeleteAnyPost={currentUser?.isSuperAdmin === true}
              currentUserId={selectedUserId}
              error={feedError}
              hasMore={hasMore}
              imageInputMode={storageUploadsEnabled ? 'upload' : 'url'}
              isCreatingPost={creatingPost}
              isLoading={feedLoading}
              isLoadingMore={feedLoadingMore}
              posts={posts}
              selectedTopicId={selectedTopicId}
              topics={topics}
              onCreatePostComment={handleCreatePostComment}
              onCreatePost={handleCreatePost}
              onDeletePostComment={handleDeletePostComment}
              onDeletePost={handleDeletePost}
              onListPostComments={handleListPostComments}
              onLoadMore={handleLoadMore}
              onRetry={() => setFeedReload((value) => value + 1)}
              onToggleReaction={handleToggleReaction}
              onTopicChange={setSelectedTopicId}
            />
          )}
        </main>

        {activeView !== 'profile' ? (
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <section className="border border-orange-200 bg-orange-50 p-5">
              <span className="grid size-10 place-items-center rounded-full bg-orange-700 text-white">
                <GraduationCap aria-hidden="true" size={20} />
              </span>
              <h2 className="mt-4 text-base font-black text-stone-950">
                Một góc học tập tử tế
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Chia sẻ ý tưởng, chất liệu và câu chuyện phía sau mỗi tác phẩm.
              </p>
            </section>
            <section className="border border-stone-200 bg-white p-5">
              <div className="flex items-center gap-2 text-stone-900">
                <Users aria-hidden="true" size={18} />
                <h2 className="text-sm font-bold">Cộng đồng Artly</h2>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-stone-50 p-3">
                  <dt className="text-xs text-stone-500">Thành viên</dt>
                  <dd className="mt-1 text-xl font-black">{users.length}</dd>
                </div>
                <div className="bg-stone-50 p-3">
                  <dt className="text-xs text-stone-500">Chủ đề</dt>
                  <dd className="mt-1 text-xl font-black">{topics.length}</dd>
                </div>
              </dl>
            </section>
          </div>
        </aside>
        ) : null}
      </div>

      <nav
        aria-label="Điều hướng di động"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-stone-200 bg-white sm:hidden"
      >
        <button
          aria-current={activeView === 'feed' ? 'page' : undefined}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${
            activeView === 'feed' ? 'text-orange-700' : 'text-stone-500'
          }`}
          type="button"
          onClick={() => setActiveView('feed')}
        >
          <Home aria-hidden="true" size={20} />
          Bảng tin
        </button>
        <button
          aria-expanded={chatModalOpen}
          aria-haspopup="dialog"
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${
            chatModalOpen ? 'text-orange-700' : 'text-stone-500'
          }`}
          type="button"
          onClick={openMessagesList}
        >
          <MessageCircle aria-hidden="true" size={20} />
          Tin nhắn
        </button>
        <button
          aria-current={activeView === 'profile' ? 'page' : undefined}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${
            activeView === 'profile' ? 'text-orange-700' : 'text-stone-500'
          }`}
          type="button"
          onClick={() => setActiveView('profile')}
        >
          <UserRound aria-hidden="true" size={20} />
          Profile
        </button>
      </nav>

      <EditProfileDialog
        allowAvatarUpload={storageUploadsEnabled}
        error={profileSaveError}
        isSubmitting={profileSaving}
        open={profileEditorOpen}
        user={currentUser}
        onClose={() => {
          if (!profileSaving) setProfileEditorOpen(false)
        }}
        onSubmit={handleUpdateProfile}
      />

      {currentUser && (
        <ChatModal
          allowImageAttachments={storageUploadsEnabled}
          currentUser={currentUser}
          draft={messageDraft}
          error={messagesLoadError}
          imageFile={messageImageFile}
          isLoading={messagesLoading}
          isOpen={chatModalOpen}
          isSending={messageSending}
          messages={selectedPeerId ? messages : conversationPreviews}
          peers={peers}
          readMessageIds={readMessageIds}
          selectedPeerId={selectedPeerId}
          sendError={messageSendError}
          onBackToList={openMessagesList}
          onClose={closeChatModal}
          onDraftChange={(value) => {
            setMessageDraft(value)
            setMessageSendError(null)
          }}
          onImageChange={
            storageUploadsEnabled
              ? (file) => {
                  setMessageImageFile(file)
                  setMessageSendError(null)
                }
              : undefined
          }
          onRetry={() => setMessagesReload((value) => value + 1)}
          onSelectPeer={handleSelectPeer}
          onSend={handleSendMessage}
        />
      )}

      <AssistantPanel
        conversations={assistantConversations}
        error={assistantError}
        historyError={assistantHistoryError}
        isConversationLoading={assistantConversationLoading}
        isHistoryLoading={assistantHistoryLoading}
        isLoading={assistantLoading}
        isOpen={assistantOpen}
        messages={assistantMessages}
        question={assistantQuestion}
        selectedConversationId={assistantConversationId}
        onNewConversation={handleNewAssistantConversation}
        onOpenChange={setAssistantOpen}
        onQuestionChange={(value) => {
          setAssistantQuestion(value)
          setAssistantError(null)
        }}
        onRetry={handleRetryAssistant}
        onRetryHistory={() =>
          setAssistantHistoryReload((current) => current + 1)
        }
        onSelectConversation={handleSelectAssistantConversation}
        onSubmit={handleAskAssistant}
        onUseSuggestion={setAssistantQuestion}
      />
    </div>
  )
}

export function App() {
  if (USE_SUPABASE) {
    return (
      <AuthGate>
        {(session, signOut) => (
          <ArtlyWorkspace
            authenticatedUserId={parseResourceId(session.user.id, 'user.id')}
            dataApi={SUPABASE_WITH_MODEL_ASSISTANT}
            storageUploadsEnabled
            onSignOut={signOut}
          />
        )}
      </AuthGate>
    )
  }

  return (
    <DemoAuthGate dataApi={api}>
      {(demoUserId, signOut) => (
        <ArtlyWorkspace
          authenticatedUserId={demoUserId}
          dataApi={api}
          storageUploadsEnabled={false}
          onSignOut={signOut}
        />
      )}
    </DemoAuthGate>
  )
}

export default App
