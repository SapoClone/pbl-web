import { axiosClient } from "@/api/axios"

export type BranchStatus = "active" | "inactive"

export type Branch = {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  isWarehouse: boolean
  status: BranchStatus
  createdAt: string
}

type BranchesResponse = {
  data: Branch[]
  pagination?: {
    currentPage: number
    totalPages: number
    totalRecords: number
  }
}

export type CreateBranchInput = {
  name: string
  code: string
  address?: string
  phone?: string
  isWarehouse?: boolean
}

export const listBranches = async () => {
  const { data } = await axiosClient.get<BranchesResponse>("/branches", {
    params: { page: 1, limit: 100 }
  })
  return data
}

export const createBranch = async (input: CreateBranchInput) => {
  const { data } = await axiosClient.post<Branch>("/branches", input)
  return data
}

export const updateBranch = async (
  branchId: string,
  input: Partial<CreateBranchInput> & { status?: BranchStatus }
) => {
  const { data } = await axiosClient.patch<Branch>(`/branches/${branchId}`, input)
  return data
}

export const deleteBranch = async (branchId: string) => {
  await axiosClient.delete(`/branches/${branchId}`)
}
