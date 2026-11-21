import { describe, expect, it } from "vitest"
import type { StaffSchedule } from "@/api/platform/staff-schedules"
import { buildGrid, durationMinutes, findOverlaps, formatHours, isoWeekday, validateShift } from "./shiftsGrid"

const shift = (over: Partial<StaffSchedule> & Pick<StaffSchedule, "id" | "accountId" | "weekday" | "startTime" | "endTime">): StaffSchedule => ({
  staffName: over.accountId,
  branchId: "b1",
  branchName: "Quận 1",
  name: null,
  duty: "sales",
  note: null,
  ...over
})

describe("shift validation", () => {
  it("needs a day and two valid times, end after start", () => {
    expect(validateShift({ weekdays: [], startTime: "08:00", endTime: "16:00" })).toMatch(/ít nhất một ngày/)
    expect(validateShift({ weekdays: [1], startTime: "8:00", endTime: "16:00" })).toMatch(/giờ bắt đầu/)
    expect(validateShift({ weekdays: [1], startTime: "16:00", endTime: "16:00" })).toMatch(/sau giờ bắt đầu/)
    expect(validateShift({ weekdays: [1], startTime: "22:00", endTime: "06:00" })).toMatch(/qua đêm/)
    expect(validateShift({ weekdays: [1, 2], startTime: "08:00", endTime: "16:00" })).toBeNull()
  })
})

describe("overlap pre-check", () => {
  const existing = [
    shift({ id: "s1", accountId: "a", weekday: 1, startTime: "08:00", endTime: "12:00" }),
    shift({ id: "s2", accountId: "a", weekday: 2, startTime: "08:00", endTime: "12:00", branchId: "b2" }),
    shift({ id: "s3", accountId: "b", weekday: 1, startTime: "08:00", endTime: "12:00" })
  ]
  it("finds the same person's overlapping shifts on the chosen days, in any branch", () => {
    const found = findOverlaps(existing, "a", { weekdays: [1, 2], startTime: "11:00", endTime: "14:00" })
    expect(found.map((item) => item.id)).toEqual(["s1", "s2"])
  })
  it("lets shifts touch end to start, and ignores other people and other days", () => {
    expect(findOverlaps(existing, "a", { weekdays: [1], startTime: "12:00", endTime: "16:00" })).toEqual([])
    expect(findOverlaps(existing, "a", { weekdays: [3], startTime: "08:00", endTime: "12:00" })).toEqual([])
    expect(findOverlaps(existing, "c", { weekdays: [1], startTime: "08:00", endTime: "12:00" })).toEqual([])
  })
  it("does not count the shift being edited", () => {
    expect(findOverlaps(existing, "a", { weekdays: [1], startTime: "09:00", endTime: "11:00" }, "s1")).toEqual([])
  })
})

describe("weekly grid", () => {
  it("makes one row per person with the day's shifts in time order, and totals the hours", () => {
    const rows = buildGrid(
      [
        shift({ id: "1", accountId: "b", staffName: "Bình", weekday: 1, startTime: "13:00", endTime: "17:00" }),
        shift({ id: "2", accountId: "b", staffName: "Bình", weekday: 1, startTime: "08:00", endTime: "12:00" }),
        shift({ id: "3", accountId: "a", staffName: "An", weekday: 3, startTime: "08:00", endTime: "16:30" })
      ],
      [{ accountId: "c", name: "Chi" }]
    )
    expect(rows.map((row) => row.staffName)).toEqual(["An", "Bình", "Chi"])
    expect(rows[1].byDay.get(1)?.map((item) => item.id)).toEqual(["2", "1"])
    expect(rows[1].minutes).toBe(480)
    expect(rows[0].minutes).toBe(510)
    expect(rows[2].byDay.size).toBe(0)
  })
  it("formats hours and weekdays", () => {
    expect(durationMinutes({ startTime: "08:00", endTime: "16:30" })).toBe(510)
    expect(formatHours(480)).toBe("8 giờ")
    expect(formatHours(510)).toBe("8,5 giờ")
    expect(isoWeekday(new Date(2026, 10, 22))).toBe(7) // Sunday 22 Nov 2026
    expect(isoWeekday(new Date(2026, 10, 23))).toBe(1)
  })
})
