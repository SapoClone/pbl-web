import { gatewayClient } from "@/api/axios"

const CUSTOMER_API = "/customer/api/v1/customers"

export type CustomerAddress = {
  id: string
  recipientName: string
  recipientPhone: string | null
  province: string | null
  district: string | null
  ward: string | null
  addressLine: string
  isDefault: boolean
}

export type Customer = {
  id: string
  code: string
  name: string
  phone: string | null
  phoneMasked?: string | null
  email: string | null
  source?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  dob?: string | null
  note: string | null
  status: "ACTIVE" | "INACTIVE" | "ANONYMIZED"
  version: number
  createdAt: string
  group?: { id: string; code: string; name: string } | null
  customerGroupId?: string | null
  tags?: Array<{ id: string; name: string }>
  addresses?: CustomerAddress[]
  orderCount?: number
  totalSpent?: number
  loyaltyPoints?: number
}

export type CustomerDraft = {
  name: string
  phone: string
  email: string
  address: string
  birthday: string
  note: string
}

export type CustomerListResponse = {
  items: Customer[]
  total: number
  page: number
  limit: number
  nextCursor: string | null
  pagination: { currentPage: number; totalPages: number; totalRecords: number; nextPage: number | null }
}

export type CustomerSummary = {
  total: number
  newThisMonth: number
  members: number
  vip: number
  returningRate: number
  returningRateDelta: number
  groupCounts: Record<string, number>
}

type CustomerListParams = { q?: string; page?: number; limit?: number; group?: string; tagId?: string }
type CustomerPayload = {
  name: string
  phone: string | null
  email: string | null
  dateOfBirth: string | null
  note: string | null
  initialAddress?: { addressLine: string }
}

export const listCustomers = async (params: CustomerListParams = {}) =>
  (await gatewayClient.get<CustomerListResponse>(CUSTOMER_API, { params })).data

export const getCustomerSummary = async () =>
  (await gatewayClient.get<CustomerSummary>(`${CUSTOMER_API}/summary`)).data

export const getCustomer = async (id: string) =>
  (await gatewayClient.get<Customer>(`${CUSTOMER_API}/${id}`)).data

export const createCustomer = async (input: CustomerPayload) =>
  (await gatewayClient.post<Customer>(CUSTOMER_API, input)).data

export const updateCustomer = async (id: string, input: Partial<CustomerPayload> & { version: number; tagIds?: string[] }) =>
  (await gatewayClient.patch<Customer>(`${CUSTOMER_API}/${id}`, input)).data

export const deactivateCustomer = async (id: string) =>
  (await gatewayClient.delete<Customer>(`${CUSTOMER_API}/${id}`)).data

export const addCustomerAddress = async (customerId: string, input: { recipientName: string; phone?: string; addressLine: string; isDefault?: boolean }) =>
  (await gatewayClient.post<CustomerAddress>(`${CUSTOMER_API}/${customerId}/addresses`, input)).data

export const updateCustomerAddress = async (customerId: string, addressId: string, input: { addressLine: string }) =>
  (await gatewayClient.patch<CustomerAddress>(`${CUSTOMER_API}/${customerId}/addresses/${addressId}`, input)).data

export const removeCustomerAddress = async (customerId: string, addressId: string) =>
  (await gatewayClient.delete(`${CUSTOMER_API}/${customerId}/addresses/${addressId}`)).data
