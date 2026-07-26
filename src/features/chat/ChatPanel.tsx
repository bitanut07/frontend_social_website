import {
  ArrowLeft,
  MessageCircle,
  Minus,
  Phone,
  Video,
  X,
} from 'lucide-react'
import { useId } from 'react'
import type { Message, ResourceId, User } from '../../types/api'
import { ChatComposer } from './ChatComposer'
import { ConversationContent } from './ConversationContent'
import { UserAvatar } from './UserAvatar'

export interface ChatPanelProps {
  currentUser: User
  peers: User[]
  selectedPeerId: ResourceId | null
  messages: Message[]
  draft: string
  imageFile?: File | null
  allowImageAttachments?: boolean
  isLoading?: boolean
  isSending?: boolean
  error?: string | null
  sendError?: string | null
  className?: string
  showFloatingActions?: boolean
  onBackToList?: () => void
  onClose?: () => void
  onMinimize?: () => void
  onDraftChange: (value: string) => void
  onImageChange?: (file: File | null) => void
  onSend: () => void
  onRetry?: () => void
}

export function ChatPanel({
  currentUser,
  peers,
  selectedPeerId,
  messages,
  draft,
  imageFile = null,
  allowImageAttachments = true,
  isLoading = false,
  isSending = false,
  error = null,
  sendError = null,
  className,
  showFloatingActions = false,
  onBackToList,
  onClose,
  onMinimize,
  onDraftChange,
  onImageChange,
  onSend,
  onRetry,
}: ChatPanelProps) {
  const titleId = useId()
  const availablePeers = peers.filter((peer) => peer.id !== currentUser.id)
  const selectedPeer =
    availablePeers.find((peer) => peer.id === selectedPeerId) ?? null

  return (
    <section
      aria-labelledby={titleId}
      className={
        className ??
        'mx-auto flex h-[min(74vh,45rem)] min-h-[34rem] w-full max-w-[41rem] flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_18px_50px_rgb(15_23_42_/_0.16)]'
      }
    >
      <header className="flex min-h-20 items-center gap-3 border-b border-stone-200 bg-white px-3 py-3 shadow-sm sm:px-4">
        {onBackToList && (
          <button
            aria-label="Quay lại danh sách chat"
            className="grid size-10 shrink-0 place-items-center rounded-full text-stone-600 transition hover:bg-stone-100 hover:text-stone-950"
            type="button"
            onClick={onBackToList}
          >
            <ArrowLeft aria-hidden="true" size={21} />
          </button>
        )}
        {selectedPeer ? (
          <UserAvatar className="size-12" user={selectedPeer} />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#f5d3df] text-[#9c2b69]">
            <MessageCircle aria-hidden="true" size={22} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className="truncate text-lg font-black text-stone-950"
          >
            {selectedPeer ? selectedPeer.displayName : 'Tin nhắn'}
          </h2>
          <p className="truncate text-xs font-medium text-stone-500">
            {selectedPeer
              ? `@${selectedPeer.username}`
              : 'Chọn một người để bắt đầu'}
          </p>
        </div>
        {showFloatingActions && (
          <div className="flex shrink-0 items-center gap-1 text-[#8b35c9]">
            <button
              aria-label="Gọi thoại chưa hỗ trợ trong MVP"
              className="grid size-9 place-items-center rounded-full opacity-70"
              disabled
              type="button"
            >
              <Phone aria-hidden="true" size={19} />
            </button>
            <button
              aria-label="Gọi video chưa hỗ trợ trong MVP"
              className="grid size-9 place-items-center rounded-full opacity-70"
              disabled
              type="button"
            >
              <Video aria-hidden="true" size={20} />
            </button>
            <button
              aria-label="Thu nhỏ chat"
              className="grid size-9 place-items-center rounded-full transition hover:bg-[#f3e8ff]"
              type="button"
              onClick={onMinimize}
            >
              <Minus aria-hidden="true" size={21} />
            </button>
            <button
              aria-label="Đóng chat"
              className="grid size-9 place-items-center rounded-full text-[#fb7185] transition hover:bg-rose-50"
              type="button"
              onClick={onClose}
            >
              <X aria-hidden="true" size={25} />
            </button>
          </div>
        )}
      </header>

      <ConversationContent
        currentUser={currentUser}
        error={error}
        isLoading={isLoading}
        messages={messages}
        selectedPeer={selectedPeer}
        onRetry={onRetry}
      />

      <ChatComposer
        allowImageAttachments={allowImageAttachments}
        draft={draft}
        error={sendError}
        imageFile={imageFile}
        isSending={isSending}
        selectedPeer={selectedPeer}
        onDraftChange={onDraftChange}
        onImageChange={onImageChange}
        onSend={onSend}
      />
    </section>
  )
}
