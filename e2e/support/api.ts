import fs from "node:fs"
import { ownerStorageState, readWorld } from "./world"

/**
 * Backend calls for setting up what a flow needs before the part of the UI under test (for example registering the
 * cashier's account). The UI flows themselves never use these to do the thing they are testing.
 */
const base = () => readWorld().gateway

export async function register(email: string, password: string, name: string) {
  const res = await fetch(`${base()}/platform/api/v1/auth/email/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  })
  if (!res.ok) throw new Error(`register ${email} failed: ${res.status} ${await res.text()}`)
}

/** The owner's access token, taken from the session the first spec saved */
export function ownerToken(): string {
  const state = JSON.parse(fs.readFileSync(ownerStorageState, "utf8")) as {
    origins: { localStorage: { name: string; value: string }[] }[]
  }
  const raw = state.origins.flatMap((o) => o.localStorage).find((i) => i.name === "pbl-auth")?.value
  if (!raw) throw new Error("No pbl-auth in the owner session: has 01-auth-and-onboarding run?")
  return (JSON.parse(raw) as { accessToken: string }).accessToken
}

export async function gw<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${ownerToken()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

/**
 * Makes sure the main warehouse of a branch holds at least `min` of a SKU, posting a receipt through the API for the
 * difference. Setup only: a flow that sells stock needs it to be there, it is not what the flow tests. Other specs
 * move the shared store's stock (and a failed earlier run may have used it up), so a selling flow calls this first.
 */
export async function ensureStock(branchId: string, sku: string, min: number): Promise<void> {
  const levels = await gw<{ data: { sku: string; available: number }[] }>(
    `/inventory/api/v1/stock-levels?branchId=${branchId}`,
  )
  const have = levels.data.find((s) => s.sku === sku)?.available ?? 0
  if (have >= min) return
  const warehouses = await gw<{ id: string; isDefault?: boolean }[] | { data: { id: string; isDefault?: boolean }[] }>(
    `/inventory/api/v1/warehouses?branchId=${branchId}`,
  )
  const list = Array.isArray(warehouses) ? warehouses : warehouses.data
  const warehouse = list.find((w) => w.isDefault) ?? list[0]
  if (!warehouse) throw new Error(`branch ${branchId} has no warehouse`)
  const lookup = await gw<{ variant: { id: string } }>(`/catalog/api/v1/products/lookup?sku=${encodeURIComponent(sku)}`)
  await gw("/inventory/api/v1/stock-receipts", {
    method: "POST",
    body: {
      warehouseId: warehouse.id,
      autoPost: true,
      note: `Bổ sung tồn cho bài kiểm thử (${sku})`,
      items: [{ skuId: lookup.variant.id, qty: String(min - have + 10) }],
    },
  })
}
