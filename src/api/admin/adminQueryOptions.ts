import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { adminApi } from "./adminApi"

export const adminQueryOptions = {
  dashboard: () =>
    queryOptions({
      queryKey: ["admin", "dashboard"],
      queryFn: adminApi.getDashboard
    }),
  businesses: (params: { search?: string; status?: string; plan?: string; page?: number; pageSize?: number } = {}) =>
    queryOptions({
      queryKey: ["admin", "businesses", params],
      queryFn: () => adminApi.getBusinesses(params)
    }),
  businessDetail: (businessId: string) =>
    queryOptions({
      queryKey: ["admin", "business", businessId],
      queryFn: () => adminApi.getBusinessDetail(businessId)
    }),
  users: (params: { search?: string; role?: string; status?: string; page?: number; pageSize?: number } = {}) =>
    queryOptions({
      queryKey: ["admin", "users", params],
      queryFn: () => adminApi.getUsers(params),
      placeholderData: keepPreviousData
    }),
  userDetail: (businessId: string) =>
    queryOptions({
      queryKey: ["admin", "user-detail", businessId],
      queryFn: () => adminApi.getUserDetail(businessId)
    }),
  businessUsers: (businessId: string, params: { search?: string; role?: string; status?: string; page?: number; pageSize?: number } = {}) =>
    queryOptions({
      queryKey: ["admin", "business", businessId, "users", params],
      queryFn: () => adminApi.getBusinessUsers(businessId, params),
      placeholderData: keepPreviousData
    }),
  plans: () =>
    queryOptions({
      queryKey: ["admin", "plans"],
      queryFn: adminApi.getPlans
    }),
  subscriptions: () =>
    queryOptions({
      queryKey: ["admin", "subscriptions"],
      queryFn: adminApi.getSubscriptions
    }),
  subscriptionsPage: (params: { search?: string; plan?: string; status?: string; cycle?: string; page?: number; pageSize?: number } = {}) =>
    queryOptions({
      queryKey: ["admin", "subscriptions", "page", params],
      queryFn: () => adminApi.getSubscriptionsPage(params),
      placeholderData: keepPreviousData
    }),
  subscriptionDetail: (subscriptionId: string) =>
    queryOptions({
      queryKey: ["admin", "subscription-detail", subscriptionId],
      queryFn: () => adminApi.getSubscriptionDetail(subscriptionId)
    }),
  jobs: () =>
    queryOptions({
      queryKey: ["admin", "jobs"],
      queryFn: adminApi.getJobs
    }),
  jobsPage: (params: { search?: string; status?: "pending" | "retrying" | "resolved"; page?: number; pageSize?: number } = {}) =>
    queryOptions({
      queryKey: ["admin", "jobs", "page", params],
      queryFn: () => adminApi.getJobsPage(params),
      placeholderData: keepPreviousData
    }),
  jobDetail: (jobId: string) =>
    queryOptions({
      queryKey: ["admin", "job-detail", jobId],
      queryFn: () => adminApi.getJobDetail(jobId)
    }),
  limits: () =>
    queryOptions({
      queryKey: ["admin", "limits"],
      queryFn: adminApi.getLimits
    }),
  limitsPage: (params: { search?: string; plan?: string; alert?: string; page?: number; pageSize?: number } = {}) =>
    queryOptions({
      queryKey: ["admin", "limits", "page", params],
      queryFn: () => adminApi.getLimitsPage(params),
      placeholderData: keepPreviousData
    }),
  services: () =>
    queryOptions({
      queryKey: ["admin", "monitoring"],
      queryFn: adminApi.getServices
    }),
  integrations: () =>
    queryOptions({
      queryKey: ["admin", "integrations"],
      queryFn: adminApi.getIntegrations
    }),
  integrationsPage: (params: { search?: string; channel?: string; status?: string; page?: number; pageSize?: number } = {}) =>
    queryOptions({
      queryKey: ["admin", "integrations", "page", params],
      queryFn: () => adminApi.getIntegrationsPage(params),
      placeholderData: keepPreviousData
    }),
  integrationDetail: (integrationId: string) =>
    queryOptions({
      queryKey: ["admin", "integration-detail", integrationId],
      queryFn: () => adminApi.getIntegrationDetail(integrationId),
      enabled: Boolean(integrationId)
    }),
  notifications: () =>
    queryOptions({
      queryKey: ["admin", "notifications"],
      queryFn: adminApi.getNotifications
    })
}

export const adminMutationKeys = {
  businesses: ["admin", "businesses"] as const,
  plans: ["admin", "plans"] as const,
  subscriptions: ["admin", "subscriptions"] as const,
  jobs: ["admin", "jobs"] as const,
  notifications: ["admin", "notifications"] as const
}
