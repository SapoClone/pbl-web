import { API_URL } from "@/config/env-config"
import Axios from "axios"

export const axiosClient = Axios.create({
  baseURL: API_URL
})
