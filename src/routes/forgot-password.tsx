import { FileRoute } from "@tanstack/react-router"
import { AuthPage } from "@/features/auth/AuthPage"

export const Route = new FileRoute('/forgot-password').createRoute({
  component: () => <AuthPage mode="forgot" />
})
