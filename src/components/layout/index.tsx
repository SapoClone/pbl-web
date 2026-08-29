import Sidebar from "./Sidebar/Sidebar"

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="w-full px-8">{children}</div>
    </div>
  )
}
