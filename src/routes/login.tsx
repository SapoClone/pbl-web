import { FileRoute } from "@tanstack/react-router"
import { AuthPage } from "@/features/auth/AuthPage"
import { redirectAuthenticatedUser } from "./auth-guards"


export const Route = new FileRoute("/login").createRoute({
  beforeLoad: () => {
    redirectAuthenticatedUser()
  },
  component: () => <AuthPage mode="login" />
})
