# MongoDB 初始化指南

## 概述

MongoDB 需要初始化才能正常使用，包括：
1. 创建数据库
2. 创建用户
3. 设置用户权限

## 初始化方式

### 方式 1：使用 Docker Compose（推荐）

如果使用 `docker-compose.yaml`，MongoDB 会自动初始化：

```bash
# 设置环境变量
export MONGO_USERNAME=admin
export MONGO_PASSWORD=your-secure-password

# 启动服务
docker-compose up -d mongodb
```

**Docker Compose 会自动：**
- 创建 root 用户（`MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`）
- 创建初始数据库（`MONGO_INITDB_DATABASE=apiadmin`）

**注意：** 这些环境变量只在**首次启动**容器时生效。如果容器已经存在，需要删除数据卷重新创建：

```bash
# 停止并删除容器和数据卷
docker-compose down -v

# 重新启动（会重新初始化）
docker-compose up -d mongodb
```

### 方式 2：使用初始化脚本（推荐本地开发）

项目提供了自动化初始化脚本：

```bash
# 运行初始化脚本
./scripts/init-mongodb.sh

# 或指定参数
MONGO_HOST=localhost \
MONGO_PORT=27017 \
MONGO_ROOT_USERNAME=admin \
MONGO_ROOT_PASSWORD=your-password \
MONGO_DATABASE=apiadmin \
MONGO_USERNAME=apiadmin \
MONGO_PASSWORD=your-password \
./Scripts/init-mongodb.sh
```

脚本会自动：
1. 测试 MongoDB 连接
2. 创建 root 用户（如果不存在）
3. 创建应用数据库
4. 创建应用数据库用户
5. 设置用户权限

### 方式 3：手动初始化

#### 步骤 1：连接到 MongoDB

```bash
# 如果 MongoDB 未启用认证
mongosh

# 如果 MongoDB 已启用认证
mongosh -u admin -p your-password --authenticationDatabase admin
```

#### 步骤 2：创建 root 用户（如果还没有）

```javascript
// 切换到 admin 数据库
use admin

// 创建 root 用户
db.createUser({
  user: "admin",
  pwd: "your-secure-password",
  roles: [{ role: "root", db: "admin" }]
})
```

#### 步骤 3：创建应用数据库和用户

```javascript
// 切换到应用数据库（如果不存在会自动创建）
use apiadmin

// 创建应用数据库用户
db.createUser({
  user: "apiadmin",
  pwd: "your-secure-password",
  roles: [
    { role: "readWrite", db: "apiadmin" }
  ]
})
```

#### 步骤 4：验证

```javascript
// 查看所有用户
db.getUsers()

// 查看当前数据库
db.getName()

// 测试连接
db.runCommand({ ping: 1 })
```

## 配置应用连接

初始化完成后，在 `.env` 或 `.env.local` 文件中配置连接字符串：

```env
# 使用 root 用户（不推荐生产环境）
MONGODB_URL=mongodb://admin:your-password@localhost:27017/apiadmin?authSource=admin

# 使用应用数据库用户（推荐）
MONGODB_URL=mongodb://apiadmin:your-password@localhost:27017/apiadmin?authSource=admin
```

**连接字符串格式：**
```
mongodb://[username]:[password]@[host]:[port]/[database]?authSource=[authDatabase]
```

**参数说明：**
- `username`: MongoDB 用户名
- `password`: MongoDB 密码
- `host`: MongoDB 主机地址（本地为 `localhost`）
- `port`: MongoDB 端口（默认 `27017`）
- `database`: 数据库名称（`apiadmin`）
- `authSource`: 认证数据库（通常是 `admin`）

## 常见场景

### 场景 1：本地开发（无认证）

如果本地 MongoDB 未启用认证：

```env
MONGODB_URL=mongodb://localhost:27017/apiadmin
```

**初始化：**
- 数据库会在首次写入时自动创建
- 不需要创建用户

### 场景 2：Docker 环境（有认证）

使用 Docker Compose：

```bash
# 1. 设置环境变量
export MONGO_USERNAME=admin
export MONGO_PASSWORD=secure-password

# 2. 启动 MongoDB
docker-compose up -d mongodb

# 3. 配置应用
# MONGODB_URL=mongodb://admin:secure-password@localhost:27017/apiadmin?authSource=admin
```

### 场景 3：生产环境（有认证）

**推荐配置：**
1. 使用专用的应用数据库用户（不是 root 用户）
2. 只授予必要的权限（`readWrite`）
3. 使用强密码

```bash
# 1. 连接到 MongoDB
mongosh -u admin -p root-password --authenticationDatabase admin

# 2. 创建应用数据库用户
use apiadmin
db.createUser({
  user: "apiadmin",
  pwd: "strong-random-password",
  roles: [{ role: "readWrite", db: "apiadmin" }]
})

# 3. 配置应用
# MONGODB_URL=mongodb://apiadmin:strong-random-password@mongodb-host:27017/apiadmin?authSource=admin
```

## 验证初始化

### 方法 1：使用 mongosh

```bash
# 使用应用用户连接
mongosh -u apiadmin -p your-password --authenticationDatabase admin apiadmin

# 测试查询
db.runCommand({ ping: 1 })
db.getUsers()
```

### 方法 2：使用应用健康检查

启动应用后，访问健康检查端点：

```bash
curl http://localhost:3000/api/health
```

应该返回：
```json
{
  "status": "ok",
  "dependencies": {
    "mongodb": {
      "status": "ready",
      "message": "MongoDB connection is ready"
    }
  }
}
```

## 故障排查

### 问题 1：认证失败

**错误信息：**
```
command find requires authentication
code: 13
codeName: "Unauthorized"
```

**解决方案：**
1. 检查用户名和密码是否正确
2. 检查 `authSource` 参数是否正确（通常是 `admin`）
3. 确认用户已创建并有正确的权限

### 问题 2：用户不存在

**错误信息：**
```
Authentication failed
```

**解决方案：**
1. 确认用户已创建：`db.getUsers()`
2. 重新创建用户（如果不存在）

### 问题 3：权限不足

**错误信息：**
```
not authorized on apiadmin to execute command
```

**解决方案：**
1. 确认用户有 `readWrite` 权限
2. 重新授予权限：
   ```javascript
   use apiadmin
   db.grantRolesToUser("apiadmin", [{ role: "readWrite", db: "apiadmin" }])
   ```

### 问题 4：Docker Compose 初始化不生效

**原因：** 环境变量只在首次启动时生效

**解决方案：**
```bash
# 删除容器和数据卷
docker-compose down -v

# 重新启动
docker-compose up -d mongodb
```

## 安全建议

1. **使用强密码**：至少 16 个字符，包含大小写字母、数字和特殊字符
2. **使用专用用户**：不要在生产环境使用 root 用户
3. **最小权限原则**：只授予应用需要的权限（`readWrite`）
4. **启用认证**：生产环境必须启用 MongoDB 认证
5. **网络安全**：限制 MongoDB 的访问来源（防火墙、VPN）

## 相关文档

- [MongoDB 认证问题修复指南](../MONGODB_AUTH_FIX.md)
- [环境变量配置指南](../ENV_SETUP.md)
- [Docker 部署指南](../DEPLOYMENT.md)

