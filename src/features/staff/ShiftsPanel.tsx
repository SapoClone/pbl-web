import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CalendarClock, Clock, Plus, Trash2, UserRound, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { apiErrorCode } from "@/api/error-code"
import { usePermissions } from "@/lib/permissions"
import { listBranches } from "@/api/platform/branches"
import { listMembers, type Member } from "@/api/platform/members"
import {
  createStaffSchedule,
  deleteStaffSchedule,
  getOnDuty,
  listStaffSchedules,
  updateStaffSchedule,
  type StaffDuty,
  type StaffSchedule
} from "@/api/platform/staff-schedules"
import {
  buildGrid,
  dutyLabel,
  dutyOptions,
  dutyTone,
  findOverlaps,
  formatHours,
  formatRange,
  isoWeekday,
  scheduleErrorMessages,
  validateShift,
  weekdays
} from "./shiftsGrid"

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10"

type DialogState =
  | { mode: "create"; accountId?: string; weekday?: number }
  | { mode: "edit"; shift: StaffSchedule }
  | null

const errorMessage = (error: unknown, fallback: string) => scheduleErrorMessages[apiErrorCode(error) ?? ""] ?? fallback

export function ShiftsPanel() {
  const canEdit = usePermissions().can("staff.update")
  const [branchId, setBranchId] = useState("")
  const [duty, setDuty] = useState<StaffDuty | "all">("all")
  const [dialog, setDialog] = useState<DialogState>(null)

  const branchesQuery = useQuery({ queryKey: ["branches"], queryFn: listBranches })
  const membersQuery = useQuery({ queryKey: ["members", "active"], queryFn: () => listMembers({ status: "active" }) })
  const branches = useMemo(() => (branchesQuery.data?.data ?? []).filter((branch) => branch.status === "active"), [branchesQuery.data])
  const activeBranchId = branchId && branches.some((branch) => branch.id === branchId) ? branchId : (branches[0]?.id ?? "")

  const schedulesQuery = useQuery({
    queryKey: ["staff-schedules", activeBranchId, duty],
    queryFn: () => listStaffSchedules({ branchId: activeBranchId, ...(duty === "all" ? {} : { duty }) }),
    enabled: !!activeBranchId
  })
  const onDutyQuery = useQuery({
    queryKey: ["staff-on-duty", activeBranchId],
    queryFn: () => getOnDuty({ branchId: activeBranchId }),
    enabled: !!activeBranchId,
    refetchInterval: 60_000
  })

  // people who can work in this branch: members with no branch limit, or with this branch in their scope
  const people = useMemo(
    () =>
      (membersQuery.data ?? [])
        .filter((member) => member.status === "active" && (member.branchIds.length === 0 || member.branchIds.includes(activeBranchId)))
        .map((member) => ({ accountId: member.accountId, name: member.name, roleName: member.roleName })),
    [membersQuery.data, activeBranchId]
  )
  const rows = useMemo(() => buildGrid(schedulesQuery.data ?? [], people), [schedulesQuery.data, people])
  const roleOf = (accountId: string) => people.find((person) => person.accountId === accountId)?.roleName
  const today = isoWeekday(new Date())
  const totalShifts = schedulesQuery.data?.length ?? 0

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">Quản trị / Nhân sự</p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">Ca làm việc</h1>
          <p className="mt-2 text-sm text-slate-500">
            Lịch làm việc hằng tuần của từng nhân viên và việc họ phụ trách trong ca. Giờ theo múi giờ cửa hàng (UTC+7).
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setDialog({ mode: "create" })}
            disabled={!activeBranchId || people.length === 0}
            className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            <Plus size={17} /> Thêm ca
          </Button>
        )}
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Chi nhánh
          <select
            aria-label="Chi nhánh"
            value={activeBranchId}
            onChange={(event) => setBranchId(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          Phụ trách
          <select
            aria-label="Lọc theo phụ trách"
            value={duty}
            onChange={(event) => setDuty(event.target.value as StaffDuty | "all")}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">Tất cả</option>
            {dutyOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <p className="ml-auto text-xs text-slate-500">{totalShifts} ca trong tuần</p>
      </div>

      {(branchesQuery.isError || membersQuery.isError || schedulesQuery.isError) && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          Không thể tải lịch làm việc. Bạn cần quyền xem nhân viên (staff.view).
        </p>
      )}

      <OnDutyBar shifts={onDutyQuery.data?.data ?? []} at={onDutyQuery.data?.at} loading={onDutyQuery.isLoading} />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {!activeBranchId ? (
          branchesQuery.isLoading ? (
            <TableSkeleton rows={4} cols={7} className="rounded-none border-0 shadow-none" />
          ) : (
            <p className="p-10 text-center text-sm text-slate-500">Chưa có chi nhánh đang hoạt động.</p>
          )
        ) : schedulesQuery.isLoading ? (
          <TableSkeleton rows={4} cols={7} className="rounded-none border-0 shadow-none" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <caption className="sr-only">Lịch làm việc trong tuần của chi nhánh</caption>
              <thead className="bg-[#fbfcfc] text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th scope="col" className="w-[200px] px-4 py-3 font-medium">Nhân viên</th>
                  {weekdays.map((day) => (
                    <th key={day.value} scope="col" className={`px-2 py-3 text-center font-medium ${day.value === today ? "text-[#16866f]" : ""}`}>
                      {day.short}
                      {day.value === today && <span className="ml-1 text-[10px] normal-case">(hôm nay)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.accountId} className="align-top hover:bg-slate-50/60">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <span className="flex items-center gap-2">
                        <UserRound size={15} className="shrink-0 text-slate-400" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[#163d36]">{row.staffName}</span>
                          <span className="block truncate text-xs text-slate-400">
                            {[roleOf(row.accountId), row.minutes ? formatHours(row.minutes) + "/tuần" : null].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </span>
                    </th>
                    {weekdays.map((day) => (
                      <td key={day.value} className={`p-2 ${day.value === today ? "bg-[#f4fbf8]" : ""}`}>
                        <div className="grid gap-1">
                          {(row.byDay.get(day.value) ?? []).map((shift) => {
                            const label = (
                              <>
                                <span className="block font-medium">{formatRange(shift)}</span>
                                <span className="block truncate">{shift.name ? `${shift.name} · ` : ""}{dutyLabel(shift.duty)}</span>
                              </>
                            )
                            const chip = `rounded-md border px-2 py-1 text-left text-xs leading-tight ${dutyTone(shift.duty)}`
                            // without staff.update the shift is shown, not editable
                            return canEdit ? (
                              <button
                                key={shift.id}
                                type="button"
                                onClick={() => setDialog({ mode: "edit", shift })}
                                aria-label={`Sửa ca ${row.staffName} ${day.long} ${formatRange(shift)} ${dutyLabel(shift.duty)}`}
                                className={chip}
                              >
                                {label}
                              </button>
                            ) : (
                              <div key={shift.id} className={chip}>
                                {label}
                              </div>
                            )
                          })}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setDialog({ mode: "create", accountId: row.accountId, weekday: day.value })}
                              aria-label={`Thêm ca cho ${row.staffName} ${day.long}`}
                              className="flex h-6 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-[#16866f] focus:text-[#16866f]"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Chưa có nhân viên nào làm ở chi nhánh này.</p>}
          </div>
        )}
      </section>

      {dialog && activeBranchId && (
        <ShiftDialog
          key={dialog.mode === "edit" ? dialog.shift.id : `new-${dialog.accountId ?? ""}-${dialog.weekday ?? ""}`}
          state={dialog}
          branchId={activeBranchId}
          members={membersQuery.data ?? []}
          people={people}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}

function OnDutyBar({ shifts, at, loading }: { shifts: StaffSchedule[]; at?: string; loading: boolean }) {
  const time = at
    ? new Date(at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })
    : null
  return (
    <section aria-label="Đang trực" className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#163d36]">
        <Clock size={16} className="text-[#16866f]" /> Đang trực{time ? ` lúc ${time}` : ""}
      </h2>
      {loading ? (
        <div role="status" aria-label="Đang tải" className="flex gap-2">
          <Skeleton className="h-14 w-36" />
          <Skeleton className="h-14 w-36" />
        </div>
      ) : shifts.length === 0 ? (
        <p className="text-sm text-slate-500">Hiện không có ca nào đang chạy ở chi nhánh này.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {shifts.map((shift) => (
            <li key={shift.id} className={`rounded-lg border px-3 py-2 text-xs ${dutyTone(shift.duty)}`}>
              <span className="block text-sm font-medium">{shift.staffName}</span>
              <span>{dutyLabel(shift.duty)} · {formatRange(shift)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ShiftDialog({
  state,
  branchId,
  members,
  people,
  onClose
}: {
  state: NonNullable<DialogState>
  branchId: string
  members: Member[]
  people: Array<{ accountId: string; name: string }>
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const editing = state.mode === "edit" ? state.shift : null
  const [accountId, setAccountId] = useState(editing?.accountId ?? (state.mode === "create" ? state.accountId : undefined) ?? people[0]?.accountId ?? "")
  const [days, setDays] = useState<number[]>(editing ? [editing.weekday] : state.mode === "create" && state.weekday ? [state.weekday] : [1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState(editing?.startTime ?? "08:00")
  const [endTime, setEndTime] = useState(editing?.endTime ?? "16:00")
  const [duty, setDuty] = useState<StaffDuty>(editing?.duty ?? "sales")
  const [name, setName] = useState(editing?.name ?? "")
  const [note, setNote] = useState(editing?.note ?? "")
  const [error, setError] = useState("")

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // the person's shifts in every branch: the server refuses overlaps whatever the branch (S001)
  const personShifts = useQuery({
    queryKey: ["staff-schedules", "person", accountId],
    queryFn: () => listStaffSchedules({ accountId }),
    enabled: !!accountId
  })
  const staffName = editing?.staffName ?? members.find((member) => member.accountId === accountId)?.name ?? ""
  const draft = { startTime, endTime, weekdays: days }
  const problem = validateShift(draft)
  const overlaps = problem ? [] : findOverlaps(personShifts.data ?? [], accountId, draft, editing?.id)

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["staff-schedules"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-on-duty"] }),
      queryClient.invalidateQueries({ queryKey: ["members"] }),
      queryClient.invalidateQueries({ queryKey: ["members-summary"] })
    ])
    onClose()
  }
  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updateStaffSchedule(editing.id, { startTime, endTime, name: name.trim() || null, duty, note: note.trim() || null })
        return
      }
      await createStaffSchedule({
        accountId,
        branchId,
        weekdays: days,
        startTime,
        endTime,
        duty,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {})
      })
    },
    onSuccess: refresh,
    onError: (e) => setError(errorMessage(e, "Không thể lưu ca làm việc. Vui lòng thử lại."))
  })
  const remove = useMutation({
    mutationFn: () => deleteStaffSchedule(editing!.id),
    onSuccess: refresh,
    onError: (e) => setError(errorMessage(e, "Không thể xóa ca làm việc."))
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!accountId) return setError("Chọn nhân viên.")
    if (problem) return setError(problem)
    save.mutate()
  }

  const busy = save.isPending || remove.isPending
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#163d36]/30 p-4 pt-16 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={editing ? "Sửa ca làm việc" : "Thêm ca làm việc"}>
      <form onSubmit={submit} className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <CalendarClock className="text-[#16866f]" size={22} />
            <div>
              <h2 className="font-semibold text-[#163d36]">{editing ? "Sửa ca làm việc" : "Thêm ca làm việc"}</h2>
              <p className="text-xs text-slate-500">{editing ? `${editing.staffName} · ${weekdays.find((d) => d.value === editing.weekday)?.long}` : "Mỗi ngày được chọn tạo một ca."}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Đóng"><X size={19} className="text-slate-400" /></button>
        </div>

        <div className="grid gap-4 p-6">
          {!editing && (
            <label className="text-xs font-medium text-slate-600">
              Nhân viên
              <select aria-label="Nhân viên" className={`${inputClass} mt-2`} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {people.map((person) => (
                  <option key={person.accountId} value={person.accountId}>{person.name}</option>
                ))}
              </select>
            </label>
          )}
          {!editing && (
            <fieldset>
              <legend className="text-xs font-medium text-slate-600">Các ngày trong tuần</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekdays.map((day) => (
                  <label key={day.value} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${days.includes(day.value) ? "border-[#16866f] bg-[#e6f5ee] text-[#16866f]" : "border-slate-200 text-slate-600"}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      aria-label={day.long}
                      checked={days.includes(day.value)}
                      onChange={() => setDays(days.includes(day.value) ? days.filter((value) => value !== day.value) : [...days, day.value].sort())}
                    />
                    {day.short}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="grid grid-cols-2 gap-4">
            <label className="text-xs font-medium text-slate-600">
              Giờ bắt đầu
              <input aria-label="Giờ bắt đầu" type="time" step={300} required className={`${inputClass} mt-2`} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Giờ kết thúc
              <input aria-label="Giờ kết thúc" type="time" step={300} required className={`${inputClass} mt-2`} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </label>
          </div>
          <label className="text-xs font-medium text-slate-600">
            Phụ trách
            <select aria-label="Phụ trách" className={`${inputClass} mt-2`} value={duty} onChange={(event) => setDuty(event.target.value as StaffDuty)}>
              {dutyOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}: {item.hint}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Tên ca <span className="font-normal text-slate-400">(không bắt buộc)</span>
              <input aria-label="Tên ca" className={`${inputClass} mt-2`} maxLength={50} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Ca sáng" />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Ghi chú <span className="font-normal text-slate-400">(không bắt buộc)</span>
              <input aria-label="Ghi chú" className={`${inputClass} mt-2`} maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
          </div>

          {problem && (startTime || endTime) && <p className="text-xs text-amber-700">{problem}</p>}
          {overlaps.length > 0 && (
            <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              {staffName || "Nhân viên"} đã có {overlaps.length} ca trùng giờ ({overlaps.map((item) => `${weekdays.find((d) => d.value === item.weekday)?.short} ${formatRange(item)}`).join(", ")}). Hệ thống sẽ từ chối khi lưu.
            </p>
          )}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-6 py-4">
          <div>
            {editing && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Xóa ca ${formatRange(editing)} của ${editing.staffName}?`)) remove.mutate()
                }}
                className="gap-2 text-red-600"
              >
                <Trash2 size={15} /> Xóa ca
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Hủy</Button>
            <Button type="submit" disabled={busy || !!problem || !accountId} className="bg-[#16866f] text-white hover:bg-[#0f705d]">
              {save.isPending ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Thêm ca"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
