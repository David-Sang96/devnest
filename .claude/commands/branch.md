# Create Branch

Create a new branch using project conventions.

Tasks:

1. Ask for branch purpose if unclear.
2. Generate a branch name.

Examples:

```text
feature/user-profile
feature/auth-system
fix/navbar-overflow
fix/login-bug
refactor/api-client
docs/readme-update
```

3. Update local main:

```bash
git checkout main
git pull origin main
```

4. Create branch:

```bash
git checkout -b <branch-name>
```

5. Confirm branch creation.

Rules:

- Never work directly on main.
- Use descriptive branch names.
