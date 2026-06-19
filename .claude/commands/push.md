# Push Changes

Perform a safe commit and push workflow.

Tasks:

1. Run:

```bash
git status
git diff
```

2. Summarize all changes.

3. Create a conventional commit message.

4. Commit:

```bash
git add .
git commit -m "<commit-message>"
```

5. Determine current branch:

```bash
git branch --show-current
```

6. Push:

New branch:

```bash
git push -u origin <branch-name>
```

Existing branch:

```bash
git push
```

Rules:

- Never use git push --force.
- Never commit secrets.
- Review changes before commit.
- Explain what was committed and pushed.
