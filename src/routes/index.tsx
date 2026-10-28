import { FileRoute } from "@tanstack/react-router"
import { AdminApp } from "@/admin/AdminApp"

export const Route = new FileRoute('/').createRoute({
  component: Home
})

function Home() {
  return <AdminApp screen="dashboard" />
}
