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

export const listRoles = async () => {
  const { data } = await axiosClient.get<{ data: Role[] }>("/roles")
  return data.data
}
