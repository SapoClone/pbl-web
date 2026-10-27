import { FileRoute } from "@tanstack/react-router"
import { Truck } from "lucide-react"
import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder"

export const Route = new FileRoute('/suppliers').createRoute({
  component: () => <ModulePlaceholder title="Nhập hàng & nhà cung cấp" description="Quản lý phiếu nhập và nhà cung cấp." icon={Truck} />
})
