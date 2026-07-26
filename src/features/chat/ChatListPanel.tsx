import {
  Edit3,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Search,
} from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import type { Message, ResourceId, User } from '../../types/api'
import { UserAvatar } from './UserAvatar'

type ChatFilter = 'all' | 'unread' | 'teachers' | 'students'

interface ChatListPanelProps {
  currentUser: User
  peers: User[]
  messages: Message[]
  selectedPeerId: ResourceId | null
  className?: string
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

export function ChatListPanel({
  currentUser,
  peers,
  messages,
  selectedPeerId,
  className,
  onSelectPeer,
}: ChatListPanelProps) {
  const titleId = useId()
  const searchId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
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
          return latestMessage?.receiver.id === currentUser.id
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
  }, [currentUser.id, filter, messages, peers, query])

  const filters: { id: ChatFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
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
      <header className="border-b border-stone-100 bg-white px-4 pb-4 pt-5 sm:px-5">
        <div className="flex items-center gap-3">
          <h2
            className="min-w-0 flex-1 text-4xl font-black tracking-tight text-stone-950"
            id={titleId}
          >
            Chats
          </h2>
          <div className="flex shrink-0 items-center gap-2 text-stone-600">
            <button
              aria-label="Tùy chọn chat"
              className="grid size-10 place-items-center rounded-full hover:bg-stone-100"
              type="button"
              onClick={() => setFilter('all')}
            >
              <MoreHorizontal aria-hidden="true" size={21} />
            </button>
            <button
              aria-label="Mở rộng danh sách chat"
              className="grid size-10 place-items-center rounded-full hover:bg-stone-100"
              type="button"
              onClick={() => searchRef.current?.focus()}
            >
              <Maximize2 aria-hidden="true" size={20} />
            </button>
            <button
              aria-label="Tạo chat mới"
              className="grid size-10 place-items-center rounded-full hover:bg-stone-100"
              type="button"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
            >
              <Edit3 aria-hidden="true" size={20} />
            </button>
          </div>
        </div>

        <label className="sr-only" htmlFor={searchId}>
          Tìm kiếm Messenger
        </label>
        <div className="mt-5 flex min-h-14 items-center gap-3 rounded-full bg-stone-100 px-4 text-stone-500">
          <Search aria-hidden="true" size={24} />
          <input
            className="min-w-0 flex-1 bg-transparent text-lg text-stone-950 outline-none placeholder:text-stone-500"
            id={searchId}
            placeholder="Search Messenger"
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div
          aria-label="Bộ lọc chat"
          className="mt-4 flex gap-3 overflow-x-auto"
          role="toolbar"
        >
          {filters.map((item) => (
            <button
              aria-pressed={filter === item.id}
              className={`min-h-11 shrink-0 rounded-full px-5 text-base font-black transition ${
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
          className="flex-1 overflow-y-auto bg-white py-2"
        >
          {conversations.map(({ peer, latestMessage }) => {
            const preview = previewForMessage(latestMessage, currentUser.id)
            const time = latestMessage
              ? formatConversationTime(latestMessage.createdAt)
              : ''
            const isSelected = peer.id === selectedPeerId
            const hasUnread = latestMessage?.receiver.id === currentUser.id

            return (
              <li key={peer.id}>
                <button
                  aria-label={`Mở chat với ${peer.displayName}`}
                  className={`flex min-h-24 w-full items-center gap-4 px-4 py-2 text-left transition hover:bg-stone-50 focus:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0967d8] sm:px-5 ${
                    isSelected ? 'bg-[#f4f8ff]' : ''
                  }`}
                  type="button"
                  onClick={() => onSelectPeer(peer.id)}
                >
                  <UserAvatar className="size-16" user={peer} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xl font-black text-stone-950">
                      {peer.displayName}
                    </span>
                    <span
                      className={`mt-1 block truncate text-base ${
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
                  ) : (
                    <MessageCircle
                      aria-hidden="true"
                      className="text-stone-300"
                      size={18}
                    />
                  )}
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
