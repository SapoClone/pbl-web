import { queryOptions } from "@tanstack/react-query"
import { listUsers, type ListUsersParams } from "@/api/platform/users"

export const usersQueryOptions = (params: ListUsersParams = {}) =>
  queryOptions({
    queryKey: ["users", params],
    queryFn: () => listUsers(params)
  })
