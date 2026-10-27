import { FileRoute } from "@tanstack/react-router"
import { DashboardPage } from "@/components/dashboard/DashboardPage"

export const Route = new FileRoute('/').createRoute({
  component: Home
})

function Home() {
  return <DashboardPage section="overview" />
}
