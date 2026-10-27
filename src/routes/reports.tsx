import { FileRoute } from "@tanstack/react-router"
import { DashboardPage } from "@/components/dashboard/DashboardPage"

export const Route = new FileRoute('/reports').createRoute({
  component: () => <DashboardPage section="reports" />
})
