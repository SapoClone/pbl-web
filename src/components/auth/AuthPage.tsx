import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Store
} from "lucide-react"
import axios from "axios"
import { login, register, requestPasswordReset } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

type AuthMode = "login" | "register" | "forgot"

const copy: Record<
  AuthMode,
  { title: string; description: string; submit: string }
> = {
  login: {
    title: "Chào mừng trở lại",
    description: "Đăng nhập để tiếp tục quản lý cửa hàng của bạn.",
    submit: "Đăng nhập"
  },
  register: {
    title: "Tạo tài khoản Omniretail",
    description: "Bắt đầu quản lý mọi kênh bán hàng trên một nền tảng.",
    submit: "Đăng ký"
  },
  forgot: {
    title: "Khôi phục mật khẩu",
    description: "Nhập email để nhận hướng dẫn đặt lại mật khẩu.",
    submit: "Gửi liên kết"
  }
}

const inputClassName =
  "h-12 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#07896f] focus:ring-4 focus:ring-[#07896f]/10"

function BrandIllustration() {
  return (
    <div className="relative mt-8 overflow-hidden rounded-xl bg-[#e7d8bd] shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
      <svg
        className="block aspect-[1.55] w-full"
        viewBox="0 0 620 400"
        role="img"
        aria-label="Minh họa cửa hàng Omniretail"
      >
        <defs>
          <linearGradient id="wall" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#f8eedc" />
            <stop offset="1" stopColor="#d6b994" />
          </linearGradient>
          <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#d7b98d" />
            <stop offset="1" stopColor="#aa805a" />
          </linearGradient>
        </defs>
        <rect width="620" height="400" fill="url(#wall)" />
        <rect y="285" width="620" height="115" fill="url(#floor)" />
        <rect x="32" y="48" width="126" height="190" rx="4" fill="#f7f2df" />
        <path d="M32 48h126v190H32z" fill="none" stroke="#ad8968" strokeWidth="8" />
        <path d="M95 48v190M32 140h126" stroke="#c9a27b" strokeWidth="6" />
        <path d="M35 52 92 95v134H35z" fill="#fff6d8" opacity=".7" />
        <path d="M187 64h285v220H187z" fill="#8c5b36" />
        <path d="M199 78h261v86H199z" fill="#bd8956" />
        <path d="M199 176h261v96H199z" fill="#70462b" />
        <path d="M199 164h261v12H199zM199 272h261v12H199z" fill="#4d301f" />
        <g fill="#eee2c7">
          <rect x="218" y="93" width="20" height="58" rx="6" />
          <rect x="252" y="106" width="18" height="45" rx="6" />
          <rect x="286" y="90" width="20" height="61" rx="6" />
          <rect x="327" y="103" width="21" height="48" rx="6" />
          <rect x="365" y="91" width="19" height="60" rx="6" />
          <rect x="405" y="101" width="25" height="50" rx="6" />
          <rect x="220" y="195" width="24" height="61" rx="6" />
          <rect x="265" y="211" width="19" height="45" rx="6" />
          <rect x="303" y="192" width="22" height="64" rx="6" />
          <rect x="345" y="207" width="23" height="49" rx="6" />
          <rect x="389" y="194" width="20" height="62" rx="6" />
        </g>
        <g fill="#5f927e">
          <rect x="222" y="93" width="12" height="58" rx="6" />
          <rect x="290" y="90" width="12" height="61" rx="6" />
          <rect x="369" y="91" width="11" height="60" rx="6" />
          <rect x="224" y="195" width="14" height="61" rx="6" />
          <rect x="307" y="192" width="14" height="64" rx="6" />
          <rect x="393" y="194" width="12" height="62" rx="6" />
        </g>
        <path d="M510 55h60v230h-60z" fill="#c89868" />
        <path d="M487 58h84v18h-84z" fill="#93603e" />
        <g fill="#476b53">
          <path d="M530 51c-22-29-48-5-27 13-8-2-17 3-13 12 16 10 39 7 40-25Z" />
          <path d="M552 46c26-22 43 6 19 17 9-1 15 7 9 15-17 7-35-3-28-32Z" />
        </g>
        <path d="M0 289h620" stroke="#8d6548" strokeWidth="5" />
      </svg>
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-lg bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e3f5ef] text-[#07896f]">
            <Store size={16} />
          </span>
          <div>
            <p className="text-xs font-semibold text-slate-700">Mọi kênh bán. Một nguồn dữ liệu.</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Sản phẩm · Đơn hàng · Tồn kho</p>
          </div>
        </div>
        <span className="hidden rounded bg-[#e3f5ef] px-2 py-1 text-[10px] font-semibold text-[#07896f] sm:block">
          Không gian minh hoạ
        </span>
      </div>
    </div>
  )
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const setTokens = useStoreAuth((state) => state.setTokens)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const content = copy[mode]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")

    if (mode === "register" && password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.")
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === "login") {
        const tokens = await login({ email, password })
        setTokens(tokens)
        await navigate({ to: "/" })
      } else if (mode === "register") {
        await register({ email, password })
        await navigate({ to: "/login" })
      } else {
        await requestPasswordReset(email)
        setMessage("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi sớm.")
      }
    } catch (requestError) {
      const status = axios.isAxiosError(requestError)
        ? requestError.response?.status
        : undefined
      const responseData = axios.isAxiosError(requestError)
        ? requestError.response?.data
        : undefined
      const responseMessage =
        typeof responseData?.message === "string" ? responseData.message : undefined
      setError(
        responseMessage ||
          (status === 401
            ? "Email hoặc mật khẩu không chính xác."
            : "Không thể hoàn tất yêu cầu. Vui lòng thử lại.")
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 lg:grid lg:grid-cols-[47.2%_52.8%]">
      <section className="relative hidden overflow-hidden bg-[#093b34] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <div className="flex items-center gap-2 text-lg font-medium tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b9eadb]/20 text-[#b9eadb]">
            <Store size={30} />
          </span>
          OmniRetail
        </div>
        <div className="mt-10 max-w-[550px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9fc9bb]">
            Một không gian. Mọi điểm bán.
          </p>
          <h2 className="mt-4 text-[37px] font-medium leading-[1.05] tracking-tight xl:text-[42px]">
            Nhẹ việc vận hành.
            <br />
            Trọn nhịp kinh doanh.
          </h2>
          <p className="mt-4 max-w-[480px] text-xs leading-5 text-[#a8c8c0]">
            Từ quầy bán đến đơn hàng đa kênh, luôn nắm rõ sản phẩm, tồn kho và khách hàng của bạn.
          </p>
          <BrandIllustration />
        </div>
        <div className="mt-auto flex items-center justify-between pt-8 text-[9px] text-[#9fc9bb]">
          <span>© 2026 OmniRetail</span>
          <span>Thiết kế ý tưởng · Dữ liệu minh hoạ</span>
        </div>
      </section>

      <section className="flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-16 xl:px-24">
        <div className="flex justify-end text-xs text-slate-400">
          <button className="flex items-center gap-2 hover:text-slate-700" type="button">
            <Globe2 size={14} />
            Tiếng Việt
            <span className="text-[10px]">⌄</span>
          </button>
        </div>
        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-center py-12">
          <div className="mb-7">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e3f5ef] text-[#07896f]">
              {mode === "forgot" ? <KeyRound size={19} /> : <LockKeyhole size={19} />}
            </div>
            <h1 className="text-[27px] font-semibold tracking-tight text-slate-800">{content.title}</h1>
            <p className="mt-2 text-sm text-slate-400">{content.description}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-xs font-semibold text-slate-700">
              Email hoặc số điện thoại
              <span className="relative mt-2 block">
                <input
                  className={`${inputClassName} pl-10`}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="ban@cuahang.vn"
                  required
                  autoComplete="email"
                />
                <Mail className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={16} />
              </span>
            </label>

            {mode !== "forgot" && (
              <label className="block text-xs font-semibold text-slate-700">
                Mật khẩu
                <span className="relative mt-2 block">
                  <input
                    className={`${inputClassName} pl-10 pr-10`}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                    minLength={8}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={16} />
                  <button
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </label>
            )}

            {mode === "register" && (
              <label className="block text-xs font-semibold text-slate-700">
                Nhập lại mật khẩu
                <input
                  className={`${inputClassName} mt-2`}
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-500">
                  <input className="h-3 w-3 accent-[#07896f]" type="checkbox" />
                  Ghi nhớ đăng nhập
                </label>
                <Link className="font-semibold text-[#07896f] hover:underline" to="/forgot-password">
                  Quên mật khẩu?
                </Link>
              </div>
            )}

            {(error || message) && (
              <p
                className={`rounded-lg px-3 py-2.5 text-xs ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                role="status"
              >
                {error || message}
              </p>
            )}

            <Button
              className="h-12 w-full rounded-lg bg-[#07896f] text-sm font-semibold text-white shadow-sm shadow-[#07896f]/20 hover:bg-[#06765f]"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 animate-spin" size={15} />}
              {content.submit}
              {!isSubmitting && <ArrowRight className="ml-2" size={15} />}
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            {mode === "login" ? (
              <>
                Chưa có cửa hàng?{" "}
                <Link className="font-semibold text-[#07896f] hover:underline" to="/register">
                  Đăng ký OmniRetail
                </Link>
              </>
            ) : (
              <Link className="font-semibold text-[#07896f] hover:underline" to="/login">
                Quay lại đăng nhập
              </Link>
            )}
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-lg bg-[#f4f7f6] px-3 py-3 text-[11px] leading-4 text-slate-400">
            <ShieldCheck className="shrink-0 text-[#9ab7ad]" size={16} />
            Dữ liệu được phân tách theo cửa hàng. Chỉ truy cập các chi nhánh được cấp quyền.
          </div>
        </div>
        <footer className="flex justify-between text-[10px] text-slate-400">
          <span>Điều khoản sử dụng</span>
          <span>Chính sách bảo mật</span>
          <span>Trợ giúp ↗</span>
        </footer>
      </section>
    </main>
  )
}
