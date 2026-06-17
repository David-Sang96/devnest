import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StrengthMeter } from "@/components/password/strength-meter";

describe("<StrengthMeter />", () => {
  it("renders the 'Strength' label", () => {
    render(<StrengthMeter strength="Fair" entropy={50} />);
    expect(screen.getByText("Strength")).toBeInTheDocument();
  });

  it("displays the current strength level text", () => {
    render(<StrengthMeter strength="Strong" entropy={90} />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("displays the entropy bit count", () => {
    render(<StrengthMeter strength="Fair" entropy={47.6} />);
    expect(screen.getByText("48 bits")).toBeInTheDocument();
  });

  it("renders all 4 bar slots", () => {
    const { container } = render(<StrengthMeter strength="Weak" entropy={20} />);
    // Each level gets one bar wrapper div with flex-1 class
    const bars = container.querySelectorAll(".flex-1.h-1\\.5");
    expect(bars).toHaveLength(4);
  });

  it("shows 'Weak' with rose label class", () => {
    render(<StrengthMeter strength="Weak" entropy={30} />);
    expect(screen.getByText("Weak")).toHaveClass("text-rose-500");
  });

  it("shows 'Fair' with amber label class", () => {
    render(<StrengthMeter strength="Fair" entropy={60} />);
    expect(screen.getByText("Fair")).toHaveClass("text-amber-500");
  });

  it("shows 'Strong' with emerald label class", () => {
    render(<StrengthMeter strength="Strong" entropy={90} />);
    expect(screen.getByText("Strong")).toHaveClass("text-emerald-500");
  });

  it("shows 'Very Strong' with sky label class", () => {
    render(<StrengthMeter strength="Very Strong" entropy={130} />);
    expect(screen.getByText("Very Strong")).toHaveClass("text-sky-500");
  });

  it("updates label when strength prop changes", () => {
    const { rerender } = render(<StrengthMeter strength="Weak" entropy={30} />);
    expect(screen.getByText("Weak")).toBeInTheDocument();

    rerender(<StrengthMeter strength="Very Strong" entropy={130} />);
    expect(screen.getByText("Very Strong")).toBeInTheDocument();
    expect(screen.queryByText("Weak")).not.toBeInTheDocument();
  });
});
