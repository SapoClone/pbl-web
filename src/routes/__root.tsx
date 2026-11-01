import { Outlet, redirect, rootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { Layout } from "@/components/layout"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

const publicPaths = ["/login", "/register", "/forgot-password"]

export const Route = rootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: ({ location }) => {
    if (
      !publicPaths.includes(location.pathname) &&
      !useStoreAuth.getState().tokens?.accessToken
    ) {
      throw redirect({ to: "/login" })
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
