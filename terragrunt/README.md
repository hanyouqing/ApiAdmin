# Terragrunt — GitHub metadata for ApiAdmin

## Layout

```text
terragrunt/
  root.hcl                 # remote_state + provider + run_tflint before_hook
  tflint.hcl               # canonical TFLint rules (NOT .tflint.hcl — TG auto-hooks that name)
  _envcommon/{modules,repository,actions}.hcl
  prod/env.hcl
  prod/github/account.hcl
  prod/github/apiadmin/{repository,actions}/
```

| Path segment              | Role                            |
| ------------------------- | ------------------------------- |
| `prod`                    | env tier (`-e prod`)            |
| `github`                  | logical account (`account.hcl`) |
| `apiadmin`                | product / repo slug             |
| `repository` \| `actions` | unit                            |

`prod` maps to module `environment = "production"`. GitHub Actions Environment name stays `production` (publish gate).

## Best practices

- **remote_state** — single block in `root.hcl` (S3 when `backend.secrets.hcl` / `TF_BACKEND_BUCKET` is set; otherwise local under `.local-state/`).
- **dependencies** — `actions` declares `dependencies { paths = ["../repository"] }` for apply order only (no `dependency` outputs — repo identity comes from path locals).
- **tflint** — canonical `terragrunt/tflint.hcl` via `before_hook "run_tflint"`. Never use `.tflint.hcl` under this tree (Terragrunt auto-runs a `tflint` hook that injects undeclared `--var`s). Unit tip markers use `.tflint.json` instead.

## Commands

```bash
# Make
make tg-lint
make tg-plan
make tg-apply

# infra tg (account/region/stack: github / apiadmin / <unit>)
infra tg -e prod -s github/apiadmin/repository plan
infra tg -e prod -s github/apiadmin/actions plan
# or whole project (dependency order):
infra tg -e prod -s github/apiadmin plan

# Raw terragrunt
cd terragrunt/prod/github/apiadmin && terragrunt run --all -- plan
```

Identity: clone `~/github.com/<owner>/<Repo>` → `github_owner` / `github_repo`; project from path `apiadmin`.

## Bootstrap

```bash
cd terragrunt
cp .env.sh.example .env.sh && chmod 600 .env.sh
# export GITHUB_TOKEN="$(gh auth token)"
# optional: export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
source .env.sh
make -C .. tg-apply
```

### S3 backend (optional)

```bash
cp backend.secrets.hcl.example backend.secrets.hcl
```

Import templates: `prod/github/apiadmin/*/imports.tftpl`.

Local module debug: comment switch in `_envcommon/repository.hcl` / `actions.hcl` → `modules_local`.

See [Docs/PUBLISH.md](../Docs/PUBLISH.md).
