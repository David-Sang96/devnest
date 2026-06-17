"use client";

import React from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  CodeXml,
  Quote,
  List,
  ListOrdered,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteToolbarProps {
  editor: Editor | null;
}

export function NoteToolbar({ editor }: NoteToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/20 px-2 py-1.5 shrink-0">
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        aria-label="Heading 1"
        title="Heading 1"
      >
        <span className="text-xs font-bold leading-none">H1</span>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        aria-label="Heading 2"
        title="Heading 2"
      >
        <span className="text-xs font-bold leading-none">H2</span>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        aria-label="Heading 3"
        title="Heading 3"
      >
        <span className="text-xs font-bold leading-none">H3</span>
      </ToolButton>

      <Divider />

      <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} aria-label="Bold" title="Bold">
        <Bold className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} aria-label="Italic" title="Italic">
        <Italic className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} aria-label="Underline" title="Underline">
        <Underline className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} aria-label="Strikethrough" title="Strikethrough">
        <Strikethrough className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} aria-label="Inline code" title="Inline code">
        <Code className="size-3.5" />
      </ToolButton>

      <Divider />

      <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} aria-label="Bullet list" title="Bullet list">
        <List className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} aria-label="Ordered list" title="Ordered list">
        <ListOrdered className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} aria-label="Blockquote" title="Blockquote">
        <Quote className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} aria-label="Code block" title="Code block">
        <CodeXml className="size-3.5" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} aria-label="Horizontal rule" title="Horizontal rule">
        <Minus className="size-3.5" />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  onClick,
  active,
  title,
  children,
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

function Divider() {
  return <div className="mx-1 h-4 w-px bg-border shrink-0" />;
}
