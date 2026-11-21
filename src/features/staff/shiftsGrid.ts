import type { StaffDuty, StaffSchedule } from "@/api/platform/staff-schedules"

/** Monday first, as the ISO weekday of the API */
export const weekdays: Array<{ value: number; short: string; long: string }> = [
  { value: 1, short: "T2", long: "Thứ hai" },
  { value: 2, short: "T3", long: "Thứ ba" },
  { value: 3, short: "T4", long: "Thứ tư" },
  { value: 4, short: "T5", long: "Thứ năm" },
  { value: 5, short: "T6", long: "Thứ sáu" },
  { value: 6, short: "T7", long: "Thứ bảy" },
  { value: 7, short: "CN", long: "Chủ nhật" }
]

export const dutyOptions: Array<{ value: StaffDuty; label: string; hint: string; tone: string }> = [
  { value: "shift_lead", label: "Trưởng ca", hint: "Điều hành ca, người liên hệ khi có sự cố", tone: "bg-amber-50 text-amber-800 border-amber-200" },
  { value: "cashier", label: "Thu ngân", hint: "Quầy thu tiền và tiền trong két", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { value: "sales", label: "Bán hàng", hint: "Phục vụ khách tại cửa hàng", tone: "bg-sky-50 text-sky-800 border-sky-200" },
  { value: "warehouse", label: "Kho", hint: "Nhận, xếp và kiểm hàng", tone: "bg-violet-50 text-violet-800 border-violet-200" },
  { value: "delivery", label: "Giao hàng", hint: "Đóng gói và giao cho đơn vị vận chuyển", tone: "bg-orange-50 text-orange-800 border-orange-200" },
  { value: "other", label: "Khác", hint: "Việc khác", tone: "bg-slate-100 text-slate-700 border-slate-200" }
]

export const dutyLabel = (duty: StaffDuty) => dutyOptions.find((item) => item.value === duty)?.label ?? duty
export const dutyTone = (duty: StaffDuty) => dutyOptions.find((item) => item.value === duty)?.tone ?? dutyOptions[5].tone

/** Messages for the backend's schedule errors (the `errorCode` of the answer) */
export const scheduleErrorMessages: Record<string, string> = {
  S001: "Nhân viên đã có ca trùng giờ trong ngày này (ở bất kỳ chi nhánh nào). Hãy đổi giờ hoặc xóa ca cũ."
}

export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

export const formatRange = (shift: Pick<StaffSchedule, "startTime" | "endTime">) => `${shift.startTime}–${shift.endTime}`

/** Hours of a shift, for the weekly total ("7,5 giờ") */
export const durationMinutes = (shift: Pick<StaffSchedule, "startTime" | "endTime">) => toMinutes(shift.endTime) - toMinutes(shift.startTime)

export function formatHours(minutes: number): string {
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace(".", ",")} giờ`
}

export type ShiftDraft = { startTime: string; endTime: string; weekdays: number[] }

/** What is wrong with a draft before it is sent; null when it can be sent (the server still checks overlaps) */
export function validateShift(draft: ShiftDraft): string | null {
  if (draft.weekdays.length === 0) return "Chọn ít nhất một ngày trong tuần."
  if (!isTime(draft.startTime) || !isTime(draft.endTime)) return "Nhập giờ bắt đầu và giờ kết thúc."
  if (toMinutes(draft.endTime) <= toMinutes(draft.startTime)) {
    return "Giờ kết thúc phải sau giờ bắt đầu. Ca qua đêm chưa được hỗ trợ: hãy tách thành hai ca."
  }
  return null
}

type Span = Pick<StaffSchedule, "weekday" | "startTime" | "endTime" | "id" | "accountId">

/** Shifts of the same person that would overlap the draft (any branch): the server refuses these with S001 */
export function findOverlaps(existing: Span[], accountId: string, draft: ShiftDraft, ignoreId?: string): Span[] {
  const start = toMinutes(draft.startTime)
  const end = toMinutes(draft.endTime)
  return existing.filter(
    (shift) =>
      shift.accountId === accountId &&
      shift.id !== ignoreId &&
      draft.weekdays.includes(shift.weekday) &&
      toMinutes(shift.startTime) < end &&
      start < toMinutes(shift.endTime)
  )
}

export type GridRow = { accountId: string; staffName: string; byDay: Map<number, StaffSchedule[]>; minutes: number }

/** One row per person, each weekday's shifts in time order; rows by name */
export function buildGrid(shifts: StaffSchedule[], people: Array<{ accountId: string; name: string }> = []): GridRow[] {
  const rows = new Map<string, GridRow>()
  const row = (accountId: string, staffName: string): GridRow => {
    let found = rows.get(accountId)
    if (!found) {
      found = { accountId, staffName, byDay: new Map(), minutes: 0 }
      rows.set(accountId, found)
    }
    return found
  }
  for (const person of people) row(person.accountId, person.name)
  for (const shift of shifts) {
    const target = row(shift.accountId, shift.staffName)
    const day = target.byDay.get(shift.weekday) ?? []
    day.push(shift)
    target.byDay.set(shift.weekday, day)
    target.minutes += durationMinutes(shift)
  }
  for (const target of rows.values()) {
    for (const day of target.byDay.values()) day.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
  }
  return [...rows.values()].sort((a, b) => a.staffName.localeCompare(b.staffName, "vi"))
}

/** ISO weekday (1 = Monday ... 7 = Sunday) of a date, in the local clock */
export const isoWeekday = (date: Date): number => (date.getDay() === 0 ? 7 : date.getDay())
