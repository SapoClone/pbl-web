import { axiosClient } from "@/api/axios"

/** What a member is in charge of during a shift (one per shift) */
export type StaffDuty = "shift_lead" | "cashier" | "sales" | "warehouse" | "delivery" | "other"

export type StaffSchedule = {
  id: string
  accountId: string
  staffName: string
  branchId: string
  branchName: string | null
  /** ISO weekday: 1 = Monday ... 7 = Sunday */
  weekday: number
  /** "HH:mm" in the store's timezone (UTC+7) */
  startTime: string
  endTime: string
  name: string | null
  duty: StaffDuty
  note: string | null
}

export type StaffScheduleFilter = {
  branchId?: string
  accountId?: string
  weekday?: number
  duty?: StaffDuty
}

export type CreateStaffScheduleInput = {
  accountId: string
  branchId: string
  weekdays: number[]
  startTime: string
  endTime: string
  name?: string
  duty?: StaffDuty
  note?: string
}

export type UpdateStaffScheduleInput = {
  startTime?: string
  endTime?: string
  name?: string | null
  duty?: StaffDuty
  note?: string | null
}

export const listStaffSchedules = async (filter: StaffScheduleFilter = {}) => {
  const { data } = await axiosClient.get<{ data: StaffSchedule[] }>("/staff-schedules", { params: filter })
  return data.data
}

/** The shifts running at `at` (now when left out): shift leads first */
export const getOnDuty = async (params: { branchId?: string; at?: string } = {}) => {
  const { data } = await axiosClient.get<{ at: string; data: StaffSchedule[] }>("/staff-schedules/on-duty", { params })
  return data
}

/** One row is created per weekday */
export const createStaffSchedule = async (input: CreateStaffScheduleInput) => {
  const { data } = await axiosClient.post<{ data: StaffSchedule[] }>("/staff-schedules", input)
  return data.data
}

export const updateStaffSchedule = async (id: string, input: UpdateStaffScheduleInput) => {
  const { data } = await axiosClient.patch<StaffSchedule>(`/staff-schedules/${id}`, input)
  return data
}

export const deleteStaffSchedule = async (id: string) => {
  await axiosClient.delete(`/staff-schedules/${id}`)
}
