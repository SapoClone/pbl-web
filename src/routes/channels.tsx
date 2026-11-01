import { FileRoute } from "@tanstack/react-router"
import { ChannelsPage } from "@/features/channels/ChannelsPage"

export const Route = new FileRoute('/channels').createRoute({
  component: ChannelsPage
})
