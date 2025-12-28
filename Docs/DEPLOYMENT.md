# ApiAdmin - 部署文档

本文档详细说明 ApiAdmin 的各种部署方式。

## 目录

1. [Docker 部署](#1-docker-部署)
2. [Docker Compose 部署](#2-docker-compose-部署)
3. [Kubernetes 部署](#3-kubernetes-部署)
4. [环境变量配置](#4-环境变量配置)
5. [健康检查](#5-健康检查)
6. [故障排查](#6-故障排查)

## 1. Docker 部署

### 1.1 构建镜像

```bash
# 构建 Docker 镜像
docker build -t apiadmin:latest .

# 查看镜像
docker images | grep apiadmin
```

### 1.2 运行容器

```bash
# 运行容器（需要外部 MongoDB 和 Redis）
docker run -d \
  --name apiadmin \
  -p 3000:3000 \
  -e MONGODB_URL=mongodb://your-mongodb-host:27017/apiadmin \
  -e REDIS_URL=redis://your-redis-host:6379 \
  -e JWT_SECRET=your-secret-key \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/uploads:/app/uploads \
  apiadmin:latest
```

### 1.3 查看日志

```bash
# 查看容器日志
docker logs -f apiadmin

# 查看最近 100 行日志
docker logs --tail 100 apiadmin
```

## 2. Docker Compose 部署

### 2.1 快速开始

```bash
# 1. 复制环境变量文件
cp .env.example .env

# 2. 编辑 .env 文件，配置必要的环境变量
# 至少需要配置：
# - JWT_SECRET
# - MONGO_PASSWORD
# - REDIS_PASSWORD

# 3. 启动所有服务
docker-compose up -d

# 4. 查看服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f apiadmin
```

### 2.2 服务说明

- **apiadmin**: 主应用服务
- **mongodb**: MongoDB 数据库
- **redis**: Redis 缓存
- **nginx**: Nginx 反向代理（可选）

### 2.3 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v

# 查看日志
docker-compose logs -f [service-name]

# 重启服务
docker-compose restart [service-name]

# 更新服务
docker-compose pull
docker-compose up -d

# 进入容器
docker-compose exec apiadmin sh
```

### 2.4 数据持久化

Docker Compose 使用命名卷来持久化数据：

- `mongodb-data`: MongoDB 数据
- `redis-data`: Redis 数据

数据卷位置可以通过 `docker volume inspect` 查看。

### 2.5 备份和恢复

```bash
# 备份 MongoDB
docker-compose exec mongodb mongodump --out /data/backup

# 恢复 MongoDB
docker-compose exec mongodb mongorestore /data/backup
```

## 3. Kubernetes 部署

### 3.1 前置要求

- Kubernetes 1.19+
- Helm 3.0+
- kubectl 配置正确

### 3.2 使用 Helm 部署

#### 3.2.1 基本部署

```bash
# 1. 创建命名空间
kubectl create namespace apiadmin

# 2. 安装 Chart
helm install apiadmin ./helm/apiadmin \
  --namespace apiadmin \
  --set mongodb.auth.rootPassword=your-mongodb-password \
  --set redis.auth.password=your-redis-password \
  --set config.jwtSecret=your-jwt-secret
```

#### 3.2.2 自定义配置部署

```bash
# 使用自定义 values 文件
helm install apiadmin ./helm/apiadmin \
  --namespace apiadmin \
  -f my-values.yaml
```

#### 3.2.3 使用外部数据库

如果使用外部 MongoDB 和 Redis：

```yaml
# external-db-values.yaml
mongodb:
  enabled: false

redis:
  enabled: false

env:
  MONGODB_URL: mongodb://external-mongodb:27017/apiadmin
  REDIS_URL: redis://external-redis:6379
```

```bash
helm install apiadmin ./helm/apiadmin \
  --namespace apiadmin \
  -f external-db-values.yaml
```

### 3.3 查看部署状态

```bash
# 查看 Pod 状态
kubectl get pods -n apiadmin

# 查看 Service
kubectl get svc -n apiadmin

# 查看 Ingress
kubectl get ingress -n apiadmin

# 查看 Deployment
kubectl get deployment -n apiadmin
```

### 3.4 查看日志

```bash
# 查看 Pod 日志
kubectl logs -f deployment/apiadmin -n apiadmin

# 查看所有 Pod 日志
kubectl logs -f -l app.kubernetes.io/name=apiadmin -n apiadmin
```

### 3.5 升级部署

```bash
# 升级到新版本
helm upgrade apiadmin ./helm/apiadmin \
  --namespace apiadmin \
  --set image.tag=v1.1.0

# 回滚到上一版本
helm rollback apiadmin -n apiadmin
```

### 3.6 卸载部署

```bash
# 卸载 Chart
helm uninstall apiadmin -n apiadmin

# 删除命名空间（可选）
kubectl delete namespace apiadmin
```

### 3.7 高可用配置

#### 3.7.1 多副本部署

```yaml
# values.yaml
replicaCount: 3

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

#### 3.7.2 使用外部数据库

对于生产环境，建议使用云数据库服务：

- **MongoDB Atlas**: 托管 MongoDB 服务
- **AWS DocumentDB**: AWS 托管的 MongoDB 兼容服务
- **Redis Cloud**: 托管 Redis 服务
- **AWS ElastiCache**: AWS 托管的 Redis 服务

### 3.8 Ingress 配置

#### 3.8.1 使用 Nginx Ingress

```yaml
# values.yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: apiadmin.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: apiadmin-tls
      hosts:
        - apiadmin.example.com
```

#### 3.8.2 使用 Traefik

```yaml
ingress:
  enabled: true
  className: "traefik"
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/router.tls.certresolver: letsencrypt
```

## 4. 环境变量配置

### 4.1 必需环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `MONGODB_URL` | MongoDB 连接字符串 | `mongodb://localhost:27017/apiadmin` |
| `REDIS_URL` | Redis 连接字符串 | `redis://localhost:6379` |
| `JWT_SECRET` | JWT 密钥 | `your-secret-key` |

### 4.2 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 服务端口 | `3000` |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |
| `UPLOAD_MAX_SIZE` | 上传文件最大大小（字节） | `10485760` |
| `LOG_LEVEL` | 日志级别 | `info` |

### 4.3 邮件服务配置

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_SECURE=false
```

## 5. 健康检查

### 5.1 HTTP 健康检查端点

```bash
# 健康检查
curl http://localhost:3000/api/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2025-01-27T10:00:00.000Z"
}
```

### 5.2 Docker 健康检查

Dockerfile 中已配置健康检查，容器会自动执行。

### 5.3 Kubernetes 健康检查

Kubernetes Deployment 中配置了：

- **Liveness Probe**: 检测容器是否存活
- **Readiness Probe**: 检测容器是否就绪

## 6. 故障排查

### 6.1 常见问题

#### 问题 1: 容器无法启动

**检查项**:
- 查看容器日志: `docker logs apiadmin`
- 检查环境变量是否正确
- 检查端口是否被占用
- 检查 MongoDB 和 Redis 连接

#### 问题 2: 数据库连接失败

**检查项**:
- 验证 MongoDB/Redis 服务是否运行
- 检查连接字符串格式
- 检查网络连接
- 验证认证信息

#### 问题 3: Pod 一直处于 Pending 状态

**检查项**:
```bash
# 查看 Pod 详情
kubectl describe pod <pod-name> -n apiadmin

# 检查节点资源
kubectl top nodes

# 检查 PVC 状态
kubectl get pvc -n apiadmin
```

#### 问题 4: Ingress 无法访问

**检查项**:
```bash
# 检查 Ingress 状态
kubectl get ingress -n apiadmin

# 检查 Ingress Controller
kubectl get pods -n ingress-nginx

# 查看 Ingress 事件
kubectl describe ingress apiadmin -n apiadmin
```

### 6.2 日志查看

#### Docker

```bash
# 实时日志
docker logs -f apiadmin

# 最近 100 行
docker logs --tail 100 apiadmin

# 带时间戳
docker logs -f -t apiadmin
```

#### Kubernetes

```bash
# 查看 Pod 日志
kubectl logs -f <pod-name> -n apiadmin

# 查看所有相关 Pod 日志
kubectl logs -f -l app.kubernetes.io/name=apiadmin -n apiadmin

# 查看前一个容器的日志（如果容器重启）
kubectl logs <pod-name> -n apiadmin --previous
```

### 6.3 性能调优

#### Docker

```bash
# 限制资源使用
docker run -d \
  --name apiadmin \
  --memory="2g" \
  --cpus="1.0" \
  apiadmin:latest
```

#### Kubernetes

```yaml
resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi
```

### 6.4 监控

#### Prometheus 指标

应用暴露 Prometheus 指标端点: `/metrics`

#### 集成 Grafana

可以使用 Grafana 可视化监控指标。

## 7. 安全建议

1. **生产环境必须修改**:
   - JWT_SECRET
   - MongoDB 密码
   - Redis 密码
   - 所有默认密钥

2. **使用 HTTPS**:
   - 配置 SSL/TLS 证书
   - 启用 Ingress TLS

3. **网络安全**:
   - 使用网络策略限制访问
   - 数据库不对外暴露

4. **资源限制**:
   - 设置合理的资源限制
   - 启用自动扩缩容

5. **备份策略**:
   - 定期备份数据库
   - 测试恢复流程

---

**文档版本**: v0.0.1
**最后更新**: 2025-01-27

