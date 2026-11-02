import { FileRoute, redirect } from "@tanstack/react-router"
import { SettingsPage } from "@/features/settings/SettingsPage"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

export const Route = new FileRoute("/settings").createRoute({
  beforeLoad: () => {
    if (!useStoreAuth.getState().tokens?.accessToken) throw redirect({ to: "/login" })
  },
  component: SettingsPage
})
