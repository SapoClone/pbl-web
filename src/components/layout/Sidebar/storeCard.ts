import type { TenantContext } from "@/api/platform/context"

export type StoreCard = {
  name: string
  /** `null` when the plan is not known: nothing is shown rather than an invented plan */
  planName: string | null
  branchText: string | null
}

/** What the sidebar's store card shows. Only the demo has a made-up plan; a real store shows what the API says, or nothing. */
export function storeCard(input: { isDemo: boolean; context?: TenantContext; tokenTenantName?: string }): StoreCard {
  const { isDemo, context, tokenTenantName } = input
  if (isDemo) return { name: tokenTenantName ?? "Mộc Store", planName: "Pro", branchText: "3/5 chi nhánh" }
  return {
    name: context?.tenant.name ?? tokenTenantName ?? "Cửa hàng của bạn",
    planName: context?.plan.name ?? null,
    branchText: context ? `${context.branchCount} chi nhánh` : null
  }
}
