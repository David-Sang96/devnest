---
description: Create a UI component using TDD (test-driven development)
allowed-tools: Read, Write, Edit, Glob, Bash(npm test:*), Bash(npx vitest:*)
argument-hint: "[Brief component description]"
---

## User Input

The user has provided information about the component to make: **$ARGUMENTS**

## Do This First:

From the component information above, determine a PascalCase component name (e.g., "a card showing user stats" -> `UserStatsCard`).

### 1. Write Tests First

Create `tests/components/[ComponentName].test.tsx` with 2-3 simple tests:

- Test that the component renders
- Test key elements are present (roles, text)

Pattern:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ComponentName from "@/components/ComponentName";

describe("ComponentName", () => {
  it("renders successfully", () => {
    render(<ComponentName />);
    // assertions
  });
});
```

### 2. Run tests (expect failure)

```bash
 npm test tests/components/[ComponentName].test.tsx
```

### 3. Create Component

- `components/[ComponentName]/[Component].tsx`
- `components/[ComponentName]/[Component].module.css`
- `components/[ComponentName]/index.tsx` -> `export {default} from './[ComponentName]'`

Conventions: no semicolons, CSS Modules, theme colors from global.css when needed.

### 4. Run tests (expect pass)

```bash
 npm test tests/components/[ComponentName].test.tsx
```

Iterate on component development until all tests pass.

<!-- Meaning:
Run tests
See failure
Fix component
Run again
Repeat until green
 -->

### 5. Add to Preview Page

Update `app/(public)/preview/pages.tsx` with a labeled section showing the components.

## Rules

- Keep tests minimal
- Only proceed when current step passes

<!--
Why This Workflow?

It's enforcing TDD:

1. Write test
2. Test fails
3. Write component
4. Test passes
5. Preview component

instead of:

1. Build component
2. Hope it works
3. Write tests later

For a small project like your DevNest app, this gives you:

Consistent component structure
Basic test coverage
Preview page for manual checking
Less chance of breaking UI during refactors

So this file is essentially an AI recipe that forces Claude Code to build components the TDD way.
 -->

<!-- ============================================================================================================= -->
<!-- ============================================================================================================= -->
<!-- ============================================================================================================= -->

<!--
In your Claude command
## User Input

means:

This is a major section explaining the user input.

Then:

### 1. Write Tests First

means:

A subsection/step inside the command.

The author could have written:

# User Input
# Write Tests First
# Run Tests

but that would make everything look like top-level sections.

Instead they use:

## User Input
### 1. Write Tests First
### 2. Run Tests
### 3. Create Component

which shows:

User Input
├─ Write Tests First
├─ Run Tests
├─ Create Component
├─ Run Tests Again
└─ Add To Preview

So ## and ### are simply Markdown heading levels used to structure the document and make it easier for both humans and AI tools like Claude Code to follow instructions.

Number of # matters

Markdown	             Meaning
#	                     Biggest heading
##	                   Section
###	                   Subsection
####	                 Sub-subsection
#####	                 Smaller
######	               Smallest

 -->
