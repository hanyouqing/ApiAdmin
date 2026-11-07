# Image publish (GHCR + Docker Hub)

Canonical image name: **`hanyouqing/apiadmin`**

| Registry   | Image                         |
| ---------- | ----------------------------- |
| GHCR       | `ghcr.io/hanyouqing/apiadmin` |
| Docker Hub | `hanyouqing/apiadmin`         |

## Automated publish

Workflow: [`.github/workflows/publish-images.yml`](../.github/workflows/publish-images.yml)

The Docker Hub account in `DOCKERHUB_USERNAME` must be the GitHub repository owner (`hanyouqing`). Image names are derived from that owner: `hanyouqing/apiadmin` and `ghcr.io/hanyouqing/apiadmin`.

| Trigger                           | What is published                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Pull request                      | `linux/amd64` build only. Nothing is pushed.                                                                     |
| Push `main`                       | `linux/amd64` + `linux/arm64` to GHCR and Docker Hub. Tags: `<branch>-<shortsha>-<timestamp>` and `latest`.      |
| Tag `v*` or `release-*` on `main` | Same images, plus the git tag and the semver (`v0.0.2` and `0.0.2`). The Helm chart is packaged onto `gh-pages`. |
| `workflow_dispatch`               | Optional extra tag. Toggles for Docker Hub and GHCR (both default on).                                           |

A tag that is not contained in `main` or `master` fails the workflow.

### Required GitHub configuration

**Secrets** (already present if Hub was configured):

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (Docker Hub Access Token, not account password)

**Variables** (optional metadata from Terragrunt + [terraform-github-modules](https://github.com/hanyouqing/terraform-github-modules); the workflow derives image names from the repository owner and does not read these):

- `IMAGE_NAME=apiadmin`
- `DOCKERHUB_NAMESPACE=hanyouqing`
- `GHCR_IMAGE=ghcr.io/hanyouqing/apiadmin`
- `DOCKERHUB_IMAGE=hanyouqing/apiadmin`

GHCR auth uses `GITHUB_TOKEN` with `packages: write`. Chart publishing uses `contents: write` to push `gh-pages`. No extra registry secret is required for GHCR.

After the first version tag, set GitHub Pages to the `gh-pages` branch (Settings → Pages). Then:

```bash
helm repo add apiadmin https://hanyouqing.github.io/ApiAdmin
helm repo update
helm install apiadmin apiadmin/apiadmin
```

## Pull examples

```bash
docker pull ghcr.io/hanyouqing/apiadmin:latest
docker pull hanyouqing/apiadmin:latest

docker run --rm -p 3000:3000 \
  -e JWT_SECRET='change-me-at-least-32-chars-long!!' \
  -e MONGODB_URL='...' \
  -e REDIS_URL='...' \
  ghcr.io/hanyouqing/apiadmin:latest
```

Helm default repository: `ghcr.io/hanyouqing/apiadmin` (see `Helm/apiadmin/values.yaml`). Docker Hub is an equivalent mirror.

## Terragrunt bootstrap (GitHub metadata)

Uses [terraform-github-modules](https://github.com/hanyouqing/terraform-github-modules). Layout:

```text
terragrunt/prod/github/apiadmin/{repository,actions}/
```

```bash
unset GITHUB_TOKEN GH_TOKEN
cd terragrunt
cp .env.sh.example .env.sh && chmod 600 .env.sh
# export GITHUB_TOKEN="$(gh auth token)"
source .env.sh
make -C .. tg-apply
```

Or:

```bash
infra tg -e prod -s github/apiadmin/repository plan
infra tg -e prod -s github/apiadmin/actions plan
```

Rotate Docker Hub credentials (optional):

```bash
export TF_VAR_dockerhub_username=hanyouqing
export TF_VAR_dockerhub_token='dckr_pat_...'
cd terragrunt/prod/github/apiadmin/actions && terragrunt apply
```

**Security**

- Never commit `.env.sh`, `backend.secrets.hcl`, `*.tfstate`, or Hub/GitHub tokens.
- S3 backend: env vars or gitignored `backend.secrets.hcl`.
- Empty `TF_BACKEND_BUCKET` → local `terragrunt/.local-state/`.

## Makefile helpers

```bash
make tg-init
make tg-plan
make tg-apply
```

## Manual release

```bash
git tag v0.0.2
git push origin v0.0.2
# or: Actions → Build and Push Docker Images → Run workflow
```

The tag workflow rewrites the packaged chart version and the `apiadmin-image-tag` markers before `chart-releaser` runs. It does not commit that bump back to `main`.
