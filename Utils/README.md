# Utils 目录

此目录包含前后端共享的工具函数，可以在 Server 和 Client 中使用。

## 目录结构

```
Utils/
├── validation.js / validation.ts    # 验证工具（邮箱、密码、URL等）
├── stringUtils.js / stringUtils.ts  # 字符串工具（截取、格式化等）
├── dateUtils.js / dateUtils.ts      # 日期时间工具（格式化、相对时间等）
├── arrayUtils.js / arrayUtils.ts    # 数组工具（去重、分组、排序等）
├── objectUtils.js / objectUtils.ts  # 对象工具（克隆、合并、路径访问等）
├── index.js / index.ts               # 统一导出入口
└── README.md                         # 本文档
```

## 使用方式

### Server 端（JavaScript/ES Modules）

```javascript
// 导入单个函数
import { validateEmail, validatePassword } from '../../Utils/validation.js';

// 导入多个工具
import { validateEmail, sanitizeInput, formatDate } from '../../Utils/index.js';

// 使用
const isValid = validateEmail('user@example.com');
const cleaned = sanitizeInput(userInput);
const formatted = formatDate(new Date());
```

### Client 端（TypeScript/React）

```typescript
// 导入单个函数
import { validateEmail, validatePassword } from '../../Utils/validation';

// 导入多个工具
import { validateEmail, sanitizeInput, formatDate } from '../../Utils';

// 在组件中使用
const MyComponent: React.FC = () => {
  const isValid = validateEmail('user@example.com');
  const cleaned = sanitizeInput(userInput);
  const formatted = formatDate(new Date());
  
  return <div>...</div>;
};
```

## 工具函数列表

### validation.js / validation.ts

- `validateEmail(email)` - 验证邮箱格式
- `validatePassword(password)` - 验证密码强度
- `validateUrl(url)` - 验证 URL 格式
- `validatePhone(phone)` - 验证手机号格式（中国）
- `validateUsername(username)` - 验证用户名格式
- `sanitizeString(str)` - 清理字符串（移除 HTML 标签）
- `sanitizeInput(input)` - 递归清理输入数据

### stringUtils.js / stringUtils.ts

- `truncate(str, length, suffix)` - 截取字符串
- `capitalize(str)` - 首字母大写
- `toCamelCase(str)` - 驼峰命名转换
- `toSnakeCase(str)` - 下划线命名转换
- `randomString(length)` - 生成随机字符串
- `stripHtml(html)` - 移除 HTML 标签

### dateUtils.js / dateUtils.ts

- `formatDate(date, format)` - 格式化日期
- `formatRelativeTime(date)` - 格式化相对时间（如：1分钟前）
- `getTimestamp()` - 获取时间戳
- `isToday(date)` - 判断是否为今天

### arrayUtils.js / arrayUtils.ts

- `unique(arr)` - 数组去重
- `groupBy(arr, key)` - 数组分组
- `sortBy(arr, key, order)` - 数组排序
- `paginate(arr, page, pageSize)` - 数组分页
- `flatten(arr, depth)` - 数组扁平化

### objectUtils.js / objectUtils.ts

- `deepClone(obj)` - 深度克隆对象
- `deepMerge(target, ...sources)` - 深度合并对象
- `get(obj, path, defaultValue)` - 根据路径获取属性值
- `set(obj, path, value)` - 根据路径设置属性值
- `omitEmpty(obj)` - 移除对象中的空值

## 注意事项

1. **类型支持**：所有工具函数都提供了 JavaScript 和 TypeScript 两个版本
2. **向后兼容**：Server 端的 `Server/Utils/validation.js` 已更新为从公共 Utils 导入，保持向后兼容
3. **依赖关系**：这些工具函数不依赖任何外部库，可以在任何环境中使用
4. **特殊函数**：`validateObjectId` 仅在后端使用（依赖 mongoose），保留在 `Server/Utils/validation.js` 中

## 迁移指南

### 从 Server/Utils/validation.js 迁移

**之前**：
```javascript
import { validateEmail } from '../Utils/validation.js';
```

**现在**（两种方式都可以）：
```javascript
// 方式1：继续使用 Server/Utils/validation.js（已自动转发到公共 Utils）
import { validateEmail } from '../Utils/validation.js';

// 方式2：直接使用公共 Utils
import { validateEmail } from '../../Utils/validation.js';
```

### 在 Client 中使用

**之前**：需要在 Client 中重复实现验证逻辑

**现在**：
```typescript
import { validateEmail, validatePassword } from '../../Utils/validation';

// 在表单验证中使用
<Form.Item
  name="email"
  rules={[
    { required: true, message: t('auth.emailRequired') },
    {
      validator: (_, value) => {
        if (!value || validateEmail(value)) {
          return Promise.resolve();
        }
        return Promise.reject(new Error(t('auth.emailInvalid')));
      },
    },
  ]}
>
  <Input />
</Form.Item>
```

## 最佳实践

1. **优先使用公共 Utils**：新的工具函数应该放在 `Utils/` 目录下，而不是 `Server/Utils/` 或 `Client/Utils/`
2. **保持函数纯净**：工具函数应该是纯函数，不依赖外部状态
3. **提供类型定义**：所有函数都应该有 TypeScript 类型定义
4. **文档完善**：每个函数都应该有清晰的 JSDoc 注释

