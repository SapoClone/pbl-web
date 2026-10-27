import { FileRoute } from "@tanstack/react-router"
import { Share2 } from "lucide-react"
import { ModulePlaceholder } from "@/components/dashboard/ModulePlaceholder"

export const Route = new FileRoute('/channels').createRoute({
  component: () => <ModulePlaceholder title="Kênh bán hàng" description="Kết nối và theo dõi các kênh bán hàng." icon={Share2} />
})
