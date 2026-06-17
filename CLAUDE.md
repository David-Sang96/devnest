# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # run ESLint
```

## Architecture

**Next.js 16 App Router** — pages live under `src/app/`, using the standard `layout.tsx` / `page.tsx` conventions. This is Next.js 16, which has breaking changes from earlier versions; check `node_modules/next/dist/docs/` if behavior is unclear.

**UI components** — shadcn/ui is configured, but components use **`@base-ui/react`** as their headless primitive layer (not Radix UI). New shadcn components added via `npx shadcn@latest add <component>` will follow this pattern. Components land in `src/components/ui/`.

**Styling** — Tailwind v4 (CSS-first, no `tailwind.config.js`). All theme tokens (colors, radius, fonts) are defined as CSS variables in `src/app/globals.css` using the `oklch` color space. Dark mode is toggled via the `.dark` class. `tw-animate-css` is available for pre-built animation utilities.

**Animations** — `motion` v12 is installed. Import as:

```ts
import { motion } from "motion/react"
```

**Utilities** — `cn()` from `@/lib/utils` combines `clsx` and `tailwind-merge` for conditional class names.
