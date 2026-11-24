import fs from "node:fs"
import path from "node:path"
import { writeWorld } from "./support/world"

/**
 * `E2E_FRESH=1` (what `npm test` sets) starts a new world: a new run id, so emails and the store's access code never
 * clash with an earlier run, and no old session. Without it (`npm run test:spec -- tests/05-...`) a single spec
 * reuses the world the full run built, so it can be developed and re-run without redoing the earlier specs.
 */
export default async function globalSetup() {
  const authDir = path.resolve(__dirname, ".auth")
  if (process.env.E2E_FRESH !== "1" && fs.existsSync(path.join(authDir, "world.json"))) return
  fs.rmSync(authDir, { recursive: true, force: true })
  const gateway = process.env.E2E_GATEWAY_URL ?? "http://localhost:18080"
  const health = await fetch(`${gateway}/platform/health`).catch(() => null)
  if (!health?.ok) {
    throw new Error(`The backend is not reachable at ${gateway} (GET /platform/health). Start the local stack first.`)
  }
  writeWorld({ runId: Date.now().toString(36).slice(-6), gateway, storeCreated: false })
}
