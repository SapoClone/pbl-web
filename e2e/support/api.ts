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
