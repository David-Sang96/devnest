import React, { useState, createContext, useContext } from "react";

interface DialogCtxValue {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const DialogCtx = createContext<DialogCtxValue>({ open: false, onOpenChange: () => {} });

function Root({
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  children,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const [internal, setInternal] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internal;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternal;
  return <DialogCtx.Provider value={{ open, onOpenChange: setOpen }}>{children}</DialogCtx.Provider>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Trigger({ children, render, ...props }: any) {
  const { onOpenChange } = useContext(DialogCtx);
  if (render) {
    return React.cloneElement(render, { ...props, onClick: () => onOpenChange(true) }, children);
  }
  return <button {...props} onClick={() => onOpenChange(true)}>{children}</button>;
}

function Portal({ children }: { children?: React.ReactNode }) {
  const { open } = useContext(DialogCtx);
  return open ? <>{children}</> : null;
}

function Backdrop({ ...props }) {
  return <div data-testid="dialog-backdrop" {...props} />;
}

function Popup({ children, ...props }: React.ComponentProps<"div">) {
  return <div role="dialog" {...props}>{children}</div>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Close({ children, render, ...props }: any) {
  const { onOpenChange } = useContext(DialogCtx);
  if (render) {
    return React.cloneElement(render, { ...props, onClick: () => onOpenChange(false) }, children);
  }
  return <button {...props} onClick={() => onOpenChange(false)}>{children}</button>;
}

function Title({ children, ...props }: React.ComponentProps<"h2">) {
  return <h2 {...props}>{children}</h2>;
}

function Description({ children, ...props }: React.ComponentProps<"p">) {
  return <p {...props}>{children}</p>;
}

export const Dialog = { Root, Trigger, Portal, Backdrop, Popup, Close, Title, Description };
