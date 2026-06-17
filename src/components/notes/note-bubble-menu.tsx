"use client";

import { useState } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link,
  Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteBubbleMenuProps {
  editor: Editor | null;
}

export function NoteBubbleMenu({ editor }: NoteBubbleMenuProps) {
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) return null;

  function applyLink() {
    if (linkUrl.trim()) {
      editor!.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setShowLink(false);
    setLinkUrl("");
  }

  function cancelLink() {
    setShowLink(false);
    setLinkUrl("");
  }

  return (
    <BubbleMenu editor={editor}>
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
        {showLink ? (
          <div className="flex items-center gap-1 px-1">
            <input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink();
                if (e.key === "Escape") cancelLink();
              }}
              placeholder="https://..."
              className="w-44 rounded border border-border bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={applyLink}
              className="rounded px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </div>
        ) : (
          <>
            <BubbleBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} aria-label="Bold" title="Bold"><Bold className="size-3.5" /></BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} aria-label="Italic" title="Italic"><Italic className="size-3.5" /></BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} aria-label="Underline" title="Underline"><UnderlineIcon className="size-3.5" /></BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} aria-label="Strike" title="Strikethrough"><Strikethrough className="size-3.5" /></BubbleBtn>
            <BubbleBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} aria-label="Code" title="Inline code"><Code className="size-3.5" /></BubbleBtn>
            <div className="mx-0.5 h-4 w-px bg-border shrink-0" />
            {editor.isActive("link") ? (
              <BubbleBtn onClick={() => editor.chain().focus().unsetLink().run()} active={false} aria-label="Remove link" title="Remove link"><Unlink className="size-3.5" /></BubbleBtn>
            ) : (
              <BubbleBtn
                onClick={() => {
                  setLinkUrl(editor.getAttributes("link").href ?? "");
                  setShowLink(true);
                }}
                active={false}
                aria-label="Add link"
                title="Add link"
              >
                <Link className="size-3.5" />
              </BubbleBtn>
            )}
          </>
        )}
      </div>
    </BubbleMenu>
  );
}

function BubbleBtn({
  onClick,
  active,
  children,
  title,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded p-1.5 transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
      {...props}
    >
      {children}
    </button>
  );
}
