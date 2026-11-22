import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Copy, Lock, Plus, RotateCcw, Save, ShieldCheck, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ListSkeleton, Skeleton } from "@/components/ui/skeleton"
import { usePermissions } from "@/lib/permissions"
import {
  createRole,
  deleteRole,
  getPermissionCatalog,
  getRole,
  listRoles,
  roleErrorCode,
  updateRole,
  type PermissionCatalog,
  type Role,
  type RoleDetail
} from "@/api/platform/roles"
import {
  actionLabels,
  codeOf,
  columnCodes,
  columnState,
  diffPermissions,
  isApplicable,
  keepApplicable,
  roleErrorMessages,
  rowCodes,
  rowState,
  sameSet,
  sortedCodes,
  toggleCode,
  toggleMany,
  type CheckState
} from "./rolesMatrix"

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#16866f] focus:ring-4 focus:ring-[#16866f]/10 disabled:bg-slate-50 disabled:text-slate-500"

const NEW_ROLE = "new"

const errorMessage = (error: unknown, fallback: string) => roleErrorMessages[roleErrorCode(error) ?? ""] ?? fallback

export function RolesPanel() {
  const { can } = usePermissions()
  const canEdit = can("staff.update")
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: listRoles })
  const catalogQuery = useQuery({ queryKey: ["permission-catalog"], queryFn: getPermissionCatalog, staleTime: 5 * 60_000 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dirtyRef = useRef(false)

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data])
  const activeId =
    selectedId === NEW_ROLE || (selectedId && roles.some((role) => role.id === selectedId)) ? selectedId : (roles[0]?.id ?? null)
  const activeRole = roles.find((role) => role.id === activeId) ?? null

  const markDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])

  function select(id: string) {
    if (id === activeId) return
    if (dirtyRef.current && !window.confirm("Bạn có thay đổi chưa lưu. Bỏ thay đổi và chuyển vai trò?")) return
    dirtyRef.current = false
    setSelectedId(id)
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">Quản trị / Nhân sự</p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">Vai trò & phân quyền</h1>
          <p className="mt-2 text-sm text-slate-500">
            Chọn một vai trò, tick các chức năng mà vai trò đó được làm. Chủ cửa hàng luôn có đủ quyền.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => select(NEW_ROLE)} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]">
            <Plus size={17} /> Thêm vai trò
          </Button>
        )}
      </header>

      {(rolesQuery.isError || catalogQuery.isError) && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          Không thể tải vai trò hoặc danh mục quyền. Bạn cần quyền xem nhân viên (staff.view).
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <RoleList roles={roles} activeId={activeId} loading={rolesQuery.isLoading} onSelect={select} />
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          {!catalogQuery.data ? (
            catalogQuery.isLoading ? (
              <MatrixSkeleton />
            ) : (
              <p className="p-10 text-center text-sm text-slate-500">Chưa có danh mục quyền.</p>
            )
          ) : activeId === NEW_ROLE ? (
            <RoleEditorLoader
              key={NEW_ROLE}
              catalog={catalogQuery.data}
              role={null}
              roles={roles}
              onDirtyChange={markDirty}
              onSaved={(saved) => {
                dirtyRef.current = false
                setSelectedId(saved.id)
              }}
              onDeleted={() => undefined}
            />
          ) : activeRole ? (
            <RoleEditorLoader
              key={activeRole.id}
              catalog={catalogQuery.data}
              role={activeRole}
              roles={roles}
              onDirtyChange={markDirty}
              onSaved={() => {
                dirtyRef.current = false
              }}
              onDeleted={() => {
                dirtyRef.current = false
                setSelectedId(null)
              }}
            />
          ) : (
            rolesQuery.isLoading ? (
              <MatrixSkeleton />
            ) : (
              <p className="p-10 text-center text-sm text-slate-500">Chưa có vai trò nào.</p>
            )
          )}
        </section>
      </div>
    </div>
  )
}

function RoleList({
  roles,
  activeId,
  loading,
  onSelect
}: {
  roles: Role[]
  activeId: string | null
  loading: boolean
  onSelect: (id: string) => void
}) {
  return (
    <nav aria-label="Danh sách vai trò" className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      {loading && <ListSkeleton rows={4} className="p-2" />}
      <ul className="grid gap-1">
        {activeId === NEW_ROLE && (
          <li>
            <button type="button" aria-current="true" className="w-full rounded-lg bg-[#e6f5ee] p-3 text-left">
              <span className="text-sm font-medium text-[#163d36]">Vai trò mới</span>
              <span className="mt-1 block text-xs text-slate-500">Chưa lưu</span>
            </button>
          </li>
        )}
        {roles.map((role) => (
          <li key={role.id}>
            <button
              type="button"
              onClick={() => onSelect(role.id)}
              aria-current={role.id === activeId ? "true" : undefined}
              className={`w-full rounded-lg p-3 text-left transition hover:bg-slate-50${role.id === activeId ? "bg-[#e6f5ee]" : ""}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-[#163d36]">{role.name}</span>
                <RoleBadge role={role} />
              </span>
              <span className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users size={12} /> {role.memberCount} nhân viên
                </span>
                <span>{role.isOwner ? "Tất cả quyền" : `${role.permissionCount} quyền`}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function RoleBadge({ role }: { role: Role }) {
  if (role.isOwner) return <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">Chủ cửa hàng</span>
  if (role.isSeeded) return <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Mặc định</span>
  return <span className="shrink-0 rounded-full bg-[#e6f5ee] px-2 py-0.5 text-[11px] text-[#16866f]">Tùy chỉnh</span>
}

type EditorProps = {
  catalog: PermissionCatalog
  role: Role | null
  roles: Role[]
  onDirtyChange: (dirty: boolean) => void
  onSaved: (saved: RoleDetail) => void
  onDeleted: () => void
}

/** Loads the role's permission codes, then mounts the editor once (the `key` remounts it for another role) */
function RoleEditorLoader(props: EditorProps) {
  const { role } = props
  const detailQuery = useQuery({
    queryKey: ["role", role?.id],
    queryFn: () => getRole(role!.id),
    enabled: !!role
  })
  if (role && detailQuery.isError) {
    return <p role="alert" className="p-10 text-center text-sm text-red-600">Không thể tải quyền của vai trò này.</p>
  }
  if (role && !detailQuery.data) return <MatrixSkeleton />
  return <RoleEditor {...props} detail={detailQuery.data ?? null} />
}

type Baseline = { name: string; description: string; permissions: Set<string> }

const baselineOf = (detail: { name: string; description: string | null; permissions: string[] } | null): Baseline => ({
  name: detail?.name ?? "",
  description: detail?.description ?? "",
  permissions: new Set(detail?.permissions ?? [])
})

function RoleEditor({
  catalog,
  role,
  roles,
  detail,
  onDirtyChange,
  onSaved,
  onDeleted
}: EditorProps & { detail: RoleDetail | null }) {
  const queryClient = useQueryClient()
  const { can } = usePermissions()
  const noRight = !can("staff.update")
  const readOnly = !!role?.isOwner || noRight
  const [baseline, setBaseline] = useState<Baseline>(() => baselineOf(detail))
  const [name, setName] = useState(baseline.name)
  const [description, setDescription] = useState(baseline.description)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(baseline.permissions))
  const [error, setError] = useState("")
  const [copyFrom, setCopyFrom] = useState("")

  const dirty = name.trim() !== baseline.name || description.trim() !== baseline.description || !sameSet(selected, baseline.permissions)
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  const changes = useMemo(() => diffPermissions(baseline.permissions, selected), [baseline.permissions, selected])
  const nameMissing = name.trim().length === 0

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        permissions: sortedCodes(keepApplicable(selected, catalog))
      }
      return role ? updateRole(role.id, body) : createRole(body)
    },
    onSuccess: async (saved) => {
      const next = baselineOf(saved)
      setBaseline(next)
      setName(next.name)
      setDescription(next.description)
      setSelected(new Set(next.permissions))
      setError("")
      queryClient.setQueryData(["role", saved.id], saved)
      await queryClient.invalidateQueries({ queryKey: ["roles"] })
      onSaved(saved)
    },
    onError: (e) => setError(errorMessage(e, "Không thể lưu vai trò. Vui lòng thử lại."))
  })

  const remove = useMutation({
    mutationFn: () => deleteRole(role!.id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["role", role!.id] })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["roles"] }),
        queryClient.invalidateQueries({ queryKey: ["members"] })
      ])
      onDeleted()
    },
    onError: (e) => setError(errorMessage(e, "Không thể xóa vai trò. Vui lòng thử lại."))
  })

  async function copyPermissions(roleId: string) {
    setCopyFrom(roleId)
    if (!roleId) return
    try {
      const source = await queryClient.fetchQuery({ queryKey: ["role", roleId], queryFn: () => getRole(roleId) })
      setSelected(keepApplicable(new Set(source.permissions), catalog))
    } catch {
      setError("Không thể sao chép quyền từ vai trò đã chọn.")
    }
  }

  const defaultPermissions = role?.isSeeded && !role.isOwner ? catalog.defaults.find((item) => item.key === role.key)?.permissions : undefined
  const deleteBlockedReason = role?.isSeeded
    ? "Không thể xóa vai trò mặc định."
    : role && role.memberCount > 0
      ? "Vai trò đang được gán cho nhân viên."
      : ""

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[#16866f]" size={22} />
          <div>
            <h2 className="font-semibold text-[#163d36]">{role ? role.name : "Vai trò mới"}</h2>
            <p className="text-xs text-slate-500">
              {noRight
                ? "Bạn chỉ có quyền xem vai trò. Sửa vai trò cần quyền staff.update."
                : readOnly
                ? "Vai trò Chủ cửa hàng luôn có đủ quyền và không thể sửa."
                : role?.isSeeded
                  ? "Vai trò mặc định: sửa được quyền, không xóa được."
                  : "Tick ô để cấp quyền. Ô gạch ngang là chức năng không có thao tác đó."}
            </p>
          </div>
        </div>
        {!role && roles.length > 0 && (
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Copy size={14} /> Sao chép quyền từ
            <select aria-label="Sao chép quyền từ vai trò" value={copyFrom} onChange={(event) => void copyPermissions(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm">
              <option value="">(không sao chép)</option>
              {roles.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid gap-4 border-b border-slate-100 p-5 md:grid-cols-2">
        <label className="text-xs font-medium text-slate-600">
          Tên vai trò
          <input aria-label="Tên vai trò" className={`${inputClass} mt-2`} maxLength={100} value={name} disabled={readOnly} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Thu ngân ca tối" />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Mô tả <span className="font-normal text-slate-400">(không bắt buộc)</span>
          <input aria-label="Mô tả vai trò" className={`${inputClass} mt-2`} maxLength={255} value={description} disabled={readOnly} onChange={(event) => setDescription(event.target.value)} />
        </label>
      </div>

      <div className="overflow-x-auto p-5">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">Ma trận quyền của vai trò {name || "mới"}</caption>
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-400">
              <th scope="col" className="px-3 py-2 text-left font-medium">Chức năng</th>
              {catalog.actions.map((action) => (
                <th key={action} scope="col" className="px-3 py-2 text-center font-medium">
                  <span className="flex flex-col items-center gap-1">
                    {actionLabels[action] ?? action}
                    <TriCheckbox
                      label={`Chọn cả cột ${actionLabels[action] ?? action}`}
                      state={columnState(selected, catalog, action)}
                      disabled={readOnly}
                      onChange={() => setSelected(toggleMany(selected, columnCodes(catalog, action)))}
                    />
                  </span>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-center font-medium">Cả hàng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {catalog.modules.map((module) => (
              <tr key={module.code} className="hover:bg-slate-50">
                <th scope="row" className="p-3 text-left font-medium text-[#163d36]">{module.label}</th>
                {catalog.actions.map((action) => {
                  const code = codeOf(module.code, action)
                  return (
                    <td key={action} className="p-3 text-center">
                      {isApplicable(catalog, module.code, action) ? (
                        <input
                          type="checkbox"
                          aria-label={`${module.label}: ${actionLabels[action] ?? action}`}
                          checked={selected.has(code)}
                          disabled={readOnly}
                          onChange={() => setSelected(toggleCode(selected, code))}
                          className="h-4 w-4 accent-[#16866f]"
                        />
                      ) : (
                        <span aria-label="Không áp dụng" className="text-slate-300">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="p-3 text-center">
                  <TriCheckbox
                    label={`Chọn cả hàng ${module.label}`}
                    state={rowState(selected, catalog, module.code)}
                    disabled={readOnly}
                    onChange={() => setSelected(toggleMany(selected, rowCodes(catalog, module.code)))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p role="alert" className="mx-5 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <div className="text-xs text-slate-500">
          {readOnly ? (
            <span className="flex items-center gap-1"><Lock size={13} /> Chỉ xem</span>
          ) : dirty ? (
            <span>
              Chưa lưu: thêm {changes.added.length} quyền, bỏ {changes.removed.length} quyền
              {changes.added.length + changes.removed.length === 0 ? " (chỉ đổi tên hoặc mô tả)" : ""}.
            </span>
          ) : (
            <span>Quyền thay đổi có hiệu lực khi nhân viên đăng nhập lại hoặc làm mới phiên.</span>
          )}
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            {role && !role.isSeeded && (
              <Button
                type="button"
                variant="outline"
                title={deleteBlockedReason || undefined}
                disabled={!!deleteBlockedReason || remove.isPending}
                onClick={() => {
                  if (window.confirm(`Xóa vai trò "${role.name}"? Không thể hoàn tác.`)) remove.mutate()
                }}
                className="gap-2 text-red-600"
              >
                <Trash2 size={15} /> Xóa vai trò
              </Button>
            )}
            {defaultPermissions && (
              <Button type="button" variant="outline" onClick={() => setSelected(keepApplicable(new Set(defaultPermissions), catalog))} className="gap-2">
                <RotateCcw size={15} /> Về mặc định
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || save.isPending}
              onClick={() => {
                setName(baseline.name)
                setDescription(baseline.description)
                setSelected(new Set(baseline.permissions))
                setError("")
              }}
            >
              Hoàn tác
            </Button>
            <Button type="button" disabled={!dirty || nameMissing || save.isPending} onClick={() => save.mutate()} className="gap-2 bg-[#16866f] text-white hover:bg-[#0f705d]">
              <Save size={15} /> {save.isPending ? "Đang lưu..." : role ? "Lưu thay đổi" : "Tạo vai trò"}
            </Button>
          </div>
        )}
      </footer>
    </div>
  )
}

function TriCheckbox({ label, state, disabled, onChange }: { label: string; state: CheckState; disabled?: boolean; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some"
  }, [state])
  if (state === "na") return <span aria-label="Không áp dụng" className="text-slate-300">—</span>
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={state === "all"}
      disabled={disabled}
      onChange={onChange}
      className="h-4 w-4 accent-[#16866f]"
    />
  )
}

/** The permission matrix while the role and the catalog load */
function MatrixSkeleton() {
  return (
    <div role="status" aria-label="Đang tải quyền" className="p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 8 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="h-4 w-36" />
            {Array.from({ length: 5 }).map((_, col) => (
              <Skeleton key={col} className="h-4 w-8" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
