import type { PermissionCatalog } from "@/api/platform/roles"

export type PermissionSet = ReadonlySet<string>
export type CheckState = "all" | "some" | "none" | "na"

export const actionLabels: Record<string, string> = {
  view: "Xem",
  create: "Tạo",
  update: "Sửa",
  delete: "Xóa",
  approve: "Duyệt"
}

/** Messages for the backend's role error codes (the `errorCode` of a 400 or 409 answer, R001 to R006 in pbl-api apps/platform/src/constants/error-code.constant.ts) */
export const roleErrorMessages: Record<string, string> = {
  R001: "Tên vai trò đã tồn tại. Hãy chọn tên khác.",
  R002: "Không thể sửa vai trò Chủ cửa hàng.",
  R003: "Có quyền không tồn tại trong danh mục.",
  R004: "Không thể xóa vai trò mặc định.",
  R005: "Vai trò đang được gán cho nhân viên. Hãy chuyển họ sang vai trò khác trước khi xóa.",
  R006: "Vai trò không còn tồn tại. Hãy tải lại trang."
}

export const codeOf = (module: string, action: string) => `${module}.${action}`

/** Codes that exist in the catalog (a module and action pair can be missing, for example `reports.delete`) */
export function applicableCodes(catalog: PermissionCatalog): Set<string> {
  return new Set(catalog.permissions.filter((item) => item.isApplicable).map((item) => item.code))
}

export function isApplicable(catalog: PermissionCatalog, module: string, action: string): boolean {
  return catalog.permissions.some((item) => item.module === module && item.action === action && item.isApplicable)
}

function stateOf(selected: PermissionSet, codes: string[]): CheckState {
  if (codes.length === 0) return "na"
  const on = codes.filter((code) => selected.has(code)).length
  if (on === 0) return "none"
  return on === codes.length ? "all" : "some"
}

export const rowCodes = (catalog: PermissionCatalog, module: string): string[] =>
  catalog.permissions.filter((item) => item.module === module && item.isApplicable).map((item) => item.code)

export const columnCodes = (catalog: PermissionCatalog, action: string): string[] =>
  catalog.permissions.filter((item) => item.action === action && item.isApplicable).map((item) => item.code)

export const rowState = (selected: PermissionSet, catalog: PermissionCatalog, module: string) =>
  stateOf(selected, rowCodes(catalog, module))

export const columnState = (selected: PermissionSet, catalog: PermissionCatalog, action: string) =>
  stateOf(selected, columnCodes(catalog, action))

/** Turns every code of a row or column on, or off when they are all on already */
export function toggleMany(selected: PermissionSet, codes: string[]): Set<string> {
  const next = new Set(selected)
  if (codes.length === 0) return next
  const allOn = codes.every((code) => next.has(code))
  for (const code of codes) {
    if (allOn) next.delete(code)
    else next.add(code)
  }
  return next
}

export function toggleCode(selected: PermissionSet, code: string): Set<string> {
  const next = new Set(selected)
  if (next.has(code)) next.delete(code)
  else next.add(code)
  return next
}

export const sameSet = (a: PermissionSet, b: PermissionSet) => a.size === b.size && [...a].every((code) => b.has(code))

/** Stable order for the request body and for comparing */
export const sortedCodes = (selected: PermissionSet): string[] => [...selected].sort()

/** The codes the backend would store: only codes that exist in the catalog */
export function keepApplicable(selected: PermissionSet, catalog: PermissionCatalog): Set<string> {
  const valid = applicableCodes(catalog)
  return new Set([...selected].filter((code) => valid.has(code)))
}

export function diffPermissions(before: PermissionSet, after: PermissionSet) {
  return {
    added: sortedCodes(new Set([...after].filter((code) => !before.has(code)))),
    removed: sortedCodes(new Set([...before].filter((code) => !after.has(code))))
  }
}
