# DevNest

---

## Slide 1 — What is DevNest?

**DevNest** is an all-in-one personal developer workspace that runs entirely in your browser.

- Take notes with a rich WYSIWYG editor
- Manage tasks on a visual Kanban board
- Store passwords locally
- Format and explore JSON data
- Zero accounts, zero cloud — everything lives in your browser (IndexedDB)

---

## Slide 2 — The Problem

Developer tools are scattered across too many apps.

- Notes in Notion
- Tasks in Trello or Linear
- Passwords in a text file somewhere
- JSON in an online formatter

**DevNest brings it all into one offline-first workspace.**

---

## Slide 3 — Key Features

**Notes**
- WYSIWYG editor (Tiptap) with formatting toolbar
- Search, sort by date/title, filter by pinned
- Pin important notes to the top

**Kanban Board**
- Drag-and-drop cards across columns
- Card priorities, due dates, and labels
- Column color theming
- Archive cards instead of deleting them

**Other Tools**
- Password manager (local only)
- JSON explorer/formatter

---

## Slide 4 — Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS v4 (CSS-first) |
| Components | shadcn/ui + @base-ui/react |
| Animation | Motion v12 |
| Drag & Drop | @dnd-kit |
| Rich Text | Tiptap + ProseMirror |
| Storage | IndexedDB via `idb` |
| Tests | Vitest + Testing Library |
| Built with | Claude Code |

---

## Slide 5 — Built with Claude Code

This entire project was built using **Claude Code** — Anthropic's CLI for AI-assisted development.

- Used the **brainstorming** skill to design features collaboratively
- Used **subagent-driven development** to implement 8 tasks in parallel with automatic reviews
- Custom slash commands (`/commit`, `/push`, `/review`) for daily workflow
- Custom agents (`devnest-reviewer.md`) for automated code review
- 379 component and hook tests, all passing

---

## Slide 6 — What's Next

- **Pomodoro timer** — focus sessions linked to Kanban cards
- **Markdown export** — export notes and boards to `.md` files
- **Keyboard shortcuts** — power-user navigation across all tools
- **Themes** — more color schemes beyond light/dark
- **PWA support** — install DevNest as a desktop app

**GitHub:** https://github.com/David-Sang96/devnest
