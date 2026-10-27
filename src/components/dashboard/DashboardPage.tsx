import { Catalog } from "./Catalog"
import { Customers } from "./Customers"
import { DashboardHeader } from "./DashboardHeader"
import { OrderTable } from "./OrderTable"
import { Overview } from "./Overview"
import { Reports } from "./Reports"
import type { DashboardSection } from "./dashboard.types"

export type { DashboardSection } from "./dashboard.types"

export function DashboardPage({ section }: { section: DashboardSection }) {
  const showCreate = section === "orders" || section === "products"

  return (
    <main className="mx-auto max-w-[1520px] py-10">
      <DashboardHeader section={section} onCreate={showCreate ? () => undefined : undefined} />
      {section === "overview" && <Overview />}
      {section === "orders" && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><OrderTable /></section>}
      {(section === "products" || section === "inventory") && <Catalog section={section} />}
      {section === "customers" && <Customers />}
      {section === "reports" && <Reports />}
    </main>
  )
}
