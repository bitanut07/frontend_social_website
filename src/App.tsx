import {
  Bot,
  GraduationCap,
  Home,
  MessageCircle,
  Palette,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { AssistantPanel } from './features/assistant'
import { ChatPanel } from './features/chat'
import { Feed } from './features/feed'
import { api } from './lib/api'
import type {
  AssistantResponse,
  CreatePostInput,
  Message,
  Pagination,
  Post,
  Topic,
  User,
} from './types/api'

const POSTS_PER_PAGE = 10
const MESSAGES_PER_PAGE = 50
const MESSAGE_POLL_INTERVAL = 5_000
const MESSAGE_REQUEST_TIMEOUT = 10_000

type ActiveView = 'feed' | 'messages'

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function uniquePosts(posts: Post[]) {
  return Array.from(new Map(posts.map((post) => [post.id, post])).values())
}

function AppMark() {
  return (
    <span
      aria-hidden="true"
      className="artly-mark grid size-10 shrink-0 place-items-center rounded-xl bg-orange-700 text-lg font-black text-white"
    >
      A
    </span>
  )
}

export function App() {
  const feedGenerationRef = useRef(0)
  const messageRequestVersion = useRef(0)
  const messageRequestsInFlightRef = useRef(
    new Map<string, AbortController>(),
  )
  const messageSendVersionRef = useRef(0)
  const [activeView, setActiveView] = useState<ActiveView>('feed')
  const [users, setUsers] = useState<User[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedUserId, setSelectedUserId] = useState(1)
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const [directoryReload, setDirectoryReload] = useState(0)

  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [postPagination, setPostPagination] = useState<Pagination | null>(null)
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedLoadingMore, setFeedLoadingMore] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [feedReload, setFeedReload] = useState(0)
  const [creatingPost, setCreatingPost] = useState(false)

  const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messageDraft, setMessageDraft] = useState('')
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageSending, setMessageSending] = useState(false)
  const [messagesLoadError, setMessagesLoadError] =
    useState<string | null>(null)
  const [messageSendError, setMessageSendError] =
    useState<string | null>(null)
  const [messagesReload, setMessagesReload] = useState(0)

  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantQuestion, setAssistantQuestion] = useState('')
  const [assistantResponse, setAssistantResponse] =
    useState<AssistantResponse | null>(null)
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [assistantError, setAssistantError] = useState<string | null>(null)
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
    let active = true

    setDirectoryLoading(true)
    setDirectoryError(null)

    Promise.all([
      api.listUsers({ page: 1, pageSize: 20 }),
      api.listTopics({ page: 1, pageSize: 50 }),
    ])
      .then(([userResult, topicResult]) => {
        if (!active) return

        setUsers(userResult.data)
        setTopics(topicResult.data)
        setSelectedUserId((currentId) =>
          userResult.data.some((user) => user.id === currentId)
            ? currentId
            : (userResult.data[0]?.id ?? currentId),
        )
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
  }, [directoryReload])

  useEffect(() => {
    if (peers.length === 0) {
      setSelectedPeerId(null)
      return
    }

    setSelectedPeerId((currentId) =>
      peers.some((peer) => peer.id === currentId)
        ? currentId
        : peers[0].id,
    )
  }, [peers])

  useEffect(() => {
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

    api
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
  }, [feedReload, selectedTopicId, selectedUserId])

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
        const result = await api.listMessages(
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
    [selectedPeerId, selectedUserId],
  )

  useEffect(() => {
    if (activeView !== 'messages' || !selectedPeerId) return

    const requestsInFlight = messageRequestsInFlightRef.current
    void loadMessages()
    const interval = window.setInterval(
      () => void loadMessages(true),
      MESSAGE_POLL_INTERVAL,
    )

    return () => {
      window.clearInterval(interval)
      messageRequestVersion.current += 1
      for (const request of requestsInFlight.values()) {
        request.abort()
      }
      requestsInFlight.clear()
    }
  }, [activeView, loadMessages, messagesReload, selectedPeerId])

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
      const result = await api.listPosts(requestUserId, {
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

  async function handleCreatePost(input: CreatePostInput) {
    setCreatingPost(true)
    try {
      await api.createPost(selectedUserId, input)
      setFeedReload((value) => value + 1)
    } finally {
      setCreatingPost(false)
    }
  }

  async function handleToggleReaction(postId: number, reacted: boolean) {
    const requestGeneration = feedGenerationRef.current
    const requestUserId = selectedUserId
    const requestTopicId = selectedTopicId
    const state = await api.setPostReaction(requestUserId, postId, reacted)
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

  async function handleSendMessage() {
    const body = messageDraft.trim()
    if (!selectedPeerId || !body || messageSending) return

    const requestVersion = ++messageSendVersionRef.current
    const senderId = selectedUserId
    const recipientId = selectedPeerId
    setMessageSending(true)
    setMessageSendError(null)

    try {
      const sent = await api.sendMessage(senderId, {
        recipientId,
        body,
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
      setMessageDraft('')
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

  async function handleAskAssistant() {
    const question = assistantQuestion.trim()
    if (!question || assistantLoading) return

    setAssistantLoading(true)
    setAssistantError(null)
    setAssistantResponse(null)

    try {
      const response = await api.askAssistant(selectedUserId, question)
      setAssistantResponse(response)
    } catch (error) {
      setAssistantError(
        errorMessage(error, 'Trợ lý chưa thể trả lời. Vui lòng thử lại.'),
      )
    } finally {
      setAssistantLoading(false)
    }
  }

  const hasMore = Boolean(
    postPagination &&
      postPagination.page < postPagination.totalPages,
  )

  return (
    <div className="artly-app min-h-dvh bg-[#f7f4ee] text-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-200/90 bg-[#fffdf9]/95 backdrop-blur">
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
              aria-current={activeView === 'messages' ? 'page' : undefined}
              className={`inline-flex min-h-10 items-center gap-2 px-3 text-sm font-semibold ${
                activeView === 'messages'
                  ? 'bg-orange-50 text-orange-800'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-950'
              }`}
              type="button"
              onClick={() => setActiveView('messages')}
            >
              <MessageCircle aria-hidden="true" size={17} />
              Tin nhắn
            </button>
          </nav>

          <div className="ml-auto sm:ml-3">
            <label className="sr-only" htmlFor="demo-user">
              Tài khoản demo
            </label>
            <select
              aria-label="Tài khoản demo"
              className="min-h-10 max-w-40 border border-stone-300 bg-white px-2 text-sm font-semibold text-stone-800 disabled:cursor-wait disabled:bg-stone-100 sm:max-w-52 sm:px-3"
              disabled={directoryLoading || users.length === 0}
              id="demo-user"
              value={selectedUserId}
              onChange={(event) => {
                const nextUserId = Number(event.target.value)
                selectedUserIdRef.current = nextUserId
                messageSendVersionRef.current += 1
                setMessageSending(false)
                setSelectedUserId(nextUserId)
                setMessages([])
                setMessageDraft('')
                setMessagesLoadError(null)
                setMessageSendError(null)
                setAssistantResponse(null)
              }}
            >
              {users.length === 0 && (
                <option value={selectedUserId}>
                  {directoryLoading ? 'Đang tải tài khoản…' : 'Chưa có tài khoản'}
                </option>
              )}
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </select>
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
                onClick={() => setActiveView('messages')}
              >
                <MessageCircle aria-hidden="true" size={18} />
                Trò chuyện
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

        <main id="main-content" className="min-w-0 pb-20 sm:pb-8">
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

          {activeView === 'feed' ? (
            <Feed
              error={feedError}
              hasMore={hasMore}
              isCreatingPost={creatingPost}
              isLoading={feedLoading}
              isLoadingMore={feedLoadingMore}
              posts={posts}
              selectedTopicId={selectedTopicId}
              topics={topics}
              onCreatePost={handleCreatePost}
              onLoadMore={handleLoadMore}
              onRetry={() => setFeedReload((value) => value + 1)}
              onToggleReaction={handleToggleReaction}
              onTopicChange={setSelectedTopicId}
            />
          ) : currentUser ? (
            <ChatPanel
              currentUser={currentUser}
              draft={messageDraft}
              error={messagesLoadError}
              isLoading={messagesLoading}
              isSending={messageSending}
              messages={messages}
              peers={peers}
              selectedPeerId={selectedPeerId}
              sendError={messageSendError}
              onDraftChange={(value) => {
                setMessageDraft(value)
                setMessageSendError(null)
              }}
              onRetry={() => setMessagesReload((value) => value + 1)}
              onSelectPeer={(peerId) => {
                selectedPeerIdRef.current = peerId
                messageSendVersionRef.current += 1
                setMessageSending(false)
                setSelectedPeerId(peerId)
                setMessages([])
                setMessageDraft('')
                setMessagesLoadError(null)
                setMessageSendError(null)
              }}
              onSend={handleSendMessage}
            />
          ) : (
            <section
              className="border border-stone-200 bg-white p-8 text-center text-sm text-stone-600"
              role="status"
            >
              Hãy chọn một tài khoản demo để mở tin nhắn.
            </section>
          )}
        </main>

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
                <h2 className="text-sm font-bold">Cộng đồng demo</h2>
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
      </div>

      <nav
        aria-label="Điều hướng di động"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t border-stone-200 bg-white sm:hidden"
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
          aria-current={activeView === 'messages' ? 'page' : undefined}
          className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${
            activeView === 'messages' ? 'text-orange-700' : 'text-stone-500'
          }`}
          type="button"
          onClick={() => setActiveView('messages')}
        >
          <MessageCircle aria-hidden="true" size={20} />
          Tin nhắn
        </button>
      </nav>

      <AssistantPanel
        error={assistantError}
        isLoading={assistantLoading}
        isOpen={assistantOpen}
        question={assistantQuestion}
        response={assistantResponse}
        onOpenChange={setAssistantOpen}
        onQuestionChange={(value) => {
          setAssistantQuestion(value)
          setAssistantError(null)
        }}
        onRetry={handleAskAssistant}
        onSubmit={handleAskAssistant}
        onUseSuggestion={setAssistantQuestion}
      />
    </div>
  )
}

export default App
