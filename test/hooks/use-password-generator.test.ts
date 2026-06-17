import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePasswordGenerator } from "@/hooks/use-password-generator";

describe("usePasswordGenerator()", () => {
  it("generates a password after mount (useEffect fires)", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password.length).toBeGreaterThan(0));
  });

  it("password length matches the default option (16)", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password).toHaveLength(16));
  });

  it("ships with the correct default options", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password).toBeTruthy());
    const { options } = result.current;
    expect(options.length).toBe(16);
    expect(options.uppercase).toBe(true);
    expect(options.lowercase).toBe(true);
    expect(options.numbers).toBe(true);
    expect(options.symbols).toBe(false);
  });

  it("exposes a positive entropy value", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password).toBeTruthy());
    expect(result.current.entropy).toBeGreaterThan(0);
  });

  it("exposes a valid strength level", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password).toBeTruthy());
    expect(["Weak", "Fair", "Strong", "Very Strong"]).toContain(result.current.strength);
  });

  it("regenerate() produces a new password of the same length", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password).toBeTruthy());

    act(() => result.current.regenerate());

    expect(result.current.password).toHaveLength(result.current.options.length);
  });

  it("updateOption('length') updates both options and password length", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password).toBeTruthy());

    act(() => result.current.updateOption("length", 32));

    expect(result.current.options.length).toBe(32);
    expect(result.current.password).toHaveLength(32);
  });

  it("updateOption('symbols', true) increases entropy", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password).toBeTruthy());

    const entropyBefore = result.current.entropy;
    act(() => result.current.updateOption("symbols", true));

    expect(result.current.entropy).toBeGreaterThan(entropyBefore);
  });

  it("updateOption('lowercase', false) narrows the character set", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password).toBeTruthy());

    act(() => {
      result.current.updateOption("lowercase", false);
      result.current.updateOption("numbers", false);
      result.current.updateOption("symbols", false);
    });

    // Only uppercase enabled — every character must be A-Z
    expect(result.current.password).toMatch(/^[A-Z]+$/);
  });

  it("shows 'Weak' strength for a short digits-only password", async () => {
    const { result } = renderHook(() => usePasswordGenerator());
    await waitFor(() => expect(result.current.password).toBeTruthy());

    act(() => {
      result.current.updateOption("length", 4);
      result.current.updateOption("uppercase", false);
      result.current.updateOption("lowercase", false);
      result.current.updateOption("numbers", true);
      result.current.updateOption("symbols", false);
    });

    // 4 * log2(10) ≈ 13 bits → Weak
    expect(result.current.strength).toBe("Weak");
  });
});
