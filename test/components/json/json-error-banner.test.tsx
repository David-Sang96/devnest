import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { JsonErrorBanner } from "@/components/json/json-error-banner";

describe("<JsonErrorBanner />", () => {
  it("renders nothing when error is null", () => {
    const { container } = render(<JsonErrorBanner error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the error message when error is a string", () => {
    render(<JsonErrorBanner error="Unexpected token } at position 3" />);
    expect(screen.getByText("Unexpected token } at position 3")).toBeInTheDocument();
  });

  it("renders an icon alongside the error text", () => {
    render(<JsonErrorBanner error="bad JSON" />);
    // AlertCircle renders an SVG — check the wrapper exists
    const container = screen.getByText("bad JSON").closest("div");
    expect(container).toBeInTheDocument();
    expect(container?.querySelector("svg")).toBeInTheDocument();
  });

  it("switches from hidden to visible when error changes from null to a string", () => {
    const { rerender } = render(<JsonErrorBanner error={null} />);
    expect(screen.queryByText("oops")).not.toBeInTheDocument();

    rerender(<JsonErrorBanner error="oops" />);
    expect(screen.getByText("oops")).toBeInTheDocument();
  });

  it("switches from visible to hidden when error changes back to null", () => {
    const { rerender } = render(<JsonErrorBanner error="problem" />);
    expect(screen.getByText("problem")).toBeInTheDocument();

    rerender(<JsonErrorBanner error={null} />);
    expect(screen.queryByText("problem")).not.toBeInTheDocument();
  });
});
