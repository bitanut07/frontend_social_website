import { X } from 'lucide-react'
import { useEffect } from 'react'
import type { Message, ResourceId, User } from '../../types/api'
import { ChatListPanel } from './ChatListPanel'
import { ChatPanel } from './ChatPanel'

interface ChatModalProps {
  currentUser: User
  peers: User[]
  selectedPeerId: ResourceId | null
  messages: Message[]
  draft: string
  imageFile?: File | null
  allowImageAttachments?: boolean
  isOpen: boolean
  isLoading?: boolean
  isSending?: boolean
  error?: string | null
  sendError?: string | null
  onClose: () => void
  onDraftChange: (value: string) => void
  onImageChange?: (file: File | null) => void
  onRetry?: () => void
  onSelectPeer: (peerId: ResourceId) => void
  onSend: () => void
}

const floatingPanelClass =
  'flex h-full w-full flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-[0_18px_60px_rgb(15_23_42_/_0.26)]'

export function ChatModal({
  currentUser,
  peers,
  selectedPeerId,
  messages,
  draft,
  imageFile = null,
  allowImageAttachments = true,
  isOpen,
  isLoading = false,
  isSending = false,
  error = null,
  sendError = null,
  onClose,
  onDraftChange,
  onImageChange,
  onRetry,
  onSelectPeer,
  onSend,
}: ChatModalProps) {
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/20 sm:bg-transparent"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        aria-label={selectedPeerId ? 'Hộp chat' : 'Danh sách chat'}
        aria-modal="true"
        className="fixed inset-x-3 bottom-20 top-20 sm:bottom-auto sm:left-auto sm:right-6 sm:top-20 sm:h-[min(78vh,42rem)] sm:w-[27rem]"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {selectedPeerId ? (
          <ChatPanel
            allowImageAttachments={allowImageAttachments}
            className={floatingPanelClass}
            currentUser={currentUser}
            draft={draft}
            error={error}
            imageFile={imageFile}
            isLoading={isLoading}
            isSending={isSending}
            messages={messages}
            peers={peers}
            selectedPeerId={selectedPeerId}
            sendError={sendError}
            showFloatingActions
            onClose={onClose}
            onDraftChange={onDraftChange}
            onImageChange={onImageChange}
            onMinimize={onClose}
            onRetry={onRetry}
            onSend={onSend}
          />
        ) : (
          <div className="relative h-full">
            <button
              aria-label="Đóng danh sách chat"
              className="absolute -right-2 -top-2 z-10 grid size-9 place-items-center rounded-full bg-white text-stone-600 shadow-lg transition hover:bg-stone-100 hover:text-stone-950"
              type="button"
              onClick={onClose}
            >
              <X aria-hidden="true" size={18} />
            </button>
            <ChatListPanel
              className={floatingPanelClass}
              currentUser={currentUser}
              messages={messages}
              peers={peers}
              selectedPeerId={selectedPeerId}
              onSelectPeer={onSelectPeer}
            />
          </div>
        )}
      </div>
    </div>
  )
}
