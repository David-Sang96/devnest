# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
npx vitest       # run tests (vitest is configured, @testing-library/react available)
```

## Architecture

**Next.js 16 App Router** — pages live under `src/app/`, using the standard `layout.tsx` / `page.tsx` conventions. This is Next.js 16, which has breaking changes from earlier versions; check `node_modules/next/dist/docs/` if behavior is unclear.

**Route groups** — all workspace tools live under `src/app/(workspace)/` and share the `WorkspaceShell` layout (sidebar + page transition). The root `page.tsx` redirects to `/notes`. Adding a new tool means: create `src/app/(workspace)/<tool>/page.tsx`, add the nav entry to `src/components/layout/sidebar.tsx`, and wire up a hook + components.

**Data layer** — all persistence goes through IndexedDB via a singleton `getDB()` from `src/lib/db.ts` (uses the `idb` library). The DB name is `developer-workspace`, schema version 1. Stores: `notes`, `kanban_boards`, `kanban_columns`, `kanban_cards`. Each feature has a custom hook (`src/hooks/`) that owns both the React state and the IDB writes — optimistic updates are applied to state immediately, then persisted. Everything that calls `getDB()` must be in a `"use client"` file.

**Backup** — `src/lib/backup.ts` exports `exportAllData / downloadBackup / parseBackup / importData`. The backup format is versioned (`version: 1`) and includes all four stores as flat arrays. Any new store added to the DB schema must also be included in the backup format.

**UI components** — shadcn/ui is configured, but components use **`@base-ui/react`** as their headless primitive layer (not Radix UI). New shadcn components added via `npx shadcn@latest add <component>` will follow this pattern. Components land in `src/components/ui/`.

**Styling** — Tailwind v4 (CSS-first, no `tailwind.config.js`). All theme tokens (colors, radius, fonts) are defined as CSS variables in `src/app/globals.css` using the `oklch` color space. Dark mode is toggled via the `.dark` class. `tw-animate-css` is available for pre-built animation utilities.

**Animations** — `motion` v12 is installed. Import as:

```ts
import { motion } from "motion/react"
```

**Drag-and-drop** — `@dnd-kit/core` + `@dnd-kit/sortable` are used in the Kanban board. Follow the same pattern in `src/components/kanban/` for any new DnD feature.

**Icons** — `lucide-react` (v1.20) is the icon library.

**Utilities** — `cn()` from `@/lib/utils` combines `clsx` and `tailwind-merge` for conditional class names.
