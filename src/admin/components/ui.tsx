import { Search, SlidersHorizontal } from "lucide-react"
import type { FormEvent, ReactNode } from "react"
import { useAdminStore } from "../store/useAdminStore"
import type { AdminScreen, StatusTone, TableColumn } from "../types"
import { AdminLink } from "./AdminLink"

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-[26px] font-bold tracking-tight">{title}</h1><p className="mt-1 text-xs text-[#829591]">{description}</p></div>{action}</div>
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-[#dfe7e5] bg-white ${className}`}>{children}</section>
}

interface ActionButtonProps {
  children: ReactNode
  screen?: AdminScreen
  tone?: "primary" | "plain" | "danger"
  type?: "button" | "submit"
  onClick?: () => void
}

export function ActionButton({ children, screen, tone = "primary", type = "button", onClick }: ActionButtonProps) {
  const style = tone === "primary" ? "bg-[#00876a] text-white hover:bg-[#006f57]" : tone === "danger" ? "bg-[#fde8e5] text-[#c65248] hover:bg-[#f8d6d1]" : "border border-[#dfe7e5] bg-white hover:bg-[#f3f6f5]"
  const className = `inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-xs font-bold ${style}`
  return screen ? <AdminLink screen={screen} className={className}>{children}</AdminLink> : <button type={type} onClick={onClick} className={className}>{children}</button>
}

export function StatusBadge({ children, tone = "green", className = "" }: { children: ReactNode; tone?: StatusTone; className?: string }) {
  const colors: Record<StatusTone, string> = { green: "bg-[#e5f3ed] text-[#00876a]", amber: "bg-[#fff2dc] text-[#a97724]", red: "bg-[#fde8e5] text-[#c65248]", blue: "bg-[#e7f1fa] text-[#3778a9]", gray: "bg-[#eef2f1] text-[#607975]" }
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold ${colors[tone]} ${className}`}>{children}</span>
}

export function FilterBar({ placeholder = "Tìm theo tên, mã, email..." }: { placeholder?: string }) {
  const searchTerm = useAdminStore((state) => state.searchTerm)
  const setSearchTerm = useAdminStore((state) => state.setSearchTerm)
  return <div className="flex flex-wrap gap-2 border-b border-[#e8eeec] p-4"><label className="relative min-w-[250px] flex-1"><Search className="absolute left-3 top-2.5 text-[#829591]" size={14}/><input className="input pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={placeholder}/></label><select className="input w-40"><option>Tất cả trạng thái</option></select><ActionButton tone="plain"><SlidersHorizontal size={14}/> Bộ lọc</ActionButton></div>
}

export function DataTable<T extends object>({ columns, rows }: { columns: TableColumn<T>[]; rows: T[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#f8faf9] text-[9px] uppercase tracking-wider text-[#829591]"><tr>{columns.map((column) => <th key={String(column.key)} className="px-5 py-3 font-semibold">{column.label}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-[#edf1f0]">{columns.map((column) => <td key={String(column.key)} className="px-5 py-3.5">{column.render ? column.render(row) : String(row[column.key as keyof T] ?? "")}</td>)}</tr>)}</tbody></table></div>
}

export function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return <dl className="mt-5 grid gap-5 sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><dt className="text-[10px] text-[#829591]">{label}</dt><dd className="mt-1 text-xs font-bold">{value}</dd></div>)}</dl>
}

export function FormField({ label, name, value = "", type = "text", required = false }: { label: string; name?: string; value?: string; type?: string; required?: boolean }) {
  const fieldName = name ?? (label === "Tên doanh nghiệp" ? "name" : label === "Họ và tên" ? "owner" : undefined)
  return <label className="block text-xs font-bold">{label}{required && " *"}<input className="input mt-2" name={fieldName} type={type} defaultValue={value} required={required}/></label>
}

export function FormActions({ cancelScreen, submitLabel }: { cancelScreen: AdminScreen; submitLabel: string }) {
  return <div className="mt-5 flex justify-end gap-2"><ActionButton tone="plain" screen={cancelScreen}>Hủy</ActionButton><ActionButton type="submit">{submitLabel}</ActionButton></div>
}

export function handleDemoSubmit(event: FormEvent, message: string) {
  event.preventDefault()
  useAdminStore.getState().showToast(message)
}
