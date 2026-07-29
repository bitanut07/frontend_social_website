import { useEffect, useRef } from 'react'
import type { Message, ResourceId, User } from '../../types/api'
import { ChatListPanel } from './ChatListPanel'
import { ChatPanel } from './ChatPanel'

interface ChatModalProps {
  currentUser: User
  peers: User[]
  selectedPeerId: ResourceId | null
  messages: Message[]
  readMessageIds?: ReadonlySet<ResourceId>
  draft: string
  imageFile?: File | null
  allowImageAttachments?: boolean
  isOpen: boolean
  isLoading?: boolean
  isSending?: boolean
  error?: string | null
  sendError?: string | null
  onClose: () => void
  onBackToList: () => void
  onDraftChange: (value: string) => void
  onImageChange?: (file: File | null) => void
  onRetry?: () => void
  onSelectPeer: (peerId: ResourceId) => void
  onSend: () => void
}

const floatingPanelClass =
  'flex h-full w-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-[0_18px_60px_rgb(15_23_42_/_0.26)]'

export function ChatModal({
  currentUser,
  peers,
  selectedPeerId,
  messages,
  readMessageIds,
  draft,
  imageFile = null,
  allowImageAttachments = true,
  isOpen,
  isLoading = false,
  isSending = false,
  error = null,
  sendError = null,
  onClose,
  onBackToList,
  onDraftChange,
  onImageChange,
  onRetry,
  onSelectPeer,
  onSend,
}: ChatModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const focusFrame = window.requestAnimationFrame(() => {
      dialog?.querySelector<HTMLElement>(focusableSelector)?.focus()
    })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-stone-950/30 p-3 backdrop-blur-[1px] sm:p-6"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        ref={dialogRef}
        aria-label={selectedPeerId ? 'Hộp chat' : 'Danh sách chat'}
        aria-modal="true"
        className="h-[min(38rem,calc(100dvh-1.5rem))] w-full max-w-[26rem] sm:h-[min(38rem,calc(100dvh-3rem))]"
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
            onBackToList={onBackToList}
            onClose={onClose}
            onDraftChange={onDraftChange}
            onImageChange={onImageChange}
            onRetry={onRetry}
            onSend={onSend}
          />
        ) : (
          <ChatListPanel
            className={floatingPanelClass}
            currentUser={currentUser}
            messages={messages}
            peers={peers}
            readMessageIds={readMessageIds}
            selectedPeerId={selectedPeerId}
            onClose={onClose}
            onSelectPeer={onSelectPeer}
          />
        )}
      </div>
    </div>
  )
}
