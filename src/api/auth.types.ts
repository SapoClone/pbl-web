export type AuthTokens = {
  userId: string
  accessToken: string
  refreshToken: string
  tokenExpires: number
  isDemo?: boolean
  tenantId?: string | null
  tenants: Array<{
    id: string
    name: string
    subdomain?: string
    role?: string
    roleId?: string
    roleName?: string
  }>
}