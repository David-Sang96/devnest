import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordDisplay } from "@/components/password/password-display";

describe("<PasswordDisplay />", () => {
  beforeEach(() => {
    vi.mocked(navigator.clipboard.writeText).mockClear();
  });

  it("renders the password text", () => {
    render(<PasswordDisplay password="abc123XYZ" onRegenerate={() => {}} />);
    expect(screen.getByText("abc123XYZ")).toBeInTheDocument();
  });

  it("shows a dash placeholder when password is empty", () => {
    render(<PasswordDisplay password="" onRegenerate={() => {}} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders a 'Regenerate password' button", () => {
    render(<PasswordDisplay password="abc" onRegenerate={() => {}} />);
    expect(screen.getByRole("button", { name: /regenerate password/i })).toBeInTheDocument();
  });

  it("renders a 'Copy password' button", () => {
    render(<PasswordDisplay password="abc" onRegenerate={() => {}} />);
    expect(screen.getByRole("button", { name: /copy password/i })).toBeInTheDocument();
  });

  it("calls onRegenerate when the regenerate button is clicked", async () => {
    const onRegenerate = vi.fn();
    render(<PasswordDisplay password="abc" onRegenerate={onRegenerate} />);
    await userEvent.click(screen.getByRole("button", { name: /regenerate password/i }));
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("copies the password to clipboard when copy is clicked", async () => {
    render(<PasswordDisplay password="Secret99!" onRegenerate={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /copy password/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Secret99!");
  });

  it("disables the copy button when password is empty", () => {
    render(<PasswordDisplay password="" onRegenerate={() => {}} />);
    expect(screen.getByRole("button", { name: /copy password/i })).toBeDisabled();
  });

  it("does not call clipboard when copy is clicked with empty password", async () => {
    render(<PasswordDisplay password="" onRegenerate={() => {}} />);
    // button is disabled so userEvent won't click it
    const btn = screen.getByRole("button", { name: /copy password/i });
    expect(btn).toBeDisabled();
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
