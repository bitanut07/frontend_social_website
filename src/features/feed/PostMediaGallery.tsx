import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import type { Post } from '../../types/api'

const MAX_GRID_IMAGES = 5
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

interface PostMediaGalleryProps {
  post: Post
}

interface PanPoint {
  x: number
  y: number
}

function mediaUrls(post: Post) {
  const candidates =
    post.imageUrls && post.imageUrls.length > 0
      ? post.imageUrls
      : [post.imageUrl]

  return Array.from(
    new Set(
      candidates
        .map((url) => url.trim())
        .filter((url) => url.length > 0),
    ),
  )
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function imageAlt(post: Post, index: number, total: number) {
  return `Tác phẩm “${post.title}” của ${post.author.displayName}, ảnh ${index + 1} trên ${total}`
}

export function PostMediaGallery({ post }: PostMediaGalleryProps) {
  const urls = useMemo(
    () => mediaUrls(post),
    [post],
  )
  const [failedImages, setFailedImages] = useState<Set<number>>(
    () => new Set(),
  )
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [pan, setPan] = useState<PanPoint>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const imageViewportRef = useRef<HTMLDivElement>(null)
  const lightboxImageRef = useRef<HTMLImageElement>(null)
  const triggerRefs = useRef(new Map<number, HTMLButtonElement>())
  const openedFromIndexRef = useRef<number | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origin: PanPoint
  } | null>(null)
  const isOpen = openIndex !== null

  useEffect(() => {
    setFailedImages(new Set())
    setOpenIndex(null)
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [post.id, urls])

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.setTimeout(() => closeButtonRef.current?.focus(), 0)

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const closeLightbox = () => {
    const triggerIndex = openedFromIndexRef.current
    setOpenIndex(null)
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
    setIsDragging(false)
    window.setTimeout(() => {
      if (triggerIndex !== null) {
        triggerRefs.current.get(triggerIndex)?.focus()
      }
    }, 0)
  }

  const showImage = (index: number) => {
    setOpenIndex((index + urls.length) % urls.length)
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }

  const clampPan = (point: PanPoint, scale: number): PanPoint => {
    const viewport = imageViewportRef.current
    const image = lightboxImageRef.current
    if (!viewport || !image || scale <= MIN_ZOOM) {
      return { x: 0, y: 0 }
    }

    const maxX = Math.max(
      0,
      (image.clientWidth * scale - viewport.clientWidth) / 2,
    )
    const maxY = Math.max(
      0,
      (image.clientHeight * scale - viewport.clientHeight) / 2,
    )
    return {
      x: Math.min(maxX, Math.max(-maxX, point.x)),
      y: Math.min(maxY, Math.max(-maxY, point.y)),
    }
  }

  const applyZoom = (nextZoom: number) => {
    const clampedZoom = clampZoom(nextZoom)
    setZoom(clampedZoom)
    setPan((current) => clampPan(current, clampedZoom))
    if (clampedZoom === MIN_ZOOM) setIsDragging(false)
  }

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeLightbox()
        return
      }
      if (event.key === 'ArrowRight' && urls.length > 1) {
        event.preventDefault()
        setOpenIndex((current) =>
          current === null ? 0 : (current + 1) % urls.length,
        )
        setZoom(MIN_ZOOM)
        setPan({ x: 0, y: 0 })
        return
      }
      if (event.key === 'ArrowLeft' && urls.length > 1) {
        event.preventDefault()
        setOpenIndex((current) =>
          current === null
            ? 0
            : (current - 1 + urls.length) % urls.length,
        )
        setZoom(MIN_ZOOM)
        setPan({ x: 0, y: 0 })
        return
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        applyZoom(zoom + ZOOM_STEP)
        return
      }
      if (event.key === '-') {
        event.preventDefault()
        applyZoom(zoom - ZOOM_STEP)
        return
      }
      if (event.key === '0') {
        event.preventDefault()
        applyZoom(MIN_ZOOM)
        return
      }
      if (event.key !== 'Tab') return

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
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
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, urls.length, zoom])

  const markImageFailed = (index: number) => {
    setFailedImages((current) => new Set(current).add(index))
  }

  const openLightbox = (index: number) => {
    openedFromIndexRef.current = index
    setOpenIndex(index)
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom <= MIN_ZOOM) return
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: pan,
    }
    setIsDragging(true)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.preventDefault()
    setPan(
      clampPan(
        {
          x: drag.origin.x + event.clientX - drag.startX,
          y: drag.origin.y + event.clientY - drag.startY,
        },
        zoom,
      ),
    )
  }

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    dragRef.current = null
    setIsDragging(false)
  }

  const renderFallback = (compact = false) => (
    <span
      role="img"
      aria-label={`Không tải được ảnh tác phẩm ${post.title}`}
      className="grid size-full place-items-center px-4 text-center text-stone-500"
    >
      <span>
        <ImageOff
          aria-hidden="true"
          className={compact ? 'mx-auto size-6' : 'mx-auto size-8'}
        />
        {!compact ? (
          <span className="mt-2 block text-sm">
            Không tải được ảnh tác phẩm
          </span>
        ) : null}
      </span>
    </span>
  )

  const renderGridImage = (
    index: number,
    className: string,
    remainingCount = 0,
  ) => (
    <button
      key={urls[index]}
      ref={(node) => {
        if (node) triggerRefs.current.set(index, node)
        else triggerRefs.current.delete(index)
      }}
      type="button"
      aria-label={`Mở ảnh ${index + 1} trên ${urls.length} của bài ${post.title}`}
      onClick={() => openLightbox(index)}
      className={`group relative block overflow-hidden bg-stone-100 ${className}`}
    >
      {failedImages.has(index) ? (
        renderFallback(true)
      ) : (
        <img
          src={urls[index]}
          alt={imageAlt(post, index, urls.length)}
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => markImageFailed(index)}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.015] motion-reduce:transition-none"
        />
      )}
      {remainingCount > 0 ? (
        <span
          aria-label={`Còn ${remainingCount} ảnh chưa hiển thị`}
          className="absolute inset-0 grid place-items-center bg-stone-950/55 text-3xl font-bold text-white sm:text-4xl"
        >
          +{remainingCount}
        </span>
      ) : null}
    </button>
  )

  if (urls.length === 0) {
    return (
      <div className="aspect-[4/3] overflow-hidden bg-stone-100">
        {renderFallback()}
      </div>
    )
  }

  let gallery: React.ReactNode

  if (urls.length === 1) {
    gallery = (
      <button
        ref={(node) => {
          if (node) triggerRefs.current.set(0, node)
          else triggerRefs.current.delete(0)
        }}
        type="button"
        aria-label={`Mở ảnh 1 trên 1 của bài ${post.title}`}
        onClick={() => openLightbox(0)}
        className="flex max-h-[46rem] min-h-52 w-full items-center justify-center overflow-hidden bg-stone-100"
      >
        {failedImages.has(0) ? (
          <span className="h-72 w-full">{renderFallback()}</span>
        ) : (
          <img
            src={urls[0]}
            alt={imageAlt(post, 0, 1)}
            decoding="async"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => markImageFailed(0)}
            className="h-auto max-h-[46rem] w-auto max-w-full object-contain"
          />
        )}
      </button>
    )
  } else if (urls.length === 2) {
    gallery = (
      <div className="grid grid-cols-2 gap-0.5 bg-white">
        {renderGridImage(0, 'aspect-[4/5]')}
        {renderGridImage(1, 'aspect-[4/5]')}
      </div>
    )
  } else if (urls.length === 3) {
    gallery = (
      <div className="grid grid-cols-2 gap-0.5 bg-white">
        {renderGridImage(0, 'row-span-2 min-h-80')}
        {renderGridImage(1, 'aspect-square')}
        {renderGridImage(2, 'aspect-square')}
      </div>
    )
  } else if (urls.length === 4) {
    gallery = (
      <div className="grid grid-cols-2 gap-0.5 bg-white">
        {urls.slice(0, 4).map((_, index) =>
          renderGridImage(index, 'aspect-square'),
        )}
      </div>
    )
  } else {
    const remainingCount = Math.max(0, urls.length - MAX_GRID_IMAGES)
    gallery = (
      <div className="bg-white">
        <div className="grid grid-cols-2 gap-0.5">
          {renderGridImage(0, 'aspect-[4/5]')}
          {renderGridImage(1, 'aspect-[4/5]')}
        </div>
        <div className="mt-0.5 grid grid-cols-3 gap-0.5">
          {renderGridImage(2, 'aspect-square')}
          {renderGridImage(3, 'aspect-square')}
          {renderGridImage(4, 'aspect-square', remainingCount)}
        </div>
      </div>
    )
  }

  const lightbox =
    openIndex === null
      ? null
      : createPortal(
          <div
            className="fixed inset-0 z-[70] flex bg-stone-950/95"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeLightbox()
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Xem ảnh của bài ${post.title}`}
              className="relative flex size-full flex-col text-white"
            >
              <header className="relative z-10 flex min-h-16 items-center justify-between gap-3 border-b border-white/15 bg-stone-950/80 px-3 py-2 backdrop-blur sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{post.title}</p>
                  <p className="mt-0.5 text-xs text-white/65">
                    {openIndex + 1} / {urls.length}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 p-1">
                  <button
                    type="button"
                    aria-label="Thu nhỏ ảnh"
                    disabled={zoom <= MIN_ZOOM}
                    onClick={() => applyZoom(zoom - ZOOM_STEP)}
                    className="grid size-10 place-items-center rounded-full text-white transition hover:bg-white/15 disabled:opacity-35"
                  >
                    <Minus aria-hidden="true" className="size-5" />
                  </button>
                  <span
                    role="status"
                    aria-live="polite"
                    className="w-12 text-center text-xs font-bold tabular-nums"
                  >
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    aria-label="Phóng to ảnh"
                    disabled={zoom >= MAX_ZOOM}
                    onClick={() => applyZoom(zoom + ZOOM_STEP)}
                    className="grid size-10 place-items-center rounded-full text-white transition hover:bg-white/15 disabled:opacity-35"
                  >
                    <Plus aria-hidden="true" className="size-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Đặt lại mức thu phóng"
                    disabled={zoom === MIN_ZOOM}
                    onClick={() => applyZoom(MIN_ZOOM)}
                    className="hidden size-10 place-items-center rounded-full text-white transition hover:bg-white/15 disabled:opacity-35 sm:grid"
                  >
                    <RotateCcw aria-hidden="true" className="size-4.5" />
                  </button>
                </div>

                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Đóng trình xem ảnh"
                  onClick={closeLightbox}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <X aria-hidden="true" className="size-6" />
                </button>
              </header>

              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div
                  ref={imageViewportRef}
                  role="group"
                  aria-label="Vùng ảnh có thể kéo để di chuyển"
                  className={`flex size-full items-center justify-center overflow-hidden overscroll-contain p-4 sm:p-8 ${
                    zoom > MIN_ZOOM
                      ? isDragging
                        ? 'cursor-grabbing touch-none'
                        : 'cursor-grab touch-none'
                      : 'cursor-default'
                  }`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={stopDragging}
                  onPointerCancel={stopDragging}
                >
                  {failedImages.has(openIndex) ? (
                    renderFallback()
                  ) : (
                    <img
                      ref={lightboxImageRef}
                      src={urls[openIndex]}
                      alt={imageAlt(post, openIndex, urls.length)}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      onError={() => markImageFailed(openIndex)}
                      onDoubleClick={() =>
                        applyZoom(zoom === MIN_ZOOM ? 2 : MIN_ZOOM)
                      }
                      className="block max-h-full max-w-full object-contain select-none will-change-transform"
                      style={{
                        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                      }}
                    />
                  )}
                </div>

                {urls.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Xem ảnh trước"
                      onClick={() => showImage(openIndex - 1)}
                      className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-stone-950/65 text-white shadow-lg transition hover:bg-stone-950 sm:left-5 sm:size-12"
                    >
                      <ChevronLeft aria-hidden="true" className="size-7" />
                    </button>
                    <button
                      type="button"
                      aria-label="Xem ảnh tiếp theo"
                      onClick={() => showImage(openIndex + 1)}
                      className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-stone-950/65 text-white shadow-lg transition hover:bg-stone-950 sm:right-5 sm:size-12"
                    >
                      <ChevronRight aria-hidden="true" className="size-7" />
                    </button>
                  </>
                ) : null}
              </div>
              <p className="sr-only">
                Sau khi phóng to, giữ chuột hoặc chạm và kéo để di chuyển ảnh.
                Dùng phím mũi tên để đổi ảnh, phím cộng hoặc trừ để thu phóng,
                phím 0 để đặt lại và Escape để đóng.
              </p>
            </div>
          </div>,
          document.body,
        )

  return (
    <>
      <div aria-label={`Thư viện ${urls.length} ảnh của bài ${post.title}`}>
        {gallery}
      </div>
      {lightbox}
    </>
  )
}
