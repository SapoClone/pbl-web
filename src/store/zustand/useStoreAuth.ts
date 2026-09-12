import { create } from "zustand"
import type { AuthTokens } from "@/api/auth"

const AUTH_STORAGE_KEY = "pbl-auth"

type AuthState = {
  tokens: AuthTokens | null
  setTokens: (tokens: AuthTokens) => void
  clearTokens: () => void
}

const readStoredTokens = (): AuthTokens | null => {
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
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens))
    set({ tokens })
  },
  clearTokens: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    set({ tokens: null })
  }
}))
