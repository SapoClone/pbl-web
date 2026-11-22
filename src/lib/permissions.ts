import { useStoreAuth } from "@/store/zustand/useStoreAuth"

/** `null`: the permissions are not known (demo mode, a token that cannot be read), so nothing is hidden and the API decides */
export type PermissionList = readonly string[] | null

const WILDCARD = "*"

function decodeClaims(accessToken: string): Record<string, unknown> | null {
  const part = accessToken.split(".")[1]
  if (!part) return null
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/")
    const json = decodeURIComponent(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    )
    const claims = JSON.parse(json)
    return claims && typeof claims === "object" ? claims : null
  } catch {
    return null
  }
}

/** The `perms` claim of the access token: `["*"]` for the owner, else the codes of the member's role */
export function permissionsFromToken(accessToken: string | undefined | null): PermissionList {
  if (!accessToken) return null
  const perms = decodeClaims(accessToken)?.perms
  return Array.isArray(perms) && perms.every((item) => typeof item === "string") ? (perms as string[]) : null
}

/** Whether the permissions allow `code` (`orders.view`); unknown permissions allow everything, the API still refuses */
export function can(perms: PermissionList, code: string | undefined): boolean {
  if (!code || perms === null) return true
  return perms.includes(WILDCARD) || perms.includes(code)
}

export const canAny = (perms: PermissionList, codes: readonly string[]): boolean => codes.some((code) => can(perms, code))

export function usePermissions() {
  const tokens = useStoreAuth((state) => state.tokens)
  const perms: PermissionList = tokens?.isDemo ? null : permissionsFromToken(tokens?.accessToken)
  return { perms, can: (code?: string) => can(perms, code) }
}
