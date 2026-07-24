import { MessageCircle } from 'lucide-react'
import { useId } from 'react'
import type { Message, User } from '../../types/api'
import { ChatComposer } from './ChatComposer'
import { ConversationContent } from './ConversationContent'
import { UserAvatar } from './UserAvatar'

export interface ChatPanelProps {
  currentUser: User
  peers: User[]
  selectedPeerId: number | null
  messages: Message[]
  draft: string
  isLoading?: boolean
  isSending?: boolean
  error?: string | null
  sendError?: string | null
  onSelectPeer: (peerId: number) => void
  onDraftChange: (value: string) => void
  onSend: () => void
  onRetry?: () => void
}

export function ChatPanel({
  currentUser,
  peers,
  selectedPeerId,
  messages,
  draft,
  isLoading = false,
  isSending = false,
  error = null,
  sendError = null,
  onSelectPeer,
  onDraftChange,
  onSend,
  onRetry,
}: ChatPanelProps) {
  const titleId = useId()
  const peerSelectId = useId()
  const availablePeers = peers.filter((peer) => peer.id !== currentUser.id)
  const selectedPeer =
    availablePeers.find((peer) => peer.id === selectedPeerId) ?? null

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-h-[34rem] w-full flex-col overflow-hidden border border-slate-200 bg-white shadow-sm"
    >
      <header className="border-b border-slate-200 bg-orange-50 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-700 text-white">
            <MessageCircle aria-hidden="true" size={20} />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-slate-950">
              Tin nhắn
            </h2>
            <p className="text-xs text-slate-600">
              Trao đổi riêng với bạn học và giáo viên
            </p>
          </div>
        </div>

        <label
          className="mt-4 block text-xs font-semibold text-slate-700"
          htmlFor={peerSelectId}
        >
          Trò chuyện với
        </label>
        <select
          id={peerSelectId}
          className="mt-1.5 min-h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-100"
          disabled={availablePeers.length === 0}
          value={selectedPeerId ?? ''}
          onChange={(event) => onSelectPeer(Number(event.target.value))}
        >
          <option disabled value="">
            {availablePeers.length === 0
              ? 'Chưa có tài khoản khác'
              : 'Chọn người nhận'}
          </option>
          {availablePeers.map((peer) => (
            <option key={peer.id} value={peer.id}>
              {peer.displayName} ·{' '}
              {peer.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}
            </option>
          ))}
        </select>
      </header>

      {selectedPeer && (
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <UserAvatar className="size-9" user={selectedPeer} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {selectedPeer.displayName}
            </p>
            <p className="truncate text-xs text-slate-500">
              @{selectedPeer.username}
            </p>
          </div>
        </div>
      )}

      <ConversationContent
        currentUser={currentUser}
        error={error}
        isLoading={isLoading}
        messages={messages}
        selectedPeer={selectedPeer}
        onRetry={onRetry}
      />

      <ChatComposer
        draft={draft}
        error={sendError}
        isSending={isSending}
        selectedPeer={selectedPeer}
        onDraftChange={onDraftChange}
        onSend={onSend}
      />
    </section>
  )
}
