import { FileRoute } from "@tanstack/react-router"
import { OverviewPage } from "@/features/overview/OverviewPage"
import { AdminApp } from "@/admin/AdminApp"

export const Route = new FileRoute('/').createRoute({
  component: Home
})

function Home() {
  return <OverviewPage />
  return <AdminApp screen="dashboard" />
}
