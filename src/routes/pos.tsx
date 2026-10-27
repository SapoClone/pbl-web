import { FileRoute } from "@tanstack/react-router"
import { Monitor } from "lucide-react"
import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder"

export const Route = new FileRoute('/pos').createRoute({
  component: () => <ModulePlaceholder title="Bán tại quầy" description="Quản lý đơn bán trực tiếp tại cửa hàng." icon={Monitor} />
})
