import { API_URL } from "@/config/env-config"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import Axios from "axios"

export const axiosClient = Axios.create({
  baseURL: API_URL
})

axiosClient.interceptors.request.use((config) => {
  const accessToken = useStoreAuth.getState().tokens?.accessToken

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (Axios.isAxiosError(error) && error.response?.status === 401) {
      useStoreAuth.getState().clearTokens()
    }

    return Promise.reject(error)
  }
)
