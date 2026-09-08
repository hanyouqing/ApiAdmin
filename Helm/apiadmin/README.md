# ApiAdmin Helm Chart

This Helm chart deploys ApiAdmin API Management Platform on a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.0+
- MongoDB (can be deployed with this chart or use external)
- Redis (can be deployed with this chart or use external)

## Installation

### Prerequisites secrets (required)

Before install, prepare strong values:

```bash
export JWT_SECRET="$(openssl rand -base64 48)"
export MONGO_PASSWORD="$(openssl rand -base64 24)"
export REDIS_PASSWORD="$(openssl rand -base64 24)"
```

### Quick Start

```bash
helm install apiadmin ./Helm/apiadmin \
  --namespace apiadmin \
  --create-namespace \
  --set config.jwtSecret="$JWT_SECRET" \
  --set mongodb.auth.rootPassword="$MONGO_PASSWORD" \
  --set redis.auth.password="$REDIS_PASSWORD" \
  --set env.CORS_ORIGIN=https://apiadmin.example.com \
  --set image.tag=0.0.1
```

Chart validation will fail if `jwtSecret` / Mongo / Redis passwords are empty, or if `CORS_ORIGIN` is `*`.

### Custom Installation

```bash
helm install apiadmin ./Helm/apiadmin \
  --namespace apiadmin \
  --create-namespace \
  --set mongodb.auth.rootPassword=your-password \
  --set redis.auth.password=your-redis-password \
  --set config.jwtSecret="$(openssl rand -base64 48)" \
  --set env.CORS_ORIGIN=https://apiadmin.yourdomain.com \
  --set ingress.hosts[0].host=apiadmin.yourdomain.com
```

### Using values.yaml

```bash
# Edit values.yaml with your configuration
# Then install
helm install apiadmin ./helm/apiadmin \
  --namespace apiadmin \
  --create-namespace \
  -f values.yaml
```

## Configuration

The following table lists the configurable parameters and their default values:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Image repository | `apiadmin/apiadmin` |
| `image.tag` | Image tag | `latest` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `3000` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.className` | Ingress class name | `nginx` |
| `ingress.hosts` | Ingress hosts | `apiadmin.example.com` |
| `resources.limits.cpu` | CPU limit | `1000m` |
| `resources.limits.memory` | Memory limit | `2Gi` |
| `resources.requests.cpu` | CPU request | `500m` |
| `resources.requests.memory` | Memory request | `1Gi` |
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Min replicas | `2` |
| `autoscaling.maxReplicas` | Max replicas | `10` |
| `mongodb.enabled` | Deploy MongoDB | `true` |
| `mongodb.auth.rootPassword` | MongoDB root password | `change-me` |
| `redis.enabled` | Deploy Redis | `true` |
| `redis.auth.password` | Redis password | `change-me` |
| `persistence.enabled` | Enable PVC | `true` |
| `persistence.size` | PVC size | `10Gi` |

## Upgrading

```bash
# Upgrade the release
helm upgrade apiadmin ./helm/apiadmin \
  --namespace apiadmin \
  --set image.tag=v1.1.0
```

## Uninstallation

```bash
# Uninstall the release
helm uninstall apiadmin -n apiadmin
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n apiadmin
```

### View Logs

```bash
kubectl logs -f deployment/apiadmin -n apiadmin
```

### Check Service

```bash
kubectl get svc -n apiadmin
```

### Check Ingress

```bash
kubectl get ingress -n apiadmin
```

## Support

For issues and questions, please visit:
- GitHub: https://github.com/hanyouqing/ApiAdmin
- Documentation: https://docs.apiadmin.com



