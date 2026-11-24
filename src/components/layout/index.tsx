import { useState } from "react"
import { useRouterState } from "@tanstack/react-router"
import { usePermissions } from "@/lib/permissions"
import { navigation } from "@/shared/navigation/navigation"
import { NoAccess } from "./NoAccess"
import { Sidebar } from "./Sidebar/Sidebar"
import { Topbar } from "./Topbar/Topbar"

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  })
  const isAuthPage = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/onboarding-tenant"
  ].includes(pathname)

  const { can } = usePermissions()
  const required = navigation.find((item) =>
    item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)
  )?.permission
  const firstAllowed = navigation.find((item) => can(item.permission))

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("omni_sidebar_collapsed") === "true"
  })

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("omni_sidebar_collapsed", String(next))
      } catch {
        // LocalStorage unavailable in test environment
      }
      return next
    })
  }

  if (isAuthPage) return <>{children}</>

  return (
    <div className="flex min-h-screen bg-slate-50/60 selection:bg-[#16866f]/20 selection:text-[#163d36]">
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <Topbar
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
        />
        <main className="relative flex-1 bg-gradient-to-br from-[#f8faf9] via-[#f3f7f5] to-[#f5f8f6] p-4 sm:px-6 md:px-8 md:py-6">
          <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-emerald-100/35 blur-3xl" />
          <div className="relative z-10">
            {can(required) ? (
              children
            ) : (
              <NoAccess permission={required} homeTo={firstAllowed?.to} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
