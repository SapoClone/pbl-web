import { Link } from "@tanstack/react-router"
import { LockKeyhole } from "lucide-react"

/** Shown instead of a page the signed-in member's role has no permission to open */
export function NoAccess({ permission, homeTo }: { permission?: string; homeTo?: string }) {
  return (
    <section role="alert" className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <LockKeyhole size={20} />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-[#163d36]">Bạn chưa có quyền mở trang này</h1>
      <p className="mt-2 text-sm text-slate-500">
        Vai trò của bạn không có quyền{permission ? <> <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{permission}</code></> : ""}. Hãy nhờ chủ cửa hàng cấp
        quyền trong mục Nhân viên &amp; Quyền.
      </p>
      {homeTo && (
        <Link to={homeTo as never} className="mt-5 inline-block text-sm font-medium text-[#16866f] hover:underline">
          Về trang bạn được phép
        </Link>
      )}
    </section>
  )
}
