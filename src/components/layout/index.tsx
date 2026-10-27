import Sidebar from "./Sidebar/Sidebar"
import { useRouterState } from "@tanstack/react-router"

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAuthPage = ["/login", "/register", "/forgot-password"].includes(pathname)

  if (isAuthPage) return <>{children}</>

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1 bg-[#f7faf9] px-5 pt-4 md:px-8 md:pt-0">{children}</div>
    </div>
  )
}
