# Release Checklist

Prepare the project for release.

Tasks:

1. Review git status.

```bash
git status
```

2. Run project verification:

```bash
npm run lint
npm run typecheck
npm run build
```

3. Fix issues if possible.

4. Review recent commits:

```bash
git log --oneline -10
```

5. Generate release notes:
   - Features
   - Fixes
   - Refactors
   - Breaking changes

6. Verify:
   - No secrets committed
   - No debug code
   - No console logs left unintentionally

7. Confirm release readiness.

Output:

- Release summary
- Risks
- Recommended next steps
