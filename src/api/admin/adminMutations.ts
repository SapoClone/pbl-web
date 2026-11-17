import {
  useMutation,
  useQueryClient,
  type UseMutationOptions
} from "@tanstack/react-query"
import { adminApi } from "./adminApi"
import { adminMutationKeys } from "./adminQueryOptions"
import type {
  ChangeSubscriptionPlanInput,
  CreateBusinessInput,
  CreateNotificationInput,
  LockBusinessInput,
  RetryJobInput,
  UpdateBusinessInput,
  UpdatePlanInput
} from "./types"

export const adminMutationOptions = {
  createBusiness: () =>
    ({
      mutationFn: (input: CreateBusinessInput) => adminApi.createBusiness(input)
    }),
  updateBusiness: (businessId: string) =>
    ({
      mutationFn: (input: UpdateBusinessInput) =>
        adminApi.updateBusiness(businessId, input)
    }),
  lockBusiness: (businessId: string) =>
    ({
      mutationFn: (input: LockBusinessInput) =>
        adminApi.lockBusiness(businessId, input)
    }),
  updatePlan: (planId: string) =>
    ({
      mutationFn: (input: UpdatePlanInput) =>
        adminApi.updatePlan(planId, input)
    }),
  createPlan: () =>
    ({
      mutationFn: (input: UpdatePlanInput) =>
        adminApi.createPlan(input)
    }),
  changeSubscriptionPlan: (subscriptionId: string) =>
    ({
      mutationFn: (input: ChangeSubscriptionPlanInput) =>
        adminApi.changeSubscriptionPlan(subscriptionId, input)
    }),
  createNotification: () =>
    ({
      mutationFn: (input: CreateNotificationInput) =>
        adminApi.createNotification(input)
    }),
  updateSettings: () =>
    ({
      mutationFn: (input: import("./types").AdminSettings) =>
        adminApi.updateSettings(input)
    }),
  updateNotification: (notificationId: string) =>
    ({
      mutationFn: (input: import("./types").UpdateNotificationInput) =>
        adminApi.updateNotification(notificationId, input)
    }),
  retryJob: () =>
    ({
      mutationFn: (input: RetryJobInput) => adminApi.retryJob(input)
    })
}

export function useAdminMutation<TVariables>(
  options: UseMutationOptions<void, Error, TVariables>,
  invalidationKeys: readonly (readonly unknown[])[]
) {
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    onSuccess: async () => {
      await Promise.all(
        invalidationKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey })
        )
      )
    }
  })
}

export { adminMutationKeys }
