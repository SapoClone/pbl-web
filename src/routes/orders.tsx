import { FileRoute } from "@tanstack/react-router"
import { OrdersPage } from "@/features/orders/OrdersPage"

export const Route = new FileRoute('/orders').createRoute({
  component: OrdersPage
})
