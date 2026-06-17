import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordOptionsPanel } from "@/components/password/password-options";
import type { PasswordOptions } from "@/lib/password";

const DEFAULT: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: false,
};

describe("<PasswordOptionsPanel />", () => {
  it("renders a 'Length' label", () => {
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={() => {}} />);
    expect(screen.getByText("Length")).toBeInTheDocument();
  });

  it("displays the current length value", () => {
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={() => {}} />);
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("renders a range slider with the correct value", () => {
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={() => {}} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveValue("16");
  });

  it("calls onUpdate('length', newValue) when the slider moves", () => {
    const onUpdate = vi.fn();
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={onUpdate} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "32" } });
    expect(onUpdate).toHaveBeenCalledWith("length", 32);
  });

  it("renders all 4 charset toggle buttons", () => {
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={() => {}} />);
    expect(screen.getByRole("button", { name: /uppercase/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lowercase/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /numbers/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /symbols/i })).toBeInTheDocument();
  });

  it("calls onUpdate to toggle uppercase off when it is currently on", async () => {
    const onUpdate = vi.fn();
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={onUpdate} />);
    await userEvent.click(screen.getByRole("button", { name: /uppercase/i }));
    expect(onUpdate).toHaveBeenCalledWith("uppercase", false);
  });

  it("calls onUpdate to toggle symbols on when it is currently off", async () => {
    const onUpdate = vi.fn();
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={onUpdate} />);
    await userEvent.click(screen.getByRole("button", { name: /symbols/i }));
    expect(onUpdate).toHaveBeenCalledWith("symbols", true);
  });

  it("applies active styling to enabled charsets", () => {
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={() => {}} />);
    // uppercase is enabled → should have border-primary class
    expect(screen.getByRole("button", { name: /uppercase/i })).toHaveClass("border-primary");
  });

  it("does not apply active styling to disabled charsets", () => {
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={() => {}} />);
    // symbols is disabled → should NOT have border-primary
    expect(screen.getByRole("button", { name: /symbols/i })).not.toHaveClass("border-primary");
  });

  it("shows example character snippets on toggle buttons", () => {
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={() => {}} />);
    expect(screen.getByText("A–Z")).toBeInTheDocument();
    expect(screen.getByText("a–z")).toBeInTheDocument();
    expect(screen.getByText("0–9")).toBeInTheDocument();
    expect(screen.getByText("!@#$")).toBeInTheDocument();
  });

  it("shows slider bounds 4 and 64", () => {
    render(<PasswordOptionsPanel options={DEFAULT} onUpdate={() => {}} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("64")).toBeInTheDocument();
  });
});
