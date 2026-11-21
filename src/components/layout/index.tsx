import Sidebar from "./Sidebar/Sidebar"
import { useRouterState } from "@tanstack/react-router"

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAuthPage = ["/login", "/register", "/forgot-password", "/onboarding-tenant"].includes(pathname)

  if (isAuthPage) return <>{children}</>

  return (
    <div className="flex min-h-screen bg-slate-50/60 selection:bg-[#16866f]/20 selection:text-[#163d36]">
      <Sidebar />
      <div className="relative min-w-0 flex-1 overflow-x-hidden bg-gradient-to-br from-[#f8faf9] via-[#f3f7f5] to-[#f5f8f6] px-4 py-4 sm:px-6 md:px-8 md:py-6">
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-emerald-100/35 blur-3xl" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  )
}
