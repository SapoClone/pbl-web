import { FileRoute } from "@tanstack/react-router"
import { StaffPage } from "@/features/staff/StaffPage"

export const Route = new FileRoute('/staff').createRoute({
  component: StaffPage
})
