import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowRight, BarChart3, Check, KeyRound, Loader2, LockKeyhole, Mail, ShoppingBag, Store } from "lucide-react"
import { login, register, requestPasswordReset } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import axios from "axios"

type AuthMode = "login" | "register" | "forgot"

const copy: Record<
  AuthMode,
  { eyebrow: string; title: string; description: string; submit: string }
> = {
  login: {
    eyebrow: "Sales hub access",
    title: "Run every channel from one place",
    description: "Sign in to manage orders, inventory and customers across your entire sales operation.",
    submit: "Sign in"
  },
  register: {
    eyebrow: "Build your sales hub",
    title: "Create your workspace",
    description: "Bring your storefronts, marketplaces and customer orders together in one clear view.",
    submit: "Create account"
  },
  forgot: {
    eyebrow: "Account recovery",
    title: "Get back to your sales hub",
    description: "Enter your work email and we will send instructions to reset your password.",
    submit: "Send reset link"
  }
}

const inputClassName =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate()
  const setTokens = useStoreAuth((state) => state.setTokens)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const content = copy[mode]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setMessage("")

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.")
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
        setMessage("Account created. Check your email to verify it, then sign in.")
        await navigate({ to: "/login" })
      } else {
        await requestPasswordReset(email)
        setMessage("If that email exists, reset instructions will arrive shortly.")
      }
    } catch (requestError) {
      const status = axios.isAxiosError(requestError)
        ? requestError.response?.status
        : undefined
      const responseMessage = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : undefined
      setError(
        responseMessage ||
          (status === 401
          ? "Email or password is incorrect."
          : "We could not complete that request. Please try again.")
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f2f7fc] text-slate-950 lg:grid lg:grid-cols-[minmax(400px,0.9fr)_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[#092b57] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-32 top-16 h-96 w-96 rounded-full border-[5rem] border-blue-400/10" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-500/10" />
        <div className="relative">
          <Link to="/" className="flex items-center gap-3 text-2xl font-bold tracking-[0.16em] text-blue-200">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white"><Store size={20} /></span>
            Sapo Clone
          </Link>
          <div className="mt-24 max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">One command center</p>
            <p className="mt-4 font-serif text-5xl leading-[1.05] tracking-tight">More channels. One clear view.</p>
            <p className="mt-6 max-w-sm text-sm leading-6 text-blue-100/70">Keep orders moving and make confident decisions with your whole business in sync.</p>
          </div>
          <div className="mt-12 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><ShoppingBag className="mb-5 text-blue-300" size={20} /><p className="text-2xl font-semibold">24/7</p><p className="mt-1 text-xs text-blue-100/60">Order visibility</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><BarChart3 className="mb-5 text-blue-300" size={20} /><p className="text-2xl font-semibold">All-in-one</p><p className="mt-1 text-xs text-blue-100/60">Channel overview</p></div>
          </div>
        </div>
        <div className="relative flex items-center gap-3 text-sm text-blue-100/60">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-[#092b57]"><Check size={14} strokeWidth={3} /></span>
          Your business, in sync
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Link to="/" className="flex items-center gap-3 text-sm font-bold tracking-[0.16em] text-[#0b55a0]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1261b5] text-white"><Store size={18} /></span>
              Sapo Clone
            </Link>
          </div>
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1261b5] text-white shadow-lg shadow-blue-600/20">
              {mode === "forgot" ? <KeyRound size={20} /> : <LockKeyhole size={20} />}
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#1261b5]">{content.eyebrow}</p>
            <h1 className="font-serif text-4xl tracking-tight text-[#092b57] sm:text-5xl">{content.title}</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">{content.description}</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-semibold text-slate-700">
                Work email
              <span className="relative mt-2 block">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input className={`${inputClassName} pl-11`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required autoComplete="email" />
              </span>
            </label>

            {mode !== "forgot" && (
              <label className="block text-sm font-semibold text-slate-700">
                Password
                <input className={`${inputClassName} mt-2`} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </label>
            )}

            {mode === "register" && (
              <label className="block text-sm font-semibold text-slate-700">
                Confirm password
                <input className={`${inputClassName} mt-2`} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" required minLength={8} autoComplete="new-password" />
              </label>
            )}

            {(error || message) && (
              <p className={`rounded-xl px-4 py-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`} role="status">
                {error || message}
              </p>
            )}

            <Button className="h-12 w-full rounded-xl bg-[#1261b5] text-white shadow-lg shadow-blue-600/15 hover:bg-[#0b55a0]" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 animate-spin" size={17} /> : null}
              {content.submit}
              {!isSubmitting && <ArrowRight className="ml-2" size={17} />}
            </Button>
          </form>

          <div className="mt-7 flex flex-wrap justify-between gap-3 text-sm">
            {mode === "login" && <Link className="font-semibold text-[#1261b5] hover:underline" to="/forgot-password">Forgot password?</Link>}
            {mode !== "login" && <Link className="font-semibold text-[#1261b5] hover:underline" to="/login">Back to sign in</Link>}
            {mode === "login" ? <Link className="font-semibold text-slate-500 hover:text-slate-900" to="/register">Create a workspace</Link> : null}
          </div>
        </div>
      </section>
    </main>
  )
}
