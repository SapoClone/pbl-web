export type AuthTokens = {
  userId: string
  accessToken: string
  refreshToken: string
  tokenExpires: number
  isDemo?: boolean
  tenantId?: string | null
  tenants?: Array<{
    id: string
    name?: string
  }>
}