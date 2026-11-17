import { redirect } from "@tanstack/react-router"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

export function requireAuthentication() {
  if (!useStoreAuth.getState().tokens) {
    throw redirect({ to: "/login" })
  }
}

export function redirectAuthenticatedUser() {
  if (useStoreAuth.getState().tokens) {
    throw redirect({ to: "/" })
  }
}
