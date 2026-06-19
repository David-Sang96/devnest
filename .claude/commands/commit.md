# Commit Changes

Create a safe and well-documented git commit.

Tasks:

1. Run:

```bash
git status
git diff --staged
git diff
```

2. Review all changed files.

3. Summarize what was implemented.

4. Generate:
   - Conventional commit title
   - Detailed commit body

Format:

```text
<type>: <short summary>

- Change 1
- Change 2
- Change 3
```

5. If commit intent is unclear, ask for clarification.

6. Commit using title and body:

```bash
git add .

git commit \
  -m "<title>" \
  -m "<description>"
```

Rules:

- Never use --amend unless requested.
- Never commit secrets or credentials.
- Never commit broken code knowingly.
- Prefer small focused commits.
- Keep title under 72 characters.
- Use conventional commits (feat, fix, refactor, docs, chore, test).
- Explain implementation details in the commit body.
- Avoid generic messages such as "update code" or "fix stuff".

After committing:

- Show the final commit message.
- Summarize what was committed.
