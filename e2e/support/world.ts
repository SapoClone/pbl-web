import fs from "node:fs"
import path from "node:path"

/**
 * What the suite knows about the world it built. `global-setup.ts` creates it; specs read it, and a few add to it
 * (for example the first spec records that the store exists).
 */
export type World = { runId: string; gateway: string; storeCreated: boolean }

const authDir = path.resolve(__dirname, "..", ".auth")
const worldFile = path.join(authDir, "world.json")

export const ownerStorageState = path.join(authDir, "owner.json")

export function readWorld(): World {
  return JSON.parse(fs.readFileSync(worldFile, "utf8")) as World
}

export function writeWorld(world: World) {
  fs.mkdirSync(authDir, { recursive: true })
  fs.writeFileSync(worldFile, JSON.stringify(world, null, 2))
}
