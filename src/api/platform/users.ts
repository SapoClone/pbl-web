import { axiosClient } from "@/api/axios"

export type User = {
  id: string
  username: string
  email: string
  bio?: string
  image: string
  createdAt: string
  updatedAt: string
}

export type UsersPage = {
  data: User[]
  pagination: {
    currentPage: number
    totalPages: number
    totalRecords: number
    nextPage?: number
    previousPage?: number
  }
}

export type CreateUserInput = {
  username: string
  email: string
  password: string
  bio?: string
  image?: string
}

export type ListUsersParams = {
  page?: number
  limit?: number
  q?: string
}

export const listUsers = async (params: ListUsersParams = {}) => {
  const { data } = await axiosClient.get<UsersPage>("/users", { params })
  return data
}

export const createUser = async (input: CreateUserInput) => {
  const { data } = await axiosClient.post<User>("/users", input)
  return data
}

export const deleteUser = async (userId: string) => {
  await axiosClient.delete(`/users/${userId}`)
}
