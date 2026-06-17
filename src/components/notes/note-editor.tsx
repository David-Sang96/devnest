"use client";

import { useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, CheckCheck } from "lucide-react";
import type { Note } from "@/types";
import { loadContent } from "@/lib/note-content";
import { NoteToolbar } from "./note-toolbar";
import { NoteBubbleMenu } from "./note-bubble-menu";

interface Props {
  note: Note;
  onUpdate: (
    id: string,
    changes: Partial<Pick<Note, "content" | "title">>
  ) => Promise<void>;
  onBack?: () => void;
}

export function NoteEditor({ note, onUpdate, onBack }: Props) {
  const [titleValue, setTitleValue] = useState(
    note.title === "Untitled" && !note.content ? "" : note.title
  );
  const [showSaved, setShowSaved] = useState(false);
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerSaved() {
    setShowSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: loadContent(note.content),
    editorProps: {
      attributes: {
        class: "prose-editor focus:outline-none min-h-64 px-4 md:px-6 py-5",
      },
    },
    onUpdate({ editor }) {
      setShowSaved(false);
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
      contentDebounceRef.current = setTimeout(async () => {
        await onUpdate(note.id, {
          content: JSON.stringify(editor.getJSON()),
        });
        triggerSaved();
      }, 500);
    },
  });

  function handleTitleChange(value: string) {
    const clean = value.replace(/\n/g, "");
    setTitleValue(clean);
    setShowSaved(false);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(async () => {
      await onUpdate(note.id, { title: clean });
      triggerSaved();
    }, 500);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      editor?.commands.focus("start");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
              aria-label="Back to notes list"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <input
            type="text"
            value={titleValue}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            aria-label="Note title"
            className="flex-1 min-w-0 bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <AnimatePresence>
          {showSaved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 text-xs text-muted-foreground shrink-0"
            >
              <CheckCheck className="size-3" />
              Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <NoteToolbar editor={editor} />

      <div className="flex-1 overflow-y-auto">
        <NoteBubbleMenu editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </motion.div>
  );
}
