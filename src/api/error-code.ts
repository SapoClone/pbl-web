/** The business `errorCode` of a failed platform call (`R001`, `S001`, ...), or null when the answer has none */
export const apiErrorCode = (error: unknown): string | null => {
  const data = (error as { response?: { data?: { errorCode?: unknown } } })?.response?.data
  return typeof data?.errorCode === "string" ? data.errorCode : null
}
