import { FileRoute } from "@tanstack/react-router"
import { DashboardPage } from "@/components/dashboard/DashboardPage"

export const Route = new FileRoute('/orders').createRoute({
  component: () => <DashboardPage section="orders" />
})
