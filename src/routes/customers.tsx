import { FileRoute } from "@tanstack/react-router"
import { CustomersPage } from "@/features/customers/CustomersPage"

export const Route = new FileRoute('/customers').createRoute({
  component: CustomersPage
})
