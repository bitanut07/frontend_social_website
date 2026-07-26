import {
  AlertCircle,
  MessageCircle,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import type { Message, MessageAttachment, User } from '../../types/api'
import { UserAvatar } from './UserAvatar'

interface ConversationContentProps {
  currentUser: User
  selectedPeer: User | null
  messages: Message[]
  isLoading: boolean
  error: string | null
  onRetry?: () => void
}

function formatTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function ConversationLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Đang tải tin nhắn"
      className="flex flex-1 flex-col justify-end gap-3 bg-white px-4 py-5"
      role="status"
    >
      <span className="sr-only">Đang tải tin nhắn…</span>
      <div className="h-12 w-3/4 animate-pulse rounded-3xl bg-stone-100" />
      <div className="ml-auto h-14 w-2/3 animate-pulse rounded-3xl bg-[#f5d3df]" />
      <div className="h-10 w-1/2 animate-pulse rounded-3xl bg-stone-100" />
    </div>
  )
}

function attachmentAlt(attachment: MessageAttachment) {
  return attachment.originalFileName
    ? `Ảnh đã gửi: ${attachment.originalFileName}`
    : 'Ảnh đã gửi trong tin nhắn'
}

function AttachmentImage({
  attachment,
  isOwnMessage,
}: {
  attachment: MessageAttachment
  isOwnMessage: boolean
}) {
  return (
    <figure
      className={`overflow-hidden rounded-2xl ${
        isOwnMessage ? 'bg-[#6f2cb1]' : 'bg-stone-200'
      }`}
    >
      <img
        alt={attachmentAlt(attachment)}
        className="max-h-72 w-full max-w-xs object-cover"
        loading="lazy"
        src={attachment.url}
      />
    </figure>
  )
}

export function ConversationContent({
  currentUser,
  selectedPeer,
  messages,
  isLoading,
  error,
  onRetry,
}: ConversationContentProps) {
  const conversationRef = useRef<HTMLOListElement>(null)
  const chronologicalMessages = useMemo(
    () =>
      [...messages].sort(
        (first, second) =>
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime(),
      ),
    [messages],
  )

  useEffect(() => {
    const node = conversationRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [chronologicalMessages, selectedPeer?.id])

  if (isLoading) {
    return <ConversationLoading />
  }

  if (error) {
    return (
      <div
        className="m-4 flex flex-1 flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center"
        role="alert"
      >
        <AlertCircle aria-hidden="true" className="text-red-700" size={28} />
        <p className="mt-3 text-sm font-semibold text-red-950">
          Chưa tải được cuộc trò chuyện
        </p>
        <p className="mt-1 max-w-xs text-sm text-red-800">{error}</p>
        {onRetry && (
          <button
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-red-300 bg-white px-3 text-sm font-semibold text-red-900 hover:bg-red-100"
            type="button"
            onClick={onRetry}
          >
            <RefreshCw aria-hidden="true" size={16} />
            Thử lại
          </button>
        )}
      </div>
    )
  }

  if (!selectedPeer) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10 text-center"
        role="status"
      >
        <MessageCircle
          aria-hidden="true"
          className="text-orange-300"
          size={36}
        />
        <p className="mt-3 text-sm font-semibold text-slate-800">
          Chọn một người để bắt đầu
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Tin nhắn của bạn sẽ xuất hiện tại đây.
        </p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10 text-center"
        role="status"
      >
        <p className="text-sm font-semibold text-slate-800">Chưa có tin nhắn</p>
        <p className="mt-1 text-sm text-slate-500">
          Hãy gửi lời chào đầu tiên đến {selectedPeer.displayName}.
        </p>
      </div>
    )
  }

  return (
    <ol
      aria-label={`Cuộc trò chuyện với ${selectedPeer.displayName}`}
      aria-live="polite"
      className="flex flex-1 flex-col gap-3 overflow-y-auto bg-white px-3 py-4 sm:px-4"
      ref={conversationRef}
    >
      {chronologicalMessages.map((message) => {
        const isOwnMessage = message.sender.id === currentUser.id
        const time = formatTime(message.createdAt)
        const body = message.body.trim()
        const attachments = (message.attachments ?? []).filter(
          (attachment) => attachment.kind === 'IMAGE',
        )

        if (!body && attachments.length === 0) {
          return null
        }

        return (
          <li
            key={message.id}
            className={`flex items-end gap-2 ${
              isOwnMessage ? 'justify-end' : 'justify-start'
            }`}
          >
            {!isOwnMessage && (
              <UserAvatar className="mb-5 size-8" user={message.sender} />
            )}
            <div
              className={`flex max-w-[82%] flex-col ${
                isOwnMessage ? 'items-end' : 'items-start'
              }`}
            >
              <article
                className={`overflow-hidden rounded-[1.35rem] text-sm leading-5 ${
                  isOwnMessage
                    ? 'rounded-br-md bg-[#8b35c9] text-white'
                    : 'rounded-bl-md bg-stone-100 text-stone-950'
                } ${body ? 'px-3.5 py-2.5' : 'p-1'}`}
              >
                {attachments.length > 0 && (
                  <div className={body ? 'mb-2 space-y-2' : 'space-y-1'}>
                    {attachments.map((attachment) => (
                      <AttachmentImage
                        attachment={attachment}
                        isOwnMessage={isOwnMessage}
                        key={attachment.id}
                      />
                    ))}
                  </div>
                )}
                {body && (
                  <p className="whitespace-pre-wrap break-words">{body}</p>
                )}
                {attachments.length > 0 && !body && (
                  <span className="sr-only">Tin nhắn hình ảnh</span>
                )}
              </article>
              <p
                className={`mt-1 px-2 text-[0.68rem] font-medium text-stone-400 ${
                  isOwnMessage ? 'text-right' : 'text-left'
                }`}
              >
                {isOwnMessage ? 'Bạn' : message.sender.displayName}
                {time ? ` · ${time}` : ''}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
