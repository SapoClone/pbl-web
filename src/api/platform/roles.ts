import { axiosClient } from "@/api/axios"

export type Role = {
  id: string
  name: string
  code: string
  key: string | null
  description: string | null
  isSeeded: boolean
  isOwner: boolean
  memberCount: number
  permissionCount: number
}

/** A role with its permission codes (the owner lists every code of the catalog) */
export type RoleDetail = Role & { permissions: string[] }

export type PermissionModule = { code: string; label: string; actions: string[] }

export type PermissionItem = {
  code: string
  module: string
  action: string
  /** False for module and action pairs that do not exist: the matrix shows a dash */
  isApplicable: boolean
}

export type PermissionCatalog = {
  modules: PermissionModule[]
  /** Column order of the matrix */
  actions: string[]
  permissions: PermissionItem[]
  /** The default matrix of the five seeded roles */
  defaults: Array<{ key: string; name: string; permissions: string[] }>
}

export type RoleInput = {
  name: string
  description?: string | null
  permissions: string[]
}

export const listRoles = async () => {
  const { data } = await axiosClient.get<{ data: Role[] }>("/roles")
  return data.data
}

export const getPermissionCatalog = async () => {
  const { data } = await axiosClient.get<PermissionCatalog>("/permissions")
  return data
}

export const getRole = async (id: string) => {
  const { data } = await axiosClient.get<RoleDetail>(`/roles/${id}`)
  return data
}

export const createRole = async (input: RoleInput) => {
  const { data } = await axiosClient.post<RoleDetail>("/roles", input)
  return data
}

export const updateRole = async (id: string, input: Partial<RoleInput>) => {
  const { data } = await axiosClient.patch<RoleDetail>(`/roles/${id}`, input)
  return data
}

export const deleteRole = async (id: string) => {
  await axiosClient.delete(`/roles/${id}`)
}

/** The backend's error code of a failed call: `R001` name taken, `R002` owner role, `R003` unknown permission, `R004` default role, `R005` role in use, `R006` not found */
export const roleErrorCode = (error: unknown): string | null => {
  const data = (error as { response?: { data?: { errorCode?: unknown } } })?.response?.data
  return typeof data?.errorCode === "string" ? data.errorCode : null
}
