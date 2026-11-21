import { gatewayClient } from "@/api/axios"

export type ReceivablePaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "CARD"
  | "E_WALLET"

export type CustomerReceivableItem = {
  id: string
  code: string
  customerId: string
  orderId?: string | null
  branchId?: string | null
  sourceType?: string
  sourceId?: string
  originalAmount: number | string
  paidAmount: number | string
  outstandingAmount: number | string
  status: "OPEN" | "PARTIALLY_PAID" | "PAID" | "CANCELLED" | string
  dueDate?: string | null
  note?: string | null
  createdAt: string
  updatedAt?: string
}

export type CustomerDebtLedgerItem = {
  id: string
  customerId: string
  receivableId?: string | null
  entryType:
    | "RECEIVABLE_RECOGNIZED"
    | "PAYMENT_APPLIED"
    | "ADJUSTMENT"
    | "RETURN_CREDIT"
    | string
  amountDelta: number | string
  balanceBefore: number | string
  balanceAfter: number | string
  paymentMethod?: string | null
  note?: string | null
  occurredAt: string
}

export type CustomerDebtSummary = {
  customerId: string
  creditLimit: number | string
  postedDebt: number | string
  heldCredit: number | string
  availableCredit: number | string
  prepaymentBalance: number | string
  openReceivablesCount: number
  receivables: CustomerReceivableItem[]
  ledger: CustomerDebtLedgerItem[]
}

export type RecordCustomerDebtPaymentInput = {
  amount: number
  paymentMethod?: ReceivablePaymentMethod
  branchId: string
  note?: string
}

export type RecordCustomerDebtPaymentResult = {
  totalAllocated: number | string
  overpaymentAmount: number | string
  customerTotalDebtAfter: number | string
  prepaymentBalanceAfter: number | string
  updatedReceivables?: CustomerReceivableItem[]
}

export const getCustomerDebt = async (
  customerId: string
): Promise<CustomerDebtSummary> => {
  const { data } = await gatewayClient.get<CustomerDebtSummary>(
    `/finance/api/v1/finance/customers/${customerId}/debt`
  )
  return data
}

export const listCustomerReceivables = async (params?: {
  customerId?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<{ data: CustomerReceivableItem[]; total: number }> => {
  const { data } = await gatewayClient.get<{
    data?: CustomerReceivableItem[]
    pagination?: { total?: number }
  }>("/finance/api/v1/finance/receivables", {
    params: {
      limit: params?.limit ?? 30,
      offset: params?.offset ?? 0,
      ...(params?.customerId ? { customerId: params.customerId } : {}),
      ...(params?.status ? { status: params.status } : {})
    }
  })
  return {
    data: data.data ?? [],
    total: data.pagination?.total ?? (data.data?.length ?? 0)
  }
}

export const recordCustomerDebtPayment = async (
  customerId: string,
  input: RecordCustomerDebtPaymentInput
): Promise<RecordCustomerDebtPaymentResult> => {
  const { data } = await gatewayClient.post<RecordCustomerDebtPaymentResult>(
    `/finance/api/v1/finance/customers/${customerId}/debt/payments`,
    input,
    {
      headers: {
        "Idempotency-Key": crypto.randomUUID()
      }
    }
  )
  return data
}
