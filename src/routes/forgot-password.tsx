import { FileRoute } from "@tanstack/react-router"
import { AuthPage } from "@/components/auth/AuthPage"

export const Route = new FileRoute("/forgot-password").createRoute({
  component: () => <AuthPage mode="forgot" />
})
