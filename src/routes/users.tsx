import { useState, type FormEvent } from "react"
import { FileRoute, redirect } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  createUser,
  deleteUser,
  type CreateUserInput
} from "@/api/platform/users"
import { usersQueryOptions } from "@/api/tanstack-query/usersQueryOptions"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

export const Route = new FileRoute('/users').createRoute({
  beforeLoad: () => {
    if (!useStoreAuth.getState().tokens?.accessToken) {
      throw redirect({ to: "/login" })
    }
  },
  component: UsersPage
})

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"

function UsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState<CreateUserInput>({
    username: "",
    email: "",
    password: ""
  })
  const [formError, setFormError] = useState("")
  const query = useQuery(
    usersQueryOptions({ page, limit: 10 })
  )

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      setForm({ username: "", email: "", password: "" })
      setShowCreateForm(false)
      setFormError("")
      await queryClient.invalidateQueries({ queryKey: ["users"] })
    },
    onError: () => setFormError("Không thể tạo người dùng. Vui lòng kiểm tra dữ liệu.")
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] })
  })

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError("")
    createMutation.mutate(form)
  }

  const users = query.data?.data ?? []
  const pagination = query.data?.pagination

  return (
    <main className="mx-auto max-w-7xl py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Platform / Workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Người dùng
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Quản lý tài khoản đang sử dụng workspace.
          </p>
        </div>
        <Button
          className="gap-2 bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowCreateForm((visible) => !visible)}
        >
          <Plus size={17} />
          Thêm người dùng
        </Button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={submitCreate}
          className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-4"
        >
          <input
            className={inputClassName}
            placeholder="Tên người dùng"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            required
          />
          <input
            className={inputClassName}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
          <input
            className={inputClassName}
            type="password"
            placeholder="Mật khẩu"
            minLength={8}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Đang tạo..." : "Tạo tài khoản"}
          </Button>
          {formError && (
            <p className="text-sm text-red-600 md:col-span-4">{formError}</p>
          )}
        </form>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-4">
          <span className="text-sm font-semibold text-slate-700">Danh sách tài khoản</span>
          <span className="text-sm text-slate-500">
            {pagination?.totalRecords ?? 0} tài khoản
          </span>
        </div>

        {query.isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Đang tải...</div>
        ) : query.isError ? (
          <div className="p-10 text-center text-sm text-red-600">
            Không thể tải danh sách người dùng.
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center text-slate-500">
            <UsersRound size={28} />
            <p>Chưa có người dùng phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Người dùng</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Ngày tạo</th>
                  <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-semibold text-slate-900">{user.username}</td>
                    <td className="px-5 py-4 text-slate-600">{user.email}</td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        title={`Xóa ${user.username}`}
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Xóa người dùng ${user.username}?`)) {
                            deleteMutation.mutate(user.id)
                          }
                        }}
                      >
                        <Trash2 size={17} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
          <span className="text-slate-500">
            Trang {pagination?.currentPage ?? page} / {pagination?.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination?.previousPage}
              onClick={() => setPage(pagination?.previousPage ?? page)}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination?.nextPage}
              onClick={() => setPage(pagination?.nextPage ?? page)}
            >
              Sau
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
