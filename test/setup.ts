import "@testing-library/jest-dom/vitest";

// navigator.clipboard is not implemented in jsdom
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
  configurable: true,
});

// URL.createObjectURL / revokeObjectURL are not in jsdom
Object.defineProperty(URL, "createObjectURL", {
  value: vi.fn(() => "blob:mock-url"),
  writable: true,
  configurable: true,
});
Object.defineProperty(URL, "revokeObjectURL", {
  value: vi.fn(),
  writable: true,
  configurable: true,
});
