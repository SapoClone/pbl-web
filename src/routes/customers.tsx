import { FileRoute } from "@tanstack/react-router"
import { DashboardPage } from "@/components/dashboard/DashboardPage"

export const Route = new FileRoute('/customers').createRoute({
  component: () => <DashboardPage section="customers" />
})
