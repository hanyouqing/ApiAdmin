# 超级管理员设置指南

## 概述

系统默认**没有**预设的超级管理员账号。新注册的用户默认角色为 `guest`，只有 `super_admin` 角色才能创建分组。

## 设置超级管理员的方法

### 方法 1：使用脚本（推荐）

使用项目提供的脚本将现有用户设置为超级管理员：

```bash
# 确保使用 Node.js 20+
cd /Users/youqing/github.com/hanyouqing/ApiAdmin

# 如果使用 nvm，切换到 Node.js 20
source ~/.nvm/nvm.sh && nvm use 20

# 方法 1a：将现有用户设置为超级管理员
node Server/scripts/create-super-admin.js --email your-email@example.com

# 方法 1b：自动将第一个注册的用户设置为超级管理员
node Server/scripts/create-super-admin.js --auto

# 方法 1c：创建新的超级管理员账号
node Server/scripts/create-super-admin.js --email admin@example.com --username admin --password YourPassword123

# 方法 1d：查看所有用户
node Server/scripts/create-super-admin.js --list

# 如果 MongoDB 需要认证，可以通过环境变量指定连接字符串：
MONGODB_URL="mongodb://admin:password@localhost:27017/apiadmin?authSource=admin" \
  node Server/scripts/create-super-admin.js --list
```

### 方法 2：通过 MongoDB 直接设置

如果脚本无法运行，可以直接通过 MongoDB 设置：

#### 步骤 1：连接到 MongoDB

```bash
# 使用 Docker Compose 的 MongoDB
mongosh -u admin -p change-me-in-production --authenticationDatabase admin

# 或使用本地 MongoDB（如果未启用认证）
mongosh
```

#### 步骤 2：切换到应用数据库

```javascript
use apiadmin
```

#### 步骤 3：查找用户

```javascript
// 查看所有用户
db.users.find({}, { email: 1, username: 1, role: 1 }).pretty()

// 查找特定用户
db.users.findOne({ email: "your-email@example.com" })
```

#### 步骤 4：更新用户角色为超级管理员

```javascript
// 将指定邮箱的用户设置为超级管理员
db.users.updateOne(
  { email: "aaa@aaa.com" },
  { $set: { role: "super_admin" } }
)

// 或者将第一个用户设置为超级管理员
db.users.updateOne(
  {},
  { $set: { role: "super_admin" } },
  { sort: { createdAt: 1 } }
)

// 验证更新
db.users.findOne({ role: "super_admin" })
```

### 方法 3：通过 API 设置（需要先有超级管理员）

如果您已经有超级管理员账号，可以通过 API 更新其他用户的角色（需要实现相应的 API 端点）。

## 验证超级管理员设置

设置完成后，可以通过以下方式验证：

### 1. 查看用户信息

登录后，在用户信息中查看 `role` 字段，应该显示为 `super_admin`。

### 2. 测试创建分组

尝试创建分组，如果不再提示"只有超级管理员可以创建分组"，说明设置成功。

### 3. 通过脚本查看

```bash
node Server/scripts/create-super-admin.js --list
```

## 常见问题

### Q: 为什么注册后不能创建分组？

A: 新注册的用户默认角色是 `guest`，只有 `super_admin` 角色才能创建分组。请按照上述方法将您的账号设置为超级管理员。

### Q: 如何知道我的账号是否是超级管理员？

A: 登录后，在用户信息中查看 `role` 字段。如果是 `super_admin`，说明是超级管理员。

### Q: 可以设置多个超级管理员吗？

A: 可以。系统允许多个用户拥有 `super_admin` 角色。

### Q: 忘记超级管理员密码怎么办？

A: 可以通过 MongoDB 重置密码，或者创建新的超级管理员账号。

## 安全建议

1. **限制超级管理员数量**：只将必要的用户设置为超级管理员
2. **使用强密码**：超级管理员账号应使用强密码
3. **定期审查**：定期检查超级管理员列表，移除不再需要的超级管理员权限

## 快速设置（首次使用）

如果您是首次使用系统，建议按以下步骤操作：

1. **注册账号**：在前端注册一个账号
2. **设置为超级管理员**：运行以下命令将您的账号设置为超级管理员

```bash
# 替换为您的注册邮箱
node Server/scripts/create-super-admin.js --email your-registered-email@example.com
```

3. **重新登录**：退出并重新登录，验证超级管理员权限
4. **创建分组**：尝试创建分组，确认权限正常

