import { FileRoute } from "@tanstack/react-router"
import { ShieldCheck } from "lucide-react"
import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder"

export const Route = new FileRoute('/staff').createRoute({
  component: () => <ModulePlaceholder title="Nhân viên & Quyền" description="Quản lý nhân viên, vai trò và quyền truy cập." icon={ShieldCheck} />
})
