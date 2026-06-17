/**
 * Stub for @base-ui/react/button used in Vitest.
 * Renders a plain <button> element with all standard HTML button props.
 */
import React from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Button = React.forwardRef<HTMLButtonElement, any>(
  function Button({ children, ...props }, ref) {
    return (
      <button ref={ref} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
