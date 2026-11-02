export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "/platform/api/v1"

/**
 * The demo sign-in (admin@gmail.com, mock data in the browser) exists for local development only; a production
 * build has it off unless VITE_ENABLE_DEMO_LOGIN=true is set on purpose.
 */
export const isDemoLoginEnabled = (
  env: { DEV?: boolean; VITE_ENABLE_DEMO_LOGIN?: string } = import.meta.env
) => Boolean(env.DEV) || env.VITE_ENABLE_DEMO_LOGIN === "true"
