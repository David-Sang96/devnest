# Project Rules

## General

- Prefer simple solutions
- Avoid abstraction until duplicated 3+ times
- No Context API
- No Zustand
- No classes
- No premature optimization

## UI / Animation Rules

- Always use framer-motion for UI animations when animation is needed
- Prefer motion components (motion.div, motion.button, etc.)
- Use variants for reusable animations instead of inline animation props
- Avoid CSS keyframe animations for UI motion unless necessary
- Keep animations subtle and fast (no over-engineering)
- If UI is being created or modified, assume framer-motion should be used unless explicitly told otherwise
