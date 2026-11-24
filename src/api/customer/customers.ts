import { gatewayClient } from "@/api/axios"

const CUSTOMER_API = "/customer/api/v1/customers"

export type CustomerSource =
  | "POS"
  | "WEBSITE"
  | "LAZADA"
  | "SHOPEE"
  | "TIKTOK_SHOP"
  | "OTHER"
  | "STORE"

export type CustomerAddress = {
  id: string
  recipientName?: string | null
  phone?: string | null
  recipientPhone?: string | null
  province?: string | null
  district?: string | null
  ward?: string | null
  addressLine: string
  isDefault?: boolean
}

export type CustomerAddressItem = CustomerAddress

export type Customer = {
  id: string
  code: string
  memberCode?: string | null
  name: string
  phone: string | null
  phoneMasked?: string | null
  email?: string | null
  source?: CustomerSource | string | null
  gender?: string | null
  dateOfBirth?: string | null
  dob?: string | null
  note?: string | null
  status: "ACTIVE" | "INACTIVE" | "ANONYMIZED" | string
  version?: number
  createdAt: string
  updatedAt?: string
  group?: { id: string; code: string; name: string } | null
  customerGroupId?: string | null
  membershipTierId?: string | null
  loyaltyEnabled?: boolean
  pointsBalance?: number | null
  loyaltyPoints?: number
  /** The balance as the full customer rows (`items`) carry it */
  loyalty?: { availablePoints?: number | null } | null
  debtLimit?: string | number | null
  currentDebt?: string | number | null
  address?: string | null
  defaultAddress?: {
    addressLine?: string | null
    ward?: string | null
    district?: string | null
    province?: string | null
  } | null
  tags?: Array<{ id: string; name: string }>
  addresses?: CustomerAddress[]
  orderCount?: number
  totalSpent?: number
}

export type ApiCustomer = Customer

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
  data?: Customer[]
  total: number
  page: number
  limit: number
  nextCursor?: string | null
  pagination?: {
    currentPage: number
    totalPages: number
    totalRecords: number
    nextPage: number | null
  }
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

export type CustomerListParams = {
  q?: string
  search?: string
  page?: number
  limit?: number
  group?: string
  tagId?: string
  source?: string
}

export type CustomerPayload = {
  name: string
  phone: string | null
  email?: string | null
  dateOfBirth?: string | null
  source?: string
  note?: string | null
  initialAddress?: {
    addressLine: string
    ward?: string
    district?: string
    province?: string
  }
}

export type CreateCustomerPayload = CustomerPayload

export type Customer360Summary = {
  profile?: Customer
  loyalty?: {
    pointsBalance?: number
    lifetimePoints?: number
    tierName?: string | null
  } | null
  purchaseSummary?: {
    totalOrders?: number
    totalSpent?: number
    lastOrderAt?: string | null
  } | null
  financialSummary?: {
    currentDebt?: number
    debtLimit?: number
  } | null
}

export const listCustomers = async (
  params: CustomerListParams = {}
): Promise<CustomerListResponse> => {
  const queryParams: Record<string, unknown> = {
    page: params.page ?? 1,
    limit: params.limit ?? 100
  }
  const queryStr = params.q ?? params.search
  if (queryStr) queryParams.q = queryStr
  if (params.group) queryParams.group = params.group
  if (params.tagId) queryParams.tagId = params.tagId
  if (params.source) queryParams.source = params.source

  const res = await gatewayClient.get<CustomerListResponse | Customer[]>(
    CUSTOMER_API,
    { params: queryParams }
  )

  if (Array.isArray(res.data)) {
    return {
      items: res.data,
      total: res.data.length,
      page: params.page ?? 1,
      limit: params.limit ?? 100
    }
  }

  const items = res.data.items ?? res.data.data ?? []
  return {
    ...res.data,
    items,
    total: res.data.total ?? items.length,
    page: res.data.page ?? (params.page ?? 1),
    limit: res.data.limit ?? (params.limit ?? 100)
  }
}

export const getCustomerSummary = async (): Promise<CustomerSummary> =>
  (await gatewayClient.get<CustomerSummary>(`${CUSTOMER_API}/summary`)).data

export const getCustomer = async (id: string): Promise<Customer> =>
  (await gatewayClient.get<Customer>(`${CUSTOMER_API}/${id}`)).data

export const createCustomer = async (
  input: CustomerPayload
): Promise<Customer> =>
  (await gatewayClient.post<Customer>(CUSTOMER_API, input)).data

export const updateCustomer = async (
  id: string,
  input: Partial<CustomerPayload> & { version?: number; tagIds?: string[] }
): Promise<Customer> =>
  (await gatewayClient.patch<Customer>(`${CUSTOMER_API}/${id}`, input)).data

export const deactivateCustomer = async (id: string): Promise<Customer> =>
  (await gatewayClient.delete<Customer>(`${CUSTOMER_API}/${id}`)).data

export const deleteCustomer = async (id: string): Promise<void> => {
  await gatewayClient.delete(`${CUSTOMER_API}/${id}`)
}

export const getCustomer360Summary = async (
  id: string
): Promise<Customer360Summary> => {
  const { data } = await gatewayClient.get<Customer360Summary>(
    `${CUSTOMER_API}/${id}/summary`
  )
  return data
}

export const listCustomerAddresses = async (
  customerId: string
): Promise<CustomerAddressItem[]> => {
  const { data } = await gatewayClient.get<CustomerAddressItem[]>(
    `${CUSTOMER_API}/${customerId}/addresses`
  )
  return Array.isArray(data) ? data : []
}

export const addCustomerAddress = async (
  customerId: string,
  input: {
    recipientName?: string
    phone?: string
    addressLine: string
    ward?: string
    district?: string
    province?: string
    isDefault?: boolean
  }
): Promise<CustomerAddressItem> =>
  (
    await gatewayClient.post<CustomerAddressItem>(
      `${CUSTOMER_API}/${customerId}/addresses`,
      input
    )
  ).data

export const updateCustomerAddress = async (
  customerId: string,
  addressId: string,
  input: { addressLine: string }
): Promise<CustomerAddressItem> =>
  (
    await gatewayClient.patch<CustomerAddressItem>(
      `${CUSTOMER_API}/${customerId}/addresses/${addressId}`,
      input
    )
  ).data

export const removeCustomerAddress = async (
  customerId: string,
  addressId: string
): Promise<void> => {
  await gatewayClient.delete(`${CUSTOMER_API}/${customerId}/addresses/${addressId}`)
}
