import { MessageCircle, Search, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import type { Message, ResourceId, User } from '../../types/api'
import { UserAvatar } from './UserAvatar'

type ChatFilter = 'all' | 'unread' | 'teachers' | 'students'

interface ChatListPanelProps {
  currentUser: User
  peers: User[]
  messages: Message[]
  selectedPeerId: ResourceId | null
  readMessageIds?: ReadonlySet<ResourceId>
  className?: string
  onClose?: () => void
  onSelectPeer: (peerId: ResourceId) => void
}

function formatConversationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const diffMs = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs >= 0 && diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))}m`
  }
  if (diffMs >= 0 && diffMs < day) {
    return `${Math.floor(diffMs / hour)}h`
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

function messageBelongsToPeer(
  message: Message,
  currentUserId: ResourceId,
  peerId: ResourceId,
) {
  return (
    (message.sender.id === currentUserId && message.receiver.id === peerId) ||
    (message.sender.id === peerId && message.receiver.id === currentUserId)
  )
}

function latestMessageForPeer(
  messages: Message[],
  currentUserId: ResourceId,
  peerId: ResourceId,
) {
  return messages
    .filter((message) => messageBelongsToPeer(message, currentUserId, peerId))
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )[0]
}

function previewForMessage(message: Message | undefined, currentUserId: string) {
  if (!message) return 'Chưa có tin nhắn'

  const body = message.body.trim()
  const hasImage = (message.attachments ?? []).some(
    (attachment) => attachment.kind === 'IMAGE',
  )
  const prefix = message.sender.id === currentUserId ? 'Bạn: ' : ''

  if (body) return `${prefix}${body}`
  if (hasImage) return `${prefix}Đã gửi một ảnh`
  return 'Tin nhắn mới'
}

function isUnreadMessage(
  message: Message | undefined,
  currentUserId: ResourceId,
  readMessageIds?: ReadonlySet<ResourceId>,
) {
  return Boolean(
    message?.receiver.id === currentUserId &&
      !readMessageIds?.has(message.id),
  )
}

export function ChatListPanel({
  currentUser,
  peers,
  messages,
  selectedPeerId,
  readMessageIds,
  className,
  onClose,
  onSelectPeer,
}: ChatListPanelProps) {
  const titleId = useId()
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ChatFilter>('all')

  const conversations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN')

    return peers
      .map((peer) => ({
        peer,
        latestMessage: latestMessageForPeer(
          messages,
          currentUser.id,
          peer.id,
        ),
      }))
      .filter(({ peer, latestMessage }) => {
        const matchesQuery =
          !normalizedQuery ||
          peer.displayName.toLocaleLowerCase('vi-VN').includes(normalizedQuery) ||
          peer.username.toLocaleLowerCase('vi-VN').includes(normalizedQuery)
        if (!matchesQuery) return false

        if (filter === 'teachers') return peer.role === 'TEACHER'
        if (filter === 'students') return peer.role === 'STUDENT'
        if (filter === 'unread') {
          return isUnreadMessage(
            latestMessage,
            currentUser.id,
            readMessageIds,
          )
        }

        return true
      })
      .sort((first, second) => {
        const firstTime = first.latestMessage
          ? new Date(first.latestMessage.createdAt).getTime()
          : 0
        const secondTime = second.latestMessage
          ? new Date(second.latestMessage.createdAt).getTime()
          : 0

        if (firstTime !== secondTime) return secondTime - firstTime
        return first.peer.displayName.localeCompare(
          second.peer.displayName,
          'vi-VN',
        )
      })
  }, [currentUser.id, filter, messages, peers, query, readMessageIds])

  const filters: { id: ChatFilter; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'unread', label: 'Chưa đọc' },
    { id: 'teachers', label: 'Giáo viên' },
    { id: 'students', label: 'Học sinh' },
  ]

  return (
    <section
      aria-labelledby={titleId}
      className={
        className ??
        'mx-auto flex h-[min(74vh,45rem)] min-h-[34rem] w-full max-w-[41rem] flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_18px_50px_rgb(15_23_42_/_0.16)]'
      }
    >
      <header className="border-b border-stone-100 bg-white px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <h2
            className="min-w-0 flex-1 text-2xl font-black tracking-tight text-stone-950"
            id={titleId}
          >
            Tin nhắn
          </h2>
          {onClose ? (
            <button
              aria-label="Đóng danh sách chat"
              className="grid size-9 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-950"
              type="button"
              onClick={onClose}
            >
              <X aria-hidden="true" size={19} />
            </button>
          ) : null}
        </div>

        <label className="sr-only" htmlFor={searchId}>
          Tìm kiếm cuộc trò chuyện
        </label>
        <div className="mt-4 flex min-h-11 items-center gap-2.5 rounded-full bg-stone-100 px-3.5 text-stone-500">
          <Search aria-hidden="true" size={19} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-500"
            id={searchId}
            placeholder="Tìm kiếm người dùng"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div
          aria-label="Bộ lọc chat"
          className="mt-3 flex gap-1 overflow-x-auto"
          role="toolbar"
        >
          {filters.map((item) => (
            <button
              aria-pressed={filter === item.id}
              className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-semibold transition ${
                filter === item.id
                  ? 'bg-[#e7f1ff] text-[#0967d8]'
                  : 'text-stone-950 hover:bg-stone-100'
              }`}
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {conversations.length > 0 ? (
        <ol
          aria-label="Danh sách người chat"
          className="flex-1 overflow-y-auto bg-white py-1.5"
        >
          {conversations.map(({ peer, latestMessage }) => {
            const preview = previewForMessage(latestMessage, currentUser.id)
            const time = latestMessage
              ? formatConversationTime(latestMessage.createdAt)
              : ''
            const isSelected = peer.id === selectedPeerId
            const hasUnread = isUnreadMessage(
              latestMessage,
              currentUser.id,
              readMessageIds,
            )

            return (
              <li key={peer.id}>
                <button
                  aria-label={`Mở chat với ${peer.displayName}`}
                  data-unread={hasUnread}
                  className={`flex min-h-20 w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-stone-50 focus:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0967d8] ${
                    isSelected || hasUnread ? 'bg-[#f4f8ff]' : ''
                  }`}
                  type="button"
                  onClick={() => onSelectPeer(peer.id)}
                >
                  <UserAvatar className="size-12" user={peer} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-stone-950">
                      {peer.displayName}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-sm ${
                        hasUnread
                          ? 'font-bold text-stone-950'
                          : 'font-medium text-stone-500'
                      }`}
                    >
                      {preview}
                      {time ? ` · ${time}` : ''}
                    </span>
                  </span>
                  {hasUnread ? (
                    <span
                      aria-label="Có tin nhắn chưa đọc"
                      className="size-3 rounded-full bg-[#0967d8]"
                    />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <div
          className="flex flex-1 flex-col items-center justify-center px-6 text-center"
          role="status"
        >
          <MessageCircle
            aria-hidden="true"
            className="text-stone-300"
            size={34}
          />
          <p className="mt-3 text-sm font-bold text-stone-800">
            Không tìm thấy cuộc trò chuyện
          </p>
        </div>
      )}
    </section>
  )
}
