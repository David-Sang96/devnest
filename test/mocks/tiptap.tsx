import React from "react";

export function useEditor(_options: object) {
  return null;
}

export function EditorContent({
  editor: _editor,
  ...props
}: {
  editor: unknown;
  [key: string]: unknown;
}) {
  return (
    <div
      data-testid="editor-content"
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    />
  );
}

export function BubbleMenu({
  children,
  editor: _editor,
  ...props
}: {
  children?: React.ReactNode;
  editor: unknown;
  [key: string]: unknown;
}) {
  return (
    <div
      data-testid="bubble-menu"
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    >
      {children}
    </div>
  );
}

const extensionStub = { configure: () => extensionStub };

export default extensionStub;
