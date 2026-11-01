import { FileRoute } from "@tanstack/react-router"
import { SuppliersPage } from "@/features/suppliers/SuppliersPage"

export const Route = new FileRoute('/suppliers').createRoute({
  component: SuppliersPage
})
