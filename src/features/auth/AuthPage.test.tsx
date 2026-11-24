import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AxiosError, type AxiosResponse } from "axios"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as authApi from "@/api/auth"
import { AuthPage } from "./AuthPage"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn()
}))
vi.mock("@/api/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/auth")>()
  return {
    ...original,
    login: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn()
  }
})

const httpError = (status: number, data: unknown) =>
  new AxiosError("failed", String(status), undefined, undefined, {
    status,
    data
  } as AxiosResponse)

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByPlaceholderText(label), { target: { value } })

const setUrl = (path: string) =>
  (
    window as unknown as { happyDOM: { setURL: (url: string) => void } }
  ).happyDOM.setURL(`http://localhost${path}`)

beforeEach(() => {
  setUrl("/")
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("sign-in errors", () => {
  const submitLogin = async () => {
    render(<AuthPage mode="login" />)
    fill("ban@cuahang.vn", "a@b.vn")
    fill("Nhập mật khẩu", "secret1")
    fireEvent.click(screen.getByRole("button", { name: /Đăng nhập/ }))
  }

  it("shows the Vietnamese text for 401 Unauthorized", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      httpError(401, { message: "Unauthorized" })
    )
    await submitLogin()
    expect(
      await screen.findByText("Email hoặc mật khẩu không chính xác.")
    ).toBeTruthy()
  })

  it("shows the Vietnamese text for errorCode A001", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      httpError(400, { errorCode: "A001", message: "Wrong email or password" })
    )
    await submitLogin()
    expect(
      await screen.findByText("Email hoặc mật khẩu không chính xác.")
    ).toBeTruthy()
  })
})

describe("password reset", () => {
  it("shows the Vietnamese neutral sentence after a reset request, whatever the server's English text", async () => {
    vi.mocked(authApi.requestPasswordReset).mockResolvedValue({
      message: "If an account exists for this email, a password reset link has been sent"
    })
    render(<AuthPage mode="forgot" />)
    fill("ban@cuahang.vn", "a@b.vn")
    fireEvent.click(screen.getByRole("button", { name: /Gửi liên kết/ }))
    expect(
      await screen.findByText("Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi sớm.")
    ).toBeTruthy()
  })

  it("flags a missing token with a link to /forgot-password", () => {
    render(<AuthPage mode="reset" />)
    expect(screen.getByText("Liên kết đặt lại mật khẩu không hợp lệ.")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: /Yêu cầu liên kết mới/ }).getAttribute("href")
    ).toBe("/forgot-password")
  })

  it("resets the password with the token from the URL", async () => {
    setUrl("/reset-password?token=abc123")
    vi.mocked(authApi.resetPassword).mockResolvedValue({ message: "Your password has been reset." })
    render(<AuthPage mode="reset" />)
    fill("Nhập mật khẩu mới", "newpass1")
    fill("Nhập lại mật khẩu", "newpass1")
    fireEvent.click(screen.getByRole("button", { name: /Đặt lại mật khẩu/ }))
    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith("abc123", "newpass1")
    )
    expect(
      await screen.findByText("Mật khẩu đã được đặt lại. Bạn có thể đăng nhập bằng mật khẩu mới.")
    ).toBeTruthy()
    expect(screen.getByRole("link", { name: "Đăng nhập" }).getAttribute("href")).toBe(
      "/login"
    )
  })

  it("refuses mismatching passwords and shows an invalid-link error from the server", async () => {
    setUrl("/reset-password?token=abc123")
    render(<AuthPage mode="reset" />)
    fill("Nhập mật khẩu mới", "newpass1")
    fill("Nhập lại mật khẩu", "other123")
    fireEvent.click(screen.getByRole("button", { name: /Đặt lại mật khẩu/ }))
    expect(await screen.findByText("Mật khẩu xác nhận không khớp.")).toBeTruthy()
    expect(authApi.resetPassword).not.toHaveBeenCalled()

    vi.mocked(authApi.resetPassword).mockRejectedValue(
      httpError(400, { errorCode: "E014", message: "The reset link is invalid or has expired" })
    )
    fill("Nhập lại mật khẩu", "newpass1")
    fireEvent.click(screen.getByRole("button", { name: /Đặt lại mật khẩu/ }))
    expect(
      await screen.findByText(
        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới."
      )
    ).toBeTruthy()
  })
})
