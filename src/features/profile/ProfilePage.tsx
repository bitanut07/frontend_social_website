import {
  Bookmark,
  Camera,
  Grid3X3,
  ImageOff,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Settings,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Pagination, Post, User } from '../../types/api'
import { ProfileAvatar } from './ProfileAvatar'

interface ProfilePageProps {
  error?: string | null
  hasMore?: boolean
  isLoading?: boolean
  isLoadingMore?: boolean
  pagination: Pagination | null
  posts: Post[]
  user: User
  onEditProfile: () => void
  onLoadMore?: () => void | Promise<unknown>
  onOpenFeed: () => void
  onRetry?: () => void
}

function roleLabel(user: User) {
  return user.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'
}

function ProfilePostTile({ post }: { post: Post }) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [post.imageUrl])

  return (
    <li className="aspect-square min-w-0 overflow-hidden bg-stone-100">
      {imageFailed || !post.imageUrl.trim() ? (
        <div
          aria-label={`Không tải được ảnh ${post.title}`}
          className="grid size-full place-items-center text-stone-400"
          role="img"
        >
          <ImageOff aria-hidden="true" className="size-7" />
        </div>
      ) : (
        <figure className="group relative size-full">
          <img
            alt={`Tác phẩm “${post.title}”`}
            className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            decoding="async"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={post.imageUrl}
            onError={() => setImageFailed(true)}
          />
          <figcaption className="absolute inset-x-0 bottom-0 hidden bg-stone-950/70 px-2 py-1.5 text-xs font-semibold text-white sm:block">
            <span className="block truncate">{post.title}</span>
          </figcaption>
        </figure>
      )}
    </li>
  )
}

export function ProfilePage({
  error = null,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  pagination,
  posts,
  user,
  onEditProfile,
  onLoadMore,
  onOpenFeed,
  onRetry,
}: ProfilePageProps) {
  const totalPosts = pagination?.totalItems ?? posts.length

  return (
    <section
      aria-labelledby="profile-title"
      className="mx-auto w-full max-w-5xl"
    >
      <header className="border-b border-stone-200 pb-6">
        <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center md:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="flex justify-center sm:block">
            <ProfileAvatar
              className="size-28 border-2 border-white shadow-sm ring-1 ring-stone-200 sm:size-36"
              user={user}
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <h2
                className="min-w-0 truncate text-2xl font-black tracking-tight text-stone-950"
                id="profile-title"
              >
                {user.username}
              </h2>
              <button
                aria-label="Mở thiết lập profile"
                className="grid size-10 place-items-center rounded-full text-stone-700 hover:bg-stone-100"
                type="button"
                onClick={onEditProfile}
              >
                <Settings aria-hidden="true" className="size-5" />
              </button>
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-2 text-center sm:max-w-md sm:text-left">
              <div>
                <dt className="text-xs font-bold tracking-wide text-stone-500 uppercase">
                  Bài viết
                </dt>
                <dd className="mt-1 text-xl font-black text-stone-950">
                  {totalPosts}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-stone-500 uppercase">
                  Vai trò
                </dt>
                <dd className="mt-1 truncate text-sm font-black text-stone-950 sm:text-base">
                  {roleLabel(user)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-stone-500 uppercase">
                  Tài khoản
                </dt>
                <dd className="mt-1 truncate text-sm font-black text-stone-950 sm:text-base">
                  @{user.username}
                </dd>
              </div>
            </dl>

            <div className="mt-5 text-center sm:text-left">
              <p className="text-base font-black text-stone-950">
                {user.displayName}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {roleLabel(user)} Artly
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-bold text-white hover:bg-stone-800"
                type="button"
                onClick={onEditProfile}
              >
                <Pencil aria-hidden="true" className="size-4" />
                Chỉnh sửa profile
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 hover:bg-stone-50"
                type="button"
                onClick={onOpenFeed}
              >
                <Camera aria-hidden="true" className="size-4" />
                Bảng tin
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        aria-label="Mục profile"
        className="grid grid-cols-3 border-b border-stone-200"
        role="tablist"
      >
        <button
          aria-selected="true"
          className="inline-flex min-h-14 items-center justify-center border-b-2 border-stone-950 text-stone-950"
          role="tab"
          type="button"
        >
          <Grid3X3 aria-hidden="true" className="size-5" />
          <span className="sr-only">Bài viết dạng lưới</span>
        </button>
        <button
          aria-disabled="true"
          className="inline-flex min-h-14 items-center justify-center text-stone-400"
          role="tab"
          type="button"
        >
          <Bookmark aria-hidden="true" className="size-5" />
          <span className="sr-only">Đã lưu chưa hỗ trợ</span>
        </button>
        <button
          aria-disabled="true"
          className="inline-flex min-h-14 items-center justify-center text-stone-400"
          role="tab"
          type="button"
        >
          <UserRound aria-hidden="true" className="size-5" />
          <span className="sr-only">Được gắn thẻ chưa hỗ trợ</span>
        </button>
      </div>

      {isLoading ? (
        <div
          aria-label="Đang tải bài viết profile"
          className="grid grid-cols-3 gap-1 py-1 sm:gap-2 sm:py-2"
          role="status"
        >
          {Array.from({ length: 9 }).map((_, index) => (
            <span
              className="aspect-square animate-pulse bg-stone-100"
              key={index}
            />
          ))}
        </div>
      ) : error && posts.length === 0 ? (
        <div
          className="mx-auto my-12 max-w-md rounded-lg border border-amber-300 bg-amber-50 p-5 text-center"
          role="alert"
        >
          <p className="font-bold text-amber-950">{error}</p>
          {onRetry ? (
            <button
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-400 bg-white px-4 text-sm font-bold text-amber-950 hover:bg-amber-100"
              type="button"
              onClick={onRetry}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Thử lại
            </button>
          ) : null}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center" role="status">
          <span className="mx-auto grid size-20 place-items-center rounded-full border-2 border-stone-300 text-stone-700">
            <Camera aria-hidden="true" className="size-9" />
          </span>
          <h3 className="mt-5 text-2xl font-black text-stone-950">
            Chưa có tác phẩm
          </h3>
          <button
            className="mt-5 min-h-11 rounded-md bg-orange-700 px-5 text-sm font-bold text-white hover:bg-orange-800"
            type="button"
            onClick={onOpenFeed}
          >
            Mở bảng tin
          </button>
        </div>
      ) : (
        <>
          {error ? (
            <div
              className="my-4 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <ul
            aria-label={`Bài viết hình ảnh của ${user.displayName}`}
            className="grid grid-cols-3 gap-1 py-1 sm:gap-2 sm:py-2"
          >
            {posts.map((post) => (
              <ProfilePostTile key={post.id} post={post} />
            ))}
          </ul>

          {hasMore && onLoadMore ? (
            <div className="mt-6 text-center">
              <button
                aria-busy={isLoadingMore}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-400 bg-white px-5 text-sm font-bold text-stone-800 hover:border-orange-700 hover:bg-orange-50 disabled:cursor-wait disabled:opacity-60"
                disabled={isLoadingMore}
                type="button"
                onClick={() => void onLoadMore()}
              >
                {isLoadingMore ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 motion-safe:animate-spin motion-reduce:animate-none"
                  />
                ) : null}
                {isLoadingMore ? 'Đang tải…' : 'Xem thêm'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
