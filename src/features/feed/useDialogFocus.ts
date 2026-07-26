import {
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
} from 'react'

interface DialogFocus {
  dialogRef: RefObject<HTMLDivElement | null>
  titleInputRef: RefObject<HTMLInputElement | null>
  handleDialogKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

export function useDialogFocus(
  open: boolean,
  onRequestClose: () => void,
): DialogFocus {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onRequestCloseRef = useRef(onRequestClose)

  useEffect(() => {
    onRequestCloseRef.current = onRequestClose
  }, [onRequestClose])

  useEffect(() => {
    if (!open) {
      return
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const previousOverflow = document.body.style.overflow
    const appRoot = document.getElementById('root')
    const appWasInert = appRoot?.inert ?? false
    document.body.style.overflow = 'hidden'
    if (appRoot) {
      appRoot.inert = true
    }
    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onRequestCloseRef.current()
    }
    document.addEventListener('keydown', handleDocumentKeyDown)
    titleInputRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown)
      document.body.style.overflow = previousOverflow
      if (appRoot) {
        appRoot.inert = appWasInert
      }
      const previousFocus = previousFocusRef.current
      if (previousFocus?.isConnected) {
        previousFocus.focus()
      } else {
        document
          .querySelector<HTMLElement>('[data-feed-create-trigger="true"]')
          ?.focus()
      }
    }
  }, [open])

  const handleDialogKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== 'Tab' || !dialogRef.current) {
      return
    }

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    )
    const first = focusableElements[0]
    const last = focusableElements.at(-1)

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return { dialogRef, titleInputRef, handleDialogKeyDown }
}
