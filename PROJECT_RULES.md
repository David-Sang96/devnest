# Project Rules

## General

- Prefer simple solutions
- Avoid abstraction until duplicated 3+ times
- No Context API
- No Zustand
- No classes
- No premature optimization

## Responsive Design

- All UI must be fully responsive
- Design mobile-first
- Support mobile, tablet, laptop, and desktop layouts
- Avoid horizontal scrolling
- Use Tailwind responsive utilities (sm:, md:, lg:, xl:)
- Components must adapt gracefully to different screen sizes
- Any new page or component must be responsive by default
- Do not consider a task complete until the UI works on mobile and desktop

## UI / Animation Rules

- Always use framer-motion for UI animations when animation is needed
- Prefer motion components (motion.div, motion.button, etc.)
- Use variants for reusable animations instead of inline animation props
- Avoid CSS keyframe animations for UI motion unless necessary
- Keep animations subtle and fast (no over-engineering)
- If UI is being created or modified, assume framer-motion should be used unless explicitly told otherwise

## Accessibility

- Use semantic HTML elements
- Ensure keyboard accessibility
- Maintain sufficient color contrast
- Add aria labels when appropriate
