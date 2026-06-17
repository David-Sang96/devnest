# Skill: new-workspace-tool

Scaffold a new tool page into the DevNest workspace.

## When to use

When the user says "add a new tool", "scaffold a new page", or "create a new workspace tool called X".

## Steps

1. **Get the tool name** from the user's request (e.g. "regex tester", "base64 encoder").
2. **Create the route page** at `src/app/(workspace)/<slug>/page.tsx` as a placeholder (`"use client"` if interactive).
3. **Add the nav item** to `src/components/layout/sidebar.tsx` — add an entry to the `navItems` array with an appropriate `lucide-react` icon.
4. **Create the component folder** at `src/components/<slug>/` if the tool needs more than one component.
5. **Commit** with message: `feat: scaffold <name> tool page`.

## Rules

- Follow PROJECT_RULES.md: no abstraction until duplicated 3+ times, no Context API, no classes.
- Use motion for any entrance animations (import from `"motion/react"`).
- Stateless tools (no persistence needed) get no DB store — just `useState`.
- Stateful tools need a `src/hooks/use-<slug>.ts` hook following the pattern in `use-notes.ts`.

## Example output

For "add a regex tester tool":
- `src/app/(workspace)/regex/page.tsx`
- `src/components/regex/` folder
- Sidebar entry: `{ href: "/regex", label: "Regex Tester", icon: Regex }`
