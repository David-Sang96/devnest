import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonInput } from "@/components/json/json-input";

describe("<JsonInput />", () => {
  it("renders a textarea", () => {
    render(<JsonInput value="" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("displays the current value", () => {
    render(<JsonInput value='{"a":1}' onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue('{"a":1}');
  });

  it("shows the placeholder text when value is empty", () => {
    render(<JsonInput value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/paste.*JSON/i)).toBeInTheDocument();
  });

  it("renders an 'Input' label", () => {
    render(<JsonInput value="" onChange={() => {}} />);
    expect(screen.getByText("Input")).toBeInTheDocument();
  });

  it("calls onChange with the new value when the user types", () => {
    const onChange = vi.fn();
    render(<JsonInput value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: '{"x":1}' } });
    expect(onChange).toHaveBeenCalledWith('{"x":1}');
  });

  it("calls onChange on every keystroke", () => {
    const onChange = vi.fn();
    render(<JsonInput value="" onChange={onChange} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "a" } });
    fireEvent.change(textarea, { target: { value: "ab" } });
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
