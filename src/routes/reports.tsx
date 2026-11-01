import { FileRoute } from "@tanstack/react-router"
import { ReportsPage } from "@/features/reports/ReportsPage"

export const Route = new FileRoute('/reports').createRoute({
  component: ReportsPage
})
