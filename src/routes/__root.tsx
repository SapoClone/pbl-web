import { Outlet, redirect, rootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Layout } from "@/components/layout"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

const publicPaths = ["/login", "/register", "/forgot-password"]
const tenantOnboardingPath = "/onboarding-tenant"

export const Route = rootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: ({ location }) => {
    const tokens = useStoreAuth.getState().tokens
    if (!publicPaths.includes(location.pathname) && !tokens?.accessToken) {
      throw redirect({ to: "/login" })
    }
    if (
      tokens?.accessToken &&
      !tokens.tenantId &&
      (tokens.tenants?.length ?? 0) === 0 &&
      location.pathname !== tenantOnboardingPath
    ) {
      throw redirect({ to: tenantOnboardingPath })
    }
  },
  component: RootComponent
})

function RootComponent() {
  return (
    <>
      <Layout>
        <Outlet />
      </Layout>
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}
