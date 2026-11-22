import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Package } from "lucide-react"
import { MetricCard } from "@/features/overview/MetricCard"
import { KpiStatCard } from "./micro-ux"

describe("cards while their value is loading", () => {
  it("KpiStatCard shows a placeholder, not the value or the hint", () => {
    render(<KpiStatCard label="Tổng sản phẩm" value={0} hint="0 đang bán" icon={Package} loading />)
    expect(screen.getByRole("status", { name: "Đang tải" })).toBeTruthy()
    expect(screen.queryByText("0")).toBeNull()
    expect(screen.queryByText("0 đang bán")).toBeNull()
    expect(screen.getByText("Tổng sản phẩm")).toBeTruthy()
  })

  it("KpiStatCard shows the value once it is loaded", () => {
    render(<KpiStatCard label="Tổng sản phẩm" value={12} hint="3 đang bán" icon={Package} />)
    expect(screen.queryByRole("status")).toBeNull()
    expect(screen.getByText("12")).toBeTruthy()
    expect(screen.getByText("3 đang bán")).toBeTruthy()
  })

  it("MetricCard shows a placeholder, not '0 ₫' or the change text", () => {
    render(<MetricCard label="Doanh thu" value="0 ₫" change="Đồng bộ đa kênh" icon={Package} loading />)
    expect(screen.getByRole("status", { name: "Đang tải" })).toBeTruthy()
    expect(screen.queryByText("0 ₫")).toBeNull()
    expect(screen.queryByText("Đồng bộ đa kênh")).toBeNull()
  })

  it("MetricCard shows the value once it is loaded", () => {
    render(<MetricCard label="Doanh thu" value="240.000 ₫" change="Đồng bộ đa kênh" icon={Package} />)
    expect(screen.getByText("240.000 ₫")).toBeTruthy()
  })
})
