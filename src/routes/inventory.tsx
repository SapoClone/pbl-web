import { FileRoute } from "@tanstack/react-router"
import { InventoryPage } from "@/features/inventory/InventoryPage"

export const Route = new FileRoute('/inventory').createRoute({
  component: InventoryPage
})
