import { Link } from "@tanstack/react-router"
import { useEffect, useState, type ReactNode } from "react"
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react"

export function Heading({ title, description, action, breadcrumbs }: { title: string; description: string; action?: ReactNode; breadcrumbs?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div>{breadcrumbs}<h1 className="text-[26px] font-bold tracking-tight">{title}</h1><p className="mt-1 text-xs text-[#829591]">{description}</p></div>{action}</div>
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Điều hướng phân cấp" className=" flex items-center gap-2 text-[14px] text-[#829591]">{items.map((item, index) => <span key={item.label} className="flex items-center gap-2">{index > 0 && <span>/</span>}{item.href ? <Link to={item.href} className="hover:text-[#00876a]">{item.label}</Link> : <span className="font-semibold text-[#284341]">{item.label}</span>}</span>)}</nav>
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-[#dfe7e5] bg-white ${className}`}>{children}</section>
}

export function Button({ children, href: to, tone = "primary", onClick, type = "button" }: { children: ReactNode; href?: string; tone?: "primary" | "plain" | "danger"; onClick?: () => void; type?: "button" | "submit" }) {
  const cls = tone === "primary" ? "bg-[#00876a] text-white hover:bg-[#006f57]" : tone === "danger" ? "bg-[#fde8e5] text-[#c65248] hover:bg-[#f8d6d1]" : "border border-[#dfe7e5] bg-white hover:bg-[#f3f6f5]"
  return to ? <Link to={to} className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-xs font-bold ${cls}`}>{children}</Link> : <button type={type} onClick={onClick} className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-xs font-bold ${cls}`}>{children}</button>
}

export function Badge({ children, tone = "green", className = "" }: { children: ReactNode; tone?: "green" | "amber" | "red" | "blue" | "gray"; className?: string }) {
  const colors = { green: "bg-[#e5f3ed] text-[#00876a]", amber: "bg-[#fff2dc] text-[#a97724]", red: "bg-[#fde8e5] text-[#c65248]", blue: "bg-[#e7f1fa] text-[#3778a9]", gray: "bg-[#eef2f1] text-[#607975]" }
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold ${colors[tone]} ${className}`}>{children}</span>
}

export function Filters({ placeholder = "Tìm theo tên, mã, email...", onSearch, isLoading = false }: { placeholder?: string; onSearch?: (value: string) => void; isLoading?: boolean }) {
  const [inputValue, setInputValue] = useState(() => new URLSearchParams(window.location.search).get("search") ?? "")
  useEffect(() => {
    if (!onSearch) return
    const timer = window.setTimeout(() => {
      const value = inputValue.trim()
      onSearch(value)
      const params = new URLSearchParams(window.location.search)
      if (value) params.set("search", value)
      else params.delete("search")
      window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [inputValue, onSearch])
  return <div className="flex flex-wrap gap-2 border-b border-[#e8eeec] p-4"><label className="relative min-w-[250px] flex-1"><Search className="absolute left-3 top-2.5 text-[#829591]" size={14} /><input className="input pl-9 pr-16" value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder={placeholder} />{isLoading && <Loader2 className="absolute right-9 top-2.5 animate-spin text-[#00876a]" size={14} />}{inputValue && <button type="button" aria-label="Xóa tìm kiếm" className="absolute right-3 top-2 text-[#829591]" onClick={() => setInputValue("")}><X size={15} /></button>}</label><select className="input w-40"><option>Tất cả trạng thái</option></select><Button tone="plain"><SlidersHorizontal size={14} /> Bộ lọc</Button></div>
}

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] table-fixed text-left text-xs"><colgroup>{headers.map((header, index) => <col key={header} className={index === 0 ? "w-[22%]" : index === headers.length - 1 ? "w-[14%]" : "w-auto"} />)}</colgroup><thead className="bg-[#f8faf9] text-[9px] uppercase tracking-wider text-[#829591]"><tr>{headers.map(h => <th key={h} className="whitespace-nowrap px-5 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-t border-[#edf1f0]">{row.map((cell, j) => <td key={j} className="max-w-0 overflow-hidden px-5 py-3.5"><div className="truncate" title={typeof cell === "string" ? cell : undefined}>{cell}</div></td>)}</tr>)}</tbody></table></div>
}

export function InfoGrid({ items }: { items: string[][] }) {
  return <dl className="mt-5 grid gap-5 sm:grid-cols-2">{items.map(x => <div key={x[0]}><dt className="text-[10px] text-[#829591]">{x[0]}</dt><dd className="mt-1 text-xs font-bold">{x[1]}</dd></div>)}</dl>
}

export function Field({ name, label, value = "", type = "text", required = false }: { name?: string; label: string; value?: string; type?: string; required?: boolean }) {
  return <label className="block text-xs font-bold">{label}{required && " *"}<input name={name} className="input mt-2" type={type} defaultValue={value} required={required} /></label>
}
