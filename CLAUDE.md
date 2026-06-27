# CLAUDE.md

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
npx vitest       # run tests (vitest + @testing-library/react)
```

## Architecture

**Next.js 16 App Router** — pages under `src/app/`. Breaking changes from earlier versions; check `node_modules/next/dist/docs/` if behavior unclear.

**Route groups** — workspace tools under `src/app/(workspace)/`, share `WorkspaceShell` layout (sidebar + page transition). Root `page.tsx` redirects to `/notes`. New tool: create `src/app/(workspace)/<tool>/page.tsx`, add nav entry to `src/components/layout/sidebar.tsx`, wire hook + components.

**Data layer** — all persistence via IndexedDB, singleton `getDB()` from `src/lib/db.ts` (`idb` library). DB: `developer-workspace`, schema version 2. Stores: `notes`, `kanban_boards`, `kanban_columns`, `kanban_cards`, `kanban_labels`. Each feature owns a hook in `src/hooks/` — optimistic state update then IDB persist. All `getDB()` callers must be `"use client"`.

**Backup** — `src/lib/backup.ts` exports `exportAllData / downloadBackup / parseBackup / importData`. Format: `version: 2`, flat arrays of all five stores. Any new store must be added to backup format.

**UI components** — shadcn/ui with **`@base-ui/react`** as headless primitive (not Radix UI). `npx shadcn@latest add <component>`. Components land in `src/components/ui/`.

**Styling** — Tailwind v4 (CSS-first, no `tailwind.config.js`). Theme tokens in `src/app/globals.css` as CSS variables (`oklch`). Dark mode via `.dark` class. `tw-animate-css` for animation utilities.

**Animations** — `motion` v12. Import: `import { motion } from "motion/react"`

**Drag-and-drop** — `@dnd-kit/core` + `@dnd-kit/sortable` in Kanban. Follow patterns in `src/components/kanban/`.

**Icons** — `lucide-react` (v1.20).

**Utilities** — `cn()` from `@/lib/utils` (`clsx` + `tailwind-merge`).
