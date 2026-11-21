import { create } from "zustand"
import type { AuthTokens } from "@/api/auth.types"

const AUTH_STORAGE_KEY = "pbl-auth"

type AuthState = {
  tokens: AuthTokens | null
  setTokens: (tokens: AuthTokens) => void
  clearTokens: () => void
}

const readStoredTokens = (): AuthTokens | null => {
  if (typeof localStorage === "undefined" || typeof localStorage?.getItem !== "function") {
    return null
  }
  const stored = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as AuthTokens
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export const useStoreAuth = create<AuthState>((set) => ({
  tokens: readStoredTokens(),
  setTokens: (tokens) => {
    if (typeof localStorage !== "undefined" && typeof localStorage?.setItem === "function") {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens))
    }
    set({ tokens })
  },
  clearTokens: () => {
    if (typeof localStorage !== "undefined" && typeof localStorage?.removeItem === "function") {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    set({ tokens: null })
  }
}))
