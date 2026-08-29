import { render, screen } from "@testing-library/react"

import { Button } from "../ui/button"

describe("<Button />", () => {
  it("should render the medium Button as default", () => {
    const { container } = render(<Button />)

    expect(container.firstChild).toHaveClass(
      "bg-primary text-primary-foreground hover:bg-primary/90"
    )

    expect(container.firstChild).toMatchSnapshot()
  })

  it("should render the outline Button", () => {
    const { container } = render(<Button variant="outline" />)

    expect(container.firstChild).toHaveClass(
      "border-input bg-background hover:bg-accent hover:text-accent-foreground border"
    )

    expect(container.firstChild).toMatchSnapshot()
  })

  it("should render the large Button", () => {
    const { container } = render(<Button variant="outline" size="lg" />)

    expect(screen.getByRole("button")).toBeInTheDocument()

    expect(container.firstChild).toHaveClass("h-11 rounded-md px-8")
    expect(container.firstChild).toMatchSnapshot()
  })

  it("should render the Button with text", () => {
    const text = "Hello world"
    const { container } = render(<Button>{text}</Button>)

    expect(container.innerText).equal(text)
    expect(container.firstChild).toMatchSnapshot()
  })
})
