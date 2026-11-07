# Git commit hooks

ApiAdmin uses [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) + [commitlint](https://commitlint.js.org/).

## What runs

| Hook           | Checks                                                                              |
| -------------- | ----------------------------------------------------------------------------------- |
| **pre-commit** | Format staged files (Prettier), ESLint `--fix` on staged JS/TS, then `vitest --run` |
| **commit-msg** | Conventional Commits via commitlint                                                 |

## Commit message format

```
type(scope): subject

# Examples
feat(monitor): add webhook alert on failure
fix(ai): redact secrets in mock prompts
docs: update QUICKSTART_OSS
chore(hooks): add husky pre-commit pipeline
```

Allowed `type`: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore` `revert`

## Setup

After `npm install` at repo root, `prepare` runs `husky` and installs hooks.

```bash
npm install
# hooks live in .husky/
```

## Bypass (use sparingly)

```bash
SKIP_TESTS=1 git commit -m "chore: wip without tests"
git commit --no-verify -m "chore: emergency skip"   # skips all hooks
```

## Manual equivalents

```bash
npm run format:check   # prettier check
npm run format         # prettier write
npm run lint
npm run test:run
echo "feat: ok" | npx commitlint
make check             # format + lint + test (full tree)
```
