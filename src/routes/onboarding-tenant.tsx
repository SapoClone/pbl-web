import { FileRoute, redirect } from "@tanstack/react-router"
import { TenantOnboardingPage } from "@/features/onboarding-tenant/TenantOnboardingPage"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

export const Route = new FileRoute("/onboarding-tenant").createRoute({
  beforeLoad: () => {
    const tokens = useStoreAuth.getState().tokens
    if (!tokens?.accessToken) throw redirect({ to: "/login" })
    if (tokens.tenantId || (tokens.tenants?.length ?? 0) > 0) {
      throw redirect({ to: "/" })
    }
  },
  component: TenantOnboardingPage
})
