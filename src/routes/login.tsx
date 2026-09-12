import { FileRoute } from "@tanstack/react-router"
import { AuthPage } from "@/components/auth/AuthPage"

export const Route = new FileRoute("/login").createRoute({
  component: () => <AuthPage mode="login" />
})
