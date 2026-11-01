import { FileRoute } from "@tanstack/react-router"
import { PosPage } from "@/features/pos/PosPage"

export const Route = new FileRoute('/pos').createRoute({
  component: PosPage
})
