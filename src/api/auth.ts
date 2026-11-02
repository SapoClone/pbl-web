import { axiosClient } from "./axios"
import { USE_MOCK_AUTH } from "@/config/env-config"

export type AuthTokens = {
  userId: string
  accessToken: string
  refreshToken: string
  tokenExpires: number
}

export type Credentials = {
  email: string
  password: string
}

const MOCK_USERS_KEY = "pbl-mock-users"
const MOCK_ACCOUNT = {
  email: "admin@omniretail.vn",
  password: "Admin@123"
}

type MockUser = Credentials & { userId: string }

const readMockUsers = (): MockUser[] => {
  const stored = localStorage.getItem(MOCK_USERS_KEY)

  if (!stored) {
    return [{ ...MOCK_ACCOUNT, userId: "mock-admin-001" }]
  }

  try {
    return JSON.parse(stored) as MockUser[]
  } catch {
    localStorage.removeItem(MOCK_USERS_KEY)
    return [{ ...MOCK_ACCOUNT, userId: "mock-admin-001" }]
  }
}

const writeMockUsers = (users: MockUser[]) => {
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users))
}

const createMockTokens = (userId: string): AuthTokens => ({
  userId,
  accessToken: `mock-access-token-${userId}`,
  refreshToken: `mock-refresh-token-${userId}`,
  tokenExpires: Date.now() + 60 * 60 * 1000
})

export const login = async (credentials: Credentials) => {
  if (USE_MOCK_AUTH) {
    const user = readMockUsers().find(
      (candidate) =>
        candidate.email.toLowerCase() === credentials.email.toLowerCase() &&
        candidate.password === credentials.password
    )

    if (!user) {
      throw new Error("Email or password is incorrect.")
    }

    return createMockTokens(user.userId)
  }

  const { data } = await axiosClient.post<AuthTokens>(
    "/auth/email/login",
    credentials
  )
  return data
}

export const register = async (credentials: Credentials) => {
  if (USE_MOCK_AUTH) {
    const users = readMockUsers()
    const exists = users.some(
      (user) => user.email.toLowerCase() === credentials.email.toLowerCase()
    )

    if (exists) {
      throw new Error("An account with this email already exists.")
    }

    const user = { ...credentials, userId: `mock-user-${Date.now()}` }
    writeMockUsers([...users, user])
    return { userId: user.userId }
  }

  const { data } = await axiosClient.post<{ userId: string }>(
    "/auth/email/register",
    credentials
  )
  return data
}

export const requestPasswordReset = async (email: string) => {
  if (USE_MOCK_AUTH) {
    return `Reset instructions requested for ${email}`
  }

  const { data } = await axiosClient.post<string>("/auth/forgot-password", {
    email
  })
  return data
}
