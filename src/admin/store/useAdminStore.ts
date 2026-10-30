import { create } from "zustand"
import { businesses as initialBusinesses } from "../data/mockData"
import type { Business } from "../types"

interface AdminUiState {
  isSidebarOpen: boolean
  searchTerm: string
  toastMessage: string | null
  businesses: Business[]
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSearchTerm: (value: string) => void
  showToast: (message: string) => void
  clearToast: () => void
  createBusiness: (business: Business) => void
  updateBusiness: (subscriptionId: string, changes: Partial<Business>) => void
  lockBusiness: (subscriptionId: string) => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useAdminStore = create<AdminUiState>((set) => ({
  isSidebarOpen: false,
  searchTerm: "",
  toastMessage: null,
  businesses: initialBusinesses,
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  showToast: (toastMessage) => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toastMessage })
    toastTimer = setTimeout(() => set({ toastMessage: null }), 2400)
  },
  clearToast: () => set({ toastMessage: null }),
  createBusiness: (business) => set((state) => ({ businesses: [business, ...state.businesses] })),
  updateBusiness: (subscriptionId, changes) => set((state) => ({
    businesses: state.businesses.map((business) => business.subscriptionId === subscriptionId ? { ...business, ...changes } : business)
  })),
  lockBusiness: (subscriptionId) => set((state) => ({
    businesses: state.businesses.map((business) => business.subscriptionId === subscriptionId ? { ...business, status: "Đã khóa" } : business)
  }))
}))
