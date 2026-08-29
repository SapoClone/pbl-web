import { createRoot } from "react-dom/client"
import { routeTree } from "./routeTree.gen"
import { RouterProvider, Router } from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import "./locales/i18n"
import "./global.css"

const queryClient = new QueryClient()

// Set up a Router instance
const router = new Router({
  routeTree,
  context: {
    queryClient
  },
  defaultPreload: "intent",
  // Since we're using React Query, we don't want loader calls to ever be stale
  // This will ensure that the loader is always called when the route is preloaded or visited
  defaultPreloadStaleTime: 0
})

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById("root")!

if (!rootElement.innerHTML) {
  const root = createRoot(rootElement)
  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
