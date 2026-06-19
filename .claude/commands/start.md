# Start Work Session

Prepare the repository before development.

Tasks:

1. Check current branch:

```bash
git branch --show-current
```

2. Check repository status:

```bash
git status
```

3. Update main:

```bash
git checkout main
git pull origin main
```

4. Ask whether to:
   - Create a new feature branch
   - Continue existing branch

5. If creating a new branch:

```bash
git checkout -b feature/<name>
```

6. Review project rules and architecture.

7. Summarize current project state and recommend next tasks.

Rules:

- Never develop directly on main.
- Prefer small incremental changes.
