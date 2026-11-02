import { FileRoute } from "@tanstack/react-router"
import { AdminApp } from "@/admin/AdminApp"
import { requireAuthentication } from "./auth-guards"

export const Route = new FileRoute('/').createRoute({
  beforeLoad: () => {
    requireAuthentication()
  },
  component: Home
})

function Home() {
  return <AdminApp screen="dashboard" />
}
