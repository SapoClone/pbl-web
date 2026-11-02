import { axiosClient } from "@/api/axios"

export type MemberRole =
  | "owner"
  | "branch_manager"
  | "sales_staff"
  | "warehouse_staff"
  | "accountant"
  | string
export type MemberStatus = "active" | "locked"

export type Member = {
  accountId: string
  email: string
  name: string
  role: MemberRole
  code: string
  status: MemberStatus
  phone: string | null
  createdAt: string
  roleId: string
  roleName: string
  roleCode: string
  branchIds: string[]
  isOwner: boolean
  lastLoginAt: string | null
  isOnShift: boolean
  scheduleLabel: string | null
}

export type AddMemberInput = {
  email: string
  roleId?: string
  role?: Exclude<MemberRole, "owner">
  branchIds?: string[]
}

export type MemberSummary = {
  total: number
  active: number
  locked: number
  onShift: number
  onShiftByBranch: { branchId: string; branchName: string; count: number }[]
  defaultRoleCount: number
  dataScope: string
}

export const listMembers = async (params?: {
  q?: string
  status?: MemberStatus
  role?: string
}) => {
  const { data } = await axiosClient.get<Member[]>("/tenants/current/members", {
    params
  })
  return data
}

export const addMember = async (input: AddMemberInput) => {
  const { data } = await axiosClient.post<Member>("/tenants/current/members", input)
  return data
}

export const changeMemberRole = async (
  accountId: string,
  input: Pick<AddMemberInput, "roleId" | "role" | "branchIds">
) => {
  const { data } = await axiosClient.patch<Member>(
    `/tenants/current/members/${accountId}`,
    input
  )
  return data
}

export const getMemberSummary = async () => {
  const { data } = await axiosClient.get<MemberSummary>(
    "/tenants/current/members/summary"
  )
  return data
}

export const lockMember = async (accountId: string) => {
  const { data } = await axiosClient.post<Member>(
    `/tenants/current/members/${accountId}/lock`
  )
  return data
}

export const unlockMember = async (accountId: string) => {
  const { data } = await axiosClient.post<Member>(
    `/tenants/current/members/${accountId}/unlock`
  )
  return data
}

export const removeMember = async (accountId: string) => {
  await axiosClient.delete(`/tenants/current/members/${accountId}`)
}
