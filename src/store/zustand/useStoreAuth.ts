import { create } from "zustand"
import type { AuthTokens } from "@/api/auth.types"
import { isDemoLoginEnabled } from "@/config/env-config"

const AUTH_STORAGE_KEY = "pbl-auth"

type AuthState = {
  tokens: AuthTokens | null
  setTokens: (tokens: AuthTokens) => void
  clearTokens: () => void
}

export const readStoredTokens = (): AuthTokens | null => {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!stored) return null

  try {
    const tokens = JSON.parse(stored) as AuthTokens
    // a demo session saved before the demo sign-in was switched off is not a session
    if (tokens.isDemo && !isDemoLoginEnabled()) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return tokens
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export const useStoreAuth = create<AuthState>((set) => ({
  tokens: readStoredTokens(),
  setTokens: (tokens) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens))
    set({ tokens })
  },
  clearTokens: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    set({ tokens: null })
  }
}))
