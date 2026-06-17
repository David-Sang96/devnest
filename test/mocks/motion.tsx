/**
 * Stub for motion/react used in Vitest.
 * Renders plain HTML elements — strips all motion-specific props so React
 * doesn't warn about unknown DOM attributes.
 */
import React from "react";

const MOTION_PROPS = new Set([
  "initial", "animate", "exit", "transition", "variants",
  "layout", "layoutId",
  "whileTap", "whileHover", "whileFocus", "whileDrag", "whileInView",
  "drag", "dragConstraints", "dragElastic", "dragMomentum", "dragDirectionLock",
  "onAnimationStart", "onAnimationComplete", "onUpdate",
  "onDragStart", "onDragEnd", "onHoverStart", "onHoverEnd", "onTapStart", "onTap",
  "transformTemplate", "custom",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createEl(tag: string): React.ComponentType<any> {
  return React.forwardRef<HTMLElement, Record<string, unknown>>(
    function MotionEl({ children, ...props }, ref) {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(props)) {
        if (!MOTION_PROPS.has(k)) clean[k] = v;
      }
      return React.createElement(tag, { ...clean, ref }, children as React.ReactNode);
    }
  );
}

export const motion = new Proxy({} as Record<string, ReturnType<typeof createEl>>, {
  get(_, tag: string) {
    return createEl(tag);
  },
});

export function AnimatePresence({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
