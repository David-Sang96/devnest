import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/notes" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode; [k: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/layout/theme-toggle", () => ({
  ThemeToggle: () => <button aria-label="Toggle theme" />,
}));

beforeEach(() => {
  localStorage.clear();
});

describe("<Sidebar />", () => {
  it("renders a collapse button with aria-label 'Collapse sidebar'", () => {
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: /collapse sidebar/i })).toBeInTheDocument();
  });

  it("shows nav labels when expanded", () => {
    render(<Sidebar />);
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("hides nav labels after collapsing", async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("changes toggle button label to 'Expand sidebar' when collapsed", async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it("persists collapsed state to localStorage", async () => {
    render(<Sidebar />);
    await userEvent.click(screen.getByRole("button", { name: /collapse sidebar/i }));
    expect(localStorage.getItem("devnest-sidebar-collapsed")).toBe("true");
  });

  it("reads collapsed=true from localStorage on mount", () => {
    localStorage.setItem("devnest-sidebar-collapsed", "true");
    render(<Sidebar />);
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });
});
