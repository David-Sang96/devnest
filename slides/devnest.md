---
marp: true
theme: default
paginate: false
style: |
  section {
    font-family: 'Geist', 'Inter', sans-serif;
    background: #09090b;
    color: #fafafa;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px;
  }
  h1 { font-size: 2.8rem; font-weight: 700; margin-bottom: 0.5rem; }
  h2 { font-size: 2rem; font-weight: 600; color: #a1a1aa; margin-bottom: 1rem; }
  p, li { font-size: 1.2rem; color: #d4d4d8; line-height: 1.7; }
  ul { margin-top: 0.5rem; }
  strong { color: #fafafa; }
  table, th, td { color: #000; }
  .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #71717a;
    margin-bottom: 0.5rem;
  }
---

<!-- 20 seconds per slide -->

# DevNest

### Your personal developer workspace

A client-only, offline-first toolkit for developers —
built with Next.js 16, TypeScript, and IndexedDB.

---

## The Problem

Developers juggle too many browser tabs:

- Notes scattered across apps
- Kanban boards behind logins
- JSON formatters with ads
- Password generators you can't trust

**One workspace. Zero accounts. All local.**

---

## What's Inside

- **Notes** — write and auto-save with debounce
- **Kanban** — drag-and-drop task board
- **JSON Formatter** — format, minify, validate
- **Password Generator** — entropy-based strength meter

All data stays in **IndexedDB** — no server, no sync, no cost.

---

## Tech Choices

| Layer     | Choice              | Why                    |
| --------- | ------------------- | ---------------------- |
| Framework | Next.js 16          | App Router, TypeScript |
| Storage   | IndexedDB via `idb` | No backend needed      |
| UI        | shadcn + base-ui    | Accessible primitives  |
| Animation | Motion v12          | Smooth, performant     |
| Theme     | next-themes         | Dark/light, zero flash |
| Testing   | Vitest + RTL        | Fast, component-level  |

---

## How I Built It

Driven by **Claude Code** with a clear workflow:

1. Plan first — architecture approved before any code
2. Small frequent commits — one feature per phase
3. Rules enforced — no Zustand, no Context, no classes
4. Motion everywhere — animations used where they add UX value

**MCP + Skill + Agent** wired into the repo for AI-assisted development.

---

## MCP — Model Context Protocol

Connects Claude to live tools and data sources:

- **context7** — pulls current library docs (Next.js, Tailwind, idb) so Claude never hallucinates outdated APIs
- **claude-mem** — persistent cross-session memory; Claude remembers past decisions and design choices

---

## Skills — Reusable Workflows

Slash commands that encode how to approach a task:

- `/start` — loads session context before touching code
- `/brainstorming` — explores requirements before implementation
- `/make-plan` → `/do` — architect first, then execute with subagents
- `/commit` — staged, conventional commits with one command
- `/code-review` — automated diff review before every push

Skills enforce **discipline by default** — the right process runs every time, not just when you remember.

---

## Agent — Automated Code Review

A dedicated `devnest-reviewer` agent scans every change:

- Checks component structure, hook patterns, and TypeScript correctness
- Flags accessibility issues (ARIA labels, keyboard nav)
- Validates test coverage against new code paths
- Posts findings before the commit lands

**Result**: code review happens on every feature, not just the ones that feel risky.

---

## Try It

```
git clone github.com/David-Sang96/devnest
npm install && npm run dev
```

Everything runs locally.
No API keys. No accounts. No data leaves your machine.

**github.com/David-Sang96/devnest**
