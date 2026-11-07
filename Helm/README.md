# ApiAdmin on Kubernetes

The chart in `apiadmin/` installs the API, the web UI, and optional MongoDB and Redis.

```bash
helm install apiadmin ./Helm/apiadmin --namespace apiadmin --create-namespace
```

Production installs start from `apiadmin/values-examples.yaml`. See `apiadmin/README.md`.

Version tags on `main` publish this chart to the `gh-pages` branch:

```bash
helm repo add apiadmin https://hanyouqing.github.io/ApiAdmin
helm repo update
helm install apiadmin apiadmin/apiadmin
```

Register that URL in Artifact Hub after the first release. Put the repository ID it shows into `artifacthub-repo.yml`.
