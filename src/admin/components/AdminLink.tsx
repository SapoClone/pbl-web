import { Link } from "@tanstack/react-router"
import type { ComponentProps, ReactNode } from "react"
import type { AdminScreen } from "../types"

interface AdminLinkProps {
  screen: AdminScreen
  children: ReactNode
  className?: string
  onClick?: ComponentProps<"a">["onClick"]
}

export function AdminLink({ screen, children, className, onClick }: AdminLinkProps) {
  if (screen === "dashboard") {
    return <Link to="/" className={className} onClick={onClick}>{children}</Link>
  }

  return (
    <Link to="/admin/$screen" params={{ screen }} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}
