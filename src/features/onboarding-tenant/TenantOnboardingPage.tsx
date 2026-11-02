import { useState, type FormEvent } from "react"
import axios from "axios"
import { useNavigate } from "@tanstack/react-router"
import { Building2, Loader2, LogOut, Store } from "lucide-react"
import { logout } from "@/api/auth"
import { createTenant } from "@/api/platform/tenants"
import { Button } from "@/components/ui/button"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

const inputClassName =
  "h-12 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#07896f] focus:ring-4 focus:ring-[#07896f]/10"

export function TenantOnboardingPage() {
  const navigate = useNavigate()
  const setTokens = useStoreAuth((state) => state.setTokens)
  const clearTokens = useStoreAuth((state) => state.clearTokens)
  const [name, setName] = useState("")
  const [subdomain, setSubdomain] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const result = await createTenant({ name, subdomain, phone, email, address })
      setTokens(result.auth)
      await navigate({ to: "/" })
    } catch (requestError) {
      const responseData = axios.isAxiosError(requestError)
        ? requestError.response?.data
        : undefined
      const message = responseData?.message
      setError(
        typeof message === "string"
          ? message
          : Array.isArray(message)
            ? message.filter((item): item is string => typeof item === "string").join(" ")
            : "Không thể tạo cửa hàng. Vui lòng kiểm tra thông tin và thử lại."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    setError("")
    setIsSubmitting(true)
    try {
      await logout()
    } catch {
      setError("Không thể thu hồi phiên trên máy chủ, nhưng tài khoản sẽ được đăng xuất khỏi thiết bị.")
    } finally {
      clearTokens()
      await navigate({ to: "/login" })
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7faf9] px-5 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e3f5ef] text-[#07896f]">
              <Store size={22} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#07896f]">Bước cuối</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#163d36]">Tạo cửa hàng của bạn</h1>
              <p className="mt-2 text-sm leading-5 text-slate-500">
                Tài khoản chưa thuộc cửa hàng nào. Hãy tạo một cửa hàng để bắt đầu sử dụng OmniRetail.
              </p>
            </div>
          </div>
          <button type="button" onClick={handleLogout} disabled={isSubmitting} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50">
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
            Tên cửa hàng
            <input className={`${inputClassName} mt-2`} value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} placeholder="Cửa hàng của tôi" />
          </label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
            Mã truy cập cửa hàng
            <span className="relative mt-2 block">
              <input className={`${inputClassName} pl-10`} value={subdomain} onChange={(event) => setSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} required minLength={3} maxLength={30} pattern="[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])" placeholder="cuahang-cua-toi" />
              <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </span>
            <span className="mt-1 block font-normal text-slate-400">3–30 ký tự thường, số hoặc dấu gạch ngang.</span>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Số điện thoại
            <input className={`${inputClassName} mt-2`} value={phone} onChange={(event) => setPhone(event.target.value)} pattern="\+?[0-9]{8,15}" placeholder="+84901234567" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Email cửa hàng
            <input className={`${inputClassName} mt-2`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="shop@example.com" />
          </label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
            Địa chỉ
            <input className={`${inputClassName} mt-2`} value={address} onChange={(event) => setAddress(event.target.value)} maxLength={255} placeholder="Địa chỉ cửa hàng (không bắt buộc)" />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700 sm:col-span-2" role="alert">{error}</p>}
          <Button className="h-12 gap-2 bg-[#07896f] text-white hover:bg-[#06765f] sm:col-span-2" type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
            {isSubmitting ? "Đang tạo cửa hàng..." : "Tạo cửa hàng và bắt đầu"}
          </Button>
        </form>
      </section>
    </main>
  )
}
