import {
  ArrowLeft,
  Brush,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

type AuthMode = 'signIn' | 'signUp' | 'forgot' | 'reset'

interface AuthGateProps {
  children: (session: Session, signOut: () => Promise<void>) => ReactNode
}

function messageFrom(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Không thể hoàn tất yêu cầu xác thực'
}

function AuthLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#FEFAE0] px-6">
      <div className="text-center text-[#5F6F52]" role="status">
        <LoaderCircle
          aria-hidden="true"
          className="mx-auto size-7 motion-safe:animate-spin"
        />
        <p className="mt-3 text-sm font-semibold">Đang mở phòng tranh…</p>
      </div>
    </main>
  )
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<AuthMode>(
    window.location.pathname.includes('reset-password')
      ? 'reset'
      : 'signIn',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [accountType, setAccountType] = useState<'STUDENT' | 'TEACHER'>(
    'STUDENT',
  )
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const emailId = useId()
  const passwordId = useId()
  const displayNameId = useId()

  useEffect(() => {
    let mounted = true
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setMode('reset')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')

    try {
      if (mode === 'forgot') {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          })
        if (resetError) throw resetError
        setNotice('Đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra hộp thư.')
        return
      }

      if (mode === 'reset') {
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        })
        if (updateError) throw updateError
        window.history.replaceState({}, '', '/')
        setNotice('Mật khẩu đã được cập nhật.')
        setMode('signIn')
        setPassword('')
        return
      }

      if (mode === 'signUp') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              full_name: displayName.trim(),
              accountType,
            },
          },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setNotice(
            'Tài khoản đã được tạo. Hãy xác nhận email trước khi đăng nhập.',
          )
          setMode('signIn')
        }
        return
      }

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
      if (signInError) throw signInError
    } catch (submitError) {
      setError(messageFrom(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setSubmitting(true)
    setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (oauthError) {
      setError(
        'Google đang chờ cấu hình Client ID/Secret trong Supabase Dashboard.',
      )
      setSubmitting(false)
    }
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut({
      scope: 'local',
    })
    if (signOutError) throw signOutError
    setEmail('')
    setPassword('')
    setNotice('')
    setError('')
  }

  if (loading) return <AuthLoading />
  if (session) return children(session, signOut)

  const isPasswordMode = mode !== 'forgot'
  const title = {
    signIn: 'Trở lại phòng tranh',
    signUp: 'Tạo tài khoản Artly',
    forgot: 'Tìm lại mật khẩu',
    reset: 'Đặt mật khẩu mới',
  }[mode]

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
              Mỗi bài vẽ là một cách nhìn thế giới.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[#FEFAE0]/80">
              Đăng bài thi, nhận phản hồi từ giáo viên và lưu lại hành trình
              sáng tạo trong một không gian an toàn.
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-3 font-utility text-xs">
            <div className="border-t border-[#FEFAE0]/30 pt-3">
              Bài thi &amp; chủ đề
            </div>
            <div className="border-t border-[#FEFAE0]/30 pt-3">
              Phản hồi tử tế
            </div>
            <div className="border-t border-[#FEFAE0]/30 pt-3">
              Thống kê rõ ràng
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

            {mode === 'forgot' || mode === 'reset' ? (
              <button
                className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#5F6F52] hover:text-[#3f4c36]"
                type="button"
                onClick={() => {
                  setMode('signIn')
                  setError('')
                  setNotice('')
                }}
              >
                <ArrowLeft aria-hidden="true" size={17} />
                Quay lại đăng nhập
              </button>
            ) : null}

            <p className="font-utility text-xs font-bold tracking-[0.16em] text-[#B99470] uppercase">
              Không gian dành cho sáng tạo
            </p>
            <h2 className="font-display mt-2 text-4xl font-bold text-[#34402e]">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5F6F52]">
              {mode === 'signUp'
                ? 'Chọn vai trò phù hợp để bắt đầu chia sẻ tác phẩm.'
                : mode === 'forgot'
                  ? 'Nhập email đã đăng ký để nhận liên kết khôi phục.'
                  : mode === 'reset'
                    ? 'Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.'
                    : 'Dùng email và mật khẩu Supabase để tiếp tục.'}
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {mode === 'signUp' ? (
                <>
                  <div>
                    <label
                      className="text-sm font-semibold"
                      htmlFor={displayNameId}
                    >
                      Tên hiển thị
                    </label>
                    <input
                      autoComplete="name"
                      className="auth-input mt-2"
                      id={displayNameId}
                      maxLength={120}
                      required
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </div>
                  <fieldset>
                    <legend className="text-sm font-semibold">
                      Bạn tham gia với vai trò
                    </legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(['STUDENT', 'TEACHER'] as const).map((role) => (
                        <label
                          className={`cursor-pointer border px-3 py-3 text-center text-sm font-semibold ${
                            accountType === role
                              ? 'border-[#5F6F52] bg-[#A9B388]/25 text-[#34402e]'
                              : 'border-[#A9B388]/45 bg-white text-[#5F6F52]'
                          }`}
                          key={role}
                        >
                          <input
                            checked={accountType === role}
                            className="sr-only"
                            name="accountType"
                            type="radio"
                            value={role}
                            onChange={() => setAccountType(role)}
                          />
                          {role === 'STUDENT' ? 'Học sinh' : 'Giáo viên'}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : null}

              {mode !== 'reset' ? (
                <div>
                  <label className="text-sm font-semibold" htmlFor={emailId}>
                    Email
                  </label>
                  <div className="relative mt-2">
                    <Mail
                      aria-hidden="true"
                      className="absolute top-3.5 left-3 size-4 text-[#5F6F52]"
                    />
                    <input
                      autoComplete="email"
                      className="auth-input pl-10"
                      id={emailId}
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              {isPasswordMode ? (
                <div>
                  <label className="text-sm font-semibold" htmlFor={passwordId}>
                    Mật khẩu
                  </label>
                  <div className="relative mt-2">
                    <LockKeyhole
                      aria-hidden="true"
                      className="absolute top-3.5 left-3 size-4 text-[#5F6F52]"
                    />
                    <input
                      autoComplete={
                        mode === 'signIn'
                          ? 'current-password'
                          : 'new-password'
                      }
                      className="auth-input px-10"
                      id={passwordId}
                      minLength={8}
                      pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      aria-label={
                        showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                      }
                      className="absolute top-1 right-1 grid size-10 place-items-center text-[#5F6F52] hover:bg-[#A9B388]/20"
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden="true" size={17} />
                      ) : (
                        <Eye aria-hidden="true" size={17} />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              {error ? (
                <p
                  className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p
                  className="border border-[#A9B388] bg-[#A9B388]/20 px-3 py-2 text-sm text-[#34402e]"
                  role="status"
                >
                  {notice}
                </p>
              ) : null}

              <button
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#5F6F52] px-4 text-sm font-bold text-[#FEFAE0] transition hover:bg-[#4b5941] disabled:cursor-wait disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 motion-safe:animate-spin"
                  />
                ) : null}
                {mode === 'signIn'
                  ? 'Đăng nhập'
                  : mode === 'signUp'
                    ? 'Tạo tài khoản'
                    : mode === 'forgot'
                      ? 'Gửi liên kết khôi phục'
                      : 'Lưu mật khẩu mới'}
              </button>
            </form>

            {mode === 'signIn' ? (
              <>
                <button
                  className="mt-4 w-full text-center text-sm font-semibold text-[#5F6F52] underline-offset-4 hover:underline"
                  type="button"
                  onClick={() => {
                    setMode('forgot')
                    setError('')
                    setNotice('')
                  }}
                >
                  Quên mật khẩu?
                </button>
                <div className="my-6 flex items-center gap-3 text-xs text-[#5F6F52]">
                  <span className="h-px flex-1 bg-[#A9B388]/60" />
                  hoặc
                  <span className="h-px flex-1 bg-[#A9B388]/60" />
                </div>
                <button
                  className="min-h-12 w-full border border-[#5F6F52] bg-white px-4 text-sm font-bold text-[#34402e] hover:bg-[#A9B388]/15 disabled:opacity-60"
                  disabled={submitting}
                  type="button"
                  onClick={handleGoogleSignIn}
                >
                  Tiếp tục với Google
                </button>
              </>
            ) : null}

            {mode === 'signIn' || mode === 'signUp' ? (
              <p className="mt-8 text-center text-sm text-[#5F6F52]">
                {mode === 'signIn'
                  ? 'Chưa có tài khoản? '
                  : 'Đã có tài khoản? '}
                <button
                  className="font-bold text-[#B99470] underline-offset-4 hover:underline"
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signIn' ? 'signUp' : 'signIn')
                    setError('')
                    setNotice('')
                  }}
                >
                  {mode === 'signIn' ? 'Đăng ký' : 'Đăng nhập'}
                </button>
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
