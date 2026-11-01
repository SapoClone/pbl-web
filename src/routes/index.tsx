import { FileRoute } from "@tanstack/react-router"
import { OverviewPage } from "@/features/overview/OverviewPage"

export const Route = new FileRoute('/').createRoute({
  component: Home
})

function Home() {
  return <OverviewPage />
}
