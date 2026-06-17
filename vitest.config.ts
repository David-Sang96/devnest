import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Replace animation library with a plain-HTML stub so jsdom doesn't
      // choke on layout measurements / Web Animations API.
      "motion/react": path.resolve(__dirname, "./test/mocks/motion.tsx"),
      // Replace the Base UI headless button with a plain <button> element.
      "@base-ui/react/button": path.resolve(__dirname, "./test/mocks/base-ui-button.tsx"),
      // Replace Base UI dialog primitives with a controllable in-memory stub.
      "@base-ui/react/dialog": path.resolve(__dirname, "./test/mocks/base-ui-dialog.tsx"),
      // Replace dnd-kit with no-op stubs (layout APIs unavailable in jsdom).
      // @dnd-kit/utilities is pure math — use the real package, not a stub.
      "@dnd-kit/core": path.resolve(__dirname, "./test/mocks/dnd-kit.tsx"),
      "@dnd-kit/sortable": path.resolve(__dirname, "./test/mocks/dnd-kit.tsx"),
    },
  },
});
