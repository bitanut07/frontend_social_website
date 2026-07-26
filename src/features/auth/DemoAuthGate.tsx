import {
  AlertCircle,
  Brush,
  KeyRound,
  LoaderCircle,
  LogIn,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ApiClient } from '../../lib/api'
import {
  isResourceId,
  parseResourceId,
  type ResourceId,
  type User,
} from '../../types/api'
import { ProfileAvatar } from '../profile/ProfileAvatar'

const DEMO_SESSION_KEY = 'artly.demoUserId'

interface DemoAuthGateProps {
  dataApi: ApiClient
  children: (userId: ResourceId, signOut: () => Promise<void>) => ReactNode
}

function roleLabel(user: User) {
  return user.role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'
}

function storedDemoUserId() {
  const value = window.localStorage.getItem(DEMO_SESSION_KEY)
  return isResourceId(value) ? parseResourceId(value) : null
}

export function DemoAuthGate({ dataApi, children }: DemoAuthGateProps) {
  const [users, setUsers] = useState<User[]>([])
  const [sessionUserId, setSessionUserId] =
    useState<ResourceId | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')

    dataApi
      .listUsers({ page: 1, pageSize: 50 })
      .then((result) => {
        if (!active) return

        setUsers(result.data)
        const stored = storedDemoUserId()
        const validStored =
          stored && result.data.some((user) => user.id === stored)

        if (validStored) {
          setSessionUserId(stored)
          return
        }

        window.localStorage.removeItem(DEMO_SESSION_KEY)
        setSessionUserId(null)
      })
      .catch((loadError: unknown) => {
        if (!active) return
        setError(
          loadError instanceof Error && loadError.message
            ? loadError.message
            : 'Chưa thể tải tài khoản demo.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [dataApi])

  async function signOut() {
    window.localStorage.removeItem(DEMO_SESSION_KEY)
    setSessionUserId(null)
    setPassword('')
    setLoginError('')
  }

  async function signIn() {
    const normalizedUsername = username
      .trim()
      .replace(/^@+/, '')
      .toLowerCase()
    const normalizedPassword = password.trim()

    if (!normalizedUsername || !normalizedPassword) {
      setLoginError('Nhập username và mật khẩu demo để đăng nhập.')
      return
    }

    setSubmitting(true)
    setLoginError('')

    try {
      const user = await dataApi.loginDemo({
        username: normalizedUsername,
        password: normalizedPassword,
      })
      window.localStorage.setItem(DEMO_SESSION_KEY, user.id)
      setUsers((currentUsers) =>
        currentUsers.some((currentUser) => currentUser.id === user.id)
          ? currentUsers
          : [user, ...currentUsers],
      )
      setUsername(user.username)
      setPassword('')
      setSessionUserId(user.id)
    } catch (signInError: unknown) {
      setLoginError(
        signInError instanceof Error && signInError.message
          ? signInError.message
          : 'Sai tài khoản hoặc mật khẩu demo.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (sessionUserId) return children(sessionUserId, signOut)

  return (
    <main className="auth-canvas min-h-dvh bg-[#FEFAE0] px-4 py-6 text-[#273020] sm:px-6 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100dvh-3rem)] max-w-6xl overflow-hidden border border-[#5F6F52]/25 bg-[#fffdf1] shadow-[0_24px_80px_rgba(95,111,82,0.18)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#5F6F52] p-10 text-[#FEFAE0] lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="auth-brush-stroke" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center border border-[#FEFAE0]/40 bg-[#FEFAE0] text-[#5F6F52]">
                <Brush size={22} />
              </span>
              <div>
                <p className="font-display text-2xl font-bold">Artly</p>
                <p className="font-utility text-[0.65rem] tracking-[0.18em] uppercase opacity-75">
                  Phòng tranh học đường
                </p>
              </div>
            </div>
            <h1 className="font-display mt-20 max-w-lg text-5xl leading-[1.05] font-bold">
              Đăng nhập một tài khoản demo để vào phòng tranh.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[#FEFAE0]/80">
              Mỗi phiên chỉ dùng một tài khoản. Muốn đổi tài khoản, hãy đăng
              xuất rồi đăng nhập lại.
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-3 font-utility text-xs">
            <div className="border-t border-[#FEFAE0]/30 pt-3">
              Bảng tin
            </div>
            <div className="border-t border-[#FEFAE0]/30 pt-3">
              Tin nhắn
            </div>
            <div className="border-t border-[#FEFAE0]/30 pt-3">
              Profile cá nhân
            </div>
          </div>
        </section>

        <section className="flex items-center px-5 py-10 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="grid size-10 place-items-center bg-[#5F6F52] text-[#FEFAE0]">
                <Brush size={20} />
              </span>
              <span className="font-display text-2xl font-bold text-[#5F6F52]">
                Artly
              </span>
            </div>

            <p className="font-utility text-xs font-bold tracking-[0.16em] text-[#B99470] uppercase">
              Tài khoản demo
            </p>
            <h2 className="font-display mt-2 text-4xl font-bold text-[#34402e]">
              Đăng nhập Artly
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5F6F52]">
              Đăng nhập bằng username và mật khẩu như tài khoản thật. Sau khi
              vào app, bạn có thể đăng xuất từ menu avatar ở góc phải.
            </p>

            {loading ? (
              <div className="mt-8 text-sm font-semibold text-[#5F6F52]" role="status">
                <LoaderCircle
                  aria-hidden="true"
                  className="mr-2 inline size-4 motion-safe:animate-spin"
                />
                Đang tải tài khoản demo…
              </div>
            ) : error ? (
              <div
                className="mt-8 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                <p>{error}</p>
                <button
                  className="mt-3 inline-flex min-h-10 items-center gap-2 border border-red-300 bg-white px-3 text-sm font-bold text-red-800 hover:bg-red-100"
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw aria-hidden="true" size={16} />
                  Tải lại
                </button>
              </div>
            ) : (
              <form
                className="mt-8 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  void signIn()
                }}
              >
                <div>
                  <label
                    className="text-sm font-bold text-[#34402e]"
                    htmlFor="demo-username"
                  >
                    Username
                  </label>
                  <div className="mt-2 flex min-h-12 items-center gap-2 border border-[#5F6F52]/25 bg-white px-3 focus-within:border-[#5F6F52]">
                    <UserRound
                      aria-hidden="true"
                      className="size-4 shrink-0 text-[#5F6F52]"
                    />
                    <input
                      autoComplete="username"
                      className="min-h-10 w-full bg-transparent text-sm font-semibold text-[#273020] outline-none placeholder:text-[#8d927e]"
                      id="demo-username"
                      name="username"
                      placeholder="thu.ha.cafe"
                      required
                      type="text"
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value)
                        setLoginError('')
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="text-sm font-bold text-[#34402e]"
                    htmlFor="demo-password"
                  >
                    Mật khẩu
                  </label>
                  <div className="mt-2 flex min-h-12 items-center gap-2 border border-[#5F6F52]/25 bg-white px-3 focus-within:border-[#5F6F52]">
                    <KeyRound
                      aria-hidden="true"
                      className="size-4 shrink-0 text-[#5F6F52]"
                    />
                    <input
                      autoComplete="current-password"
                      className="min-h-10 w-full bg-transparent text-sm font-semibold text-[#273020] outline-none placeholder:text-[#8d927e]"
                      id="demo-password"
                      name="password"
                      placeholder="artly-demo"
                      required
                      type="password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value)
                        setLoginError('')
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[#6d745f]">
                    Mật khẩu demo chung: artly-demo
                  </p>
                </div>

                {loginError ? (
                  <div
                    className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                    role="alert"
                  >
                    <AlertCircle
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0"
                    />
                    <span>{loginError}</span>
                  </div>
                ) : null}

                <button
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#5F6F52] px-4 text-sm font-black text-[#FEFAE0] transition hover:bg-[#46533c] disabled:cursor-not-allowed disabled:bg-[#A9B388]"
                  disabled={
                    submitting || !username.trim() || !password.trim()
                  }
                  type="submit"
                >
                  {submitting ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 motion-safe:animate-spin"
                    />
                  ) : (
                    <LogIn aria-hidden="true" size={18} />
                  )}
                  {submitting ? 'Đang đăng nhập…' : 'Đăng nhập demo'}
                </button>

                {users.length > 0 ? (
                  <div className="border-t border-[#5F6F52]/15 pt-5">
                    <p className="text-xs font-black tracking-[0.14em] text-[#B99470] uppercase">
                      Username mẫu
                    </p>
                    <div className="mt-3 space-y-2">
                      {users.map((user) => (
                        <button
                          className="flex min-h-14 w-full items-center gap-3 border border-[#5F6F52]/15 bg-white px-3 py-2 text-left transition hover:border-[#A9B388] hover:bg-[#f7f5e5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5F6F52]"
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setUsername(user.username)
                            setLoginError('')
                          }}
                        >
                          <ProfileAvatar className="size-9" user={user} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-[#273020]">
                              {user.displayName}
                            </span>
                            <span className="block truncate text-xs font-semibold text-[#5F6F52]">
                              @{user.username} · {roleLabel(user)}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
