import Sidebar from "./Sidebar/Sidebar"
import { useRouterState } from "@tanstack/react-router"

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAuthPage = ["/login", "/register", "/forgot-password"].includes(pathname)

  if (isAuthPage) return <>{children}</>

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="w-full px-8">{children}</div>
    </div>
  )
}
