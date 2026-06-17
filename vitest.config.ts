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
    },
  },
});
