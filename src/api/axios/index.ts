import { API_URL } from "@/config/env-config"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import Axios, { type InternalAxiosRequestConfig } from "axios"

export const axiosClient = Axios.create({
  baseURL: API_URL
})

const refreshClient = Axios.create({
  baseURL: API_URL
})

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

let refreshPromise: Promise<string | null> | null = null

axiosClient.interceptors.request.use((config) => {
  const accessToken = useStoreAuth.getState().tokens?.accessToken

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryableRequestConfig | undefined
    const tokens = useStoreAuth.getState().tokens

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retry ||
      config.url?.endsWith("/auth/refresh") ||
      !tokens?.refreshToken
    ) {
      return Promise.reject(error)
    }

    config._retry = true
    refreshPromise ??= refreshClient
      .post<{ accessToken: string; refreshToken: string; tokenExpires: number }>(
        "/auth/refresh",
        { refreshToken: tokens.refreshToken }
      )
      .then(({ data }) => {
        useStoreAuth.getState().setTokens({ ...tokens, ...data })
        return data.accessToken
      })
      .catch(() => {
        useStoreAuth.getState().clearTokens()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })

    const accessToken = await refreshPromise

    if (!accessToken) {
      return Promise.reject(error)
    }

    config.headers.Authorization = `Bearer ${accessToken}`
    return axiosClient(config)
  }
)
