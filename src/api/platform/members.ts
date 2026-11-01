import { axiosClient } from "@/api/axios"

export type MemberRole = "owner" | "manager" | "cashier"

export type Member = {
  accountId: string
  email: string
  name: string
  role: MemberRole
  createdAt: string
}

export type AddMemberInput = {
  email: string
  role: Exclude<MemberRole, "owner">
}

export const listMembers = async () => {
  const { data } = await axiosClient.get<Member[]>("/tenants/current/members")
  return data
}

export const addMember = async (input: AddMemberInput) => {
  const { data } = await axiosClient.post<Member>("/tenants/current/members", input)
  return data
}

export const changeMemberRole = async (accountId: string, role: AddMemberInput["role"]) => {
  const { data } = await axiosClient.patch<Member>(
    `/tenants/current/members/${accountId}`,
    { role }
  )
  return data
}
