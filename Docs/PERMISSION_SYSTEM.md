# 权限管理系统文档

## 概述

ApiAdmin 实现了细粒度的权限管理系统，支持：
- 全局角色权限（系统级别）
- 项目成员权限（项目级别）
- 分组成员权限（分组级别）

## 权限模型

### 1. 全局角色（RolePermission）

系统定义了 5 种全局角色：

- **super_admin** - 超级管理员：拥有所有系统权限
- **group_leader** - 分组负责人：可以管理自己分组内的项目和成员
- **project_leader** - 项目负责人：可以管理自己负责的项目
- **developer** - 开发者：可以查看和编辑自己参与的项目
- **guest** - 访客：只能查看公开内容

每个角色都有对应的系统级权限，包括：
- `manage_users` - 管理用户
- `manage_system` - 系统管理
- `view_all_groups` - 查看所有分组
- `manage_all_groups` - 管理所有分组
- `view_all_projects` - 查看所有项目
- `manage_all_projects` - 管理所有项目
- `manage_sso` - SSO 管理
- `manage_whitelist` - 白名单管理
- `manage_email` - 邮件管理
- `manage_plugins` - 插件管理
- `view_monitor` - 查看监控
- `view_logs` - 查看日志
- `manage_cicd` - CI/CD 管理

### 2. 项目成员权限（ProjectMember）

项目成员有 4 种角色：

- **owner** - 项目所有者：拥有项目所有权限
- **admin** - 项目管理员：可以管理项目，但不能删除项目
- **developer** - 开发者：可以添加和编辑接口，但不能删除
- **viewer** - 查看者：只能查看，不能编辑

项目级权限包括：

**项目级别：**
- `view_project` - 查看项目
- `edit_project` - 编辑项目
- `delete_project` - 删除项目
- `manage_members` - 管理成员

**接口级别：**
- `view_interface` - 查看接口
- `add_interface` - 添加接口
- `edit_interface` - 编辑接口
- `delete_interface` - 删除接口

**Mock 级别：**
- `view_mock` - 查看 Mock
- `manage_mock` - 管理 Mock

**测试级别：**
- `view_test` - 查看测试
- `run_test` - 执行测试
- `manage_test` - 管理测试

**数据级别：**
- `import_data` - 导入数据
- `export_data` - 导出数据

### 3. 分组成员权限（GroupMember）

分组成员有 3 种角色：

- **owner** - 分组所有者：拥有分组所有权限
- **admin** - 分组管理员：可以管理分组，但不能删除
- **member** - 成员：只能查看

分组级权限包括：
- `view_group` - 查看分组
- `edit_group` - 编辑分组
- `delete_group` - 删除分组
- `manage_members` - 管理成员
- `create_project` - 创建项目
- `view_all_projects` - 查看所有项目
- `manage_all_projects` - 管理所有项目

## API 端点

### 项目成员权限管理

#### 获取项目成员列表
```
GET /api/projects/:project_id/members
```

#### 添加项目成员
```
POST /api/projects/:project_id/members
Body: {
  "user_id": "user_id",
  "role": "developer",  // owner, admin, developer, viewer
  "permissions": {}  // 可选，自定义权限
}
```

#### 批量添加项目成员
```
POST /api/projects/:project_id/members/batch
Body: {
  "members": [
    {
      "user_id": "user_id_1",
      "role": "developer"
    },
    {
      "user_id": "user_id_2",
      "role": "viewer"
    }
  ]
}
```

#### 更新项目成员权限
```
PUT /api/projects/:project_id/members/:user_id
Body: {
  "role": "admin",
  "permissions": {
    "edit_interface": true,
    "delete_interface": false
  }
}
```

#### 移除项目成员
```
DELETE /api/projects/:project_id/members/:user_id
```

#### 获取用户的项目权限
```
GET /api/projects/:project_id/permission
```

### 分组成员权限管理

#### 获取分组成员列表
```
GET /api/groups/:group_id/members
```

#### 添加分组成员
```
POST /api/groups/:group_id/members
Body: {
  "user_id": "user_id",
  "role": "member",  // owner, admin, member
  "permissions": {}  // 可选
}
```

#### 更新分组成员权限
```
PUT /api/groups/:group_id/members/:user_id
Body: {
  "role": "admin",
  "permissions": {}
}
```

#### 移除分组成员
```
DELETE /api/groups/:group_id/members/:user_id
```

### 角色权限管理

#### 获取所有角色权限
```
GET /api/roles/permissions
```

#### 获取特定角色权限
```
GET /api/roles/:role/permissions
```

#### 更新角色权限（仅超级管理员）
```
PUT /api/roles/:role/permissions
Body: {
  "permissions": {
    "manage_users": true,
    "view_monitor": true
  },
  "description": "角色描述"
}
```

#### 初始化默认角色权限
```
POST /api/roles/permissions/init
```

## 使用示例

### 1. 为项目添加成员

```javascript
// 添加开发者
POST /api/projects/507f1f77bcf86cd799439011/members
{
  "user_id": "507f191e810c19729de860ea",
  "role": "developer"
}

// 添加查看者
POST /api/projects/507f1f77bcf86cd799439011/members
{
  "user_id": "507f191e810c19729de860eb",
  "role": "viewer"
}
```

### 2. 自定义项目成员权限

```javascript
// 给开发者添加删除接口的权限
PUT /api/projects/507f1f77bcf86cd799439011/members/507f191e810c19729de860ea
{
  "role": "developer",
  "permissions": {
    "delete_interface": true,
    "manage_mock": true
  }
}
```

### 3. 批量添加项目成员

```javascript
POST /api/projects/507f1f77bcf86cd799439011/members/batch
{
  "members": [
    {
      "user_id": "507f191e810c19729de860ea",
      "role": "developer"
    },
    {
      "user_id": "507f191e810c19729de860eb",
      "role": "viewer"
    },
    {
      "user_id": "507f191e810c19729de860ec",
      "role": "admin"
    }
  ]
}
```

### 4. 检查用户权限

```javascript
// 获取当前用户在项目中的权限
GET /api/projects/507f1f77bcf86cd799439011/permission

// 返回示例
{
  "success": true,
  "data": {
    "isOwner": false,
    "isSuperAdmin": false,
    "role": "developer",
    "permissions": {
      "view_project": true,
      "edit_project": false,
      "view_interface": true,
      "add_interface": true,
      "edit_interface": true,
      "delete_interface": false,
      // ...
    },
    "hasFullAccess": false
  }
}
```

## 权限检查中间件

### 项目权限检查

```javascript
import { checkProjectPermission } from '../Middleware/projectPermission.js';

// 检查是否有访问项目的权限
router.get('/api/projects/:project_id/interfaces', 
  authMiddleware, 
  checkProjectPermission(),  // 只要有成员身份即可
  InterfaceController.list
);

// 检查是否有编辑接口的权限
router.post('/api/projects/:project_id/interfaces',
  authMiddleware,
  checkProjectPermission('add_interface'),  // 需要 add_interface 权限
  InterfaceController.add
);

// 检查是否有管理成员的权限
router.post('/api/projects/:project_id/members',
  authMiddleware,
  checkProjectPermission('manage_members'),  // 需要 manage_members 权限
  PermissionController.addProjectMember
);
```

### 分组权限检查

```javascript
import { checkGroupPermission } from '../Middleware/projectPermission.js';

// 检查是否有管理分组成员的权限
router.post('/api/groups/:group_id/members',
  authMiddleware,
  checkGroupPermission('manage_members'),
  PermissionController.addGroupMember
);
```

## 权限继承规则

1. **超级管理员**：拥有所有权限，不受项目/分组权限限制
2. **项目所有者**：拥有项目的所有权限
3. **分组所有者**：拥有分组的所有权限
4. **角色权限**：全局角色权限 + 项目/分组成员权限 = 最终权限

## 向后兼容

系统保持向后兼容：
- 如果项目成员表中没有记录，会检查项目的 `member` 字段
- 如果分组成员表中没有记录，会检查分组的 `member` 字段
- 旧系统的成员可以正常访问，但无法使用细粒度权限控制

## 最佳实践

1. **项目创建时**：自动将创建者添加为 `owner` 角色
2. **分组创建时**：自动将创建者添加为 `owner` 角色
3. **权限最小化原则**：默认给用户最少的权限，需要时再添加
4. **定期审查**：定期检查项目成员列表，移除不再需要的成员
5. **使用批量操作**：添加多个成员时使用批量接口，提高效率

## 注意事项

1. 不能修改项目/分组所有者的角色
2. 不能移除项目/分组所有者
3. 超级管理员不受项目/分组权限限制
4. 权限检查会先检查成员权限，再检查全局角色
5. 自定义权限会覆盖角色默认权限

