# Internationalization (i18n) Guide

## Overview

This project uses `i18next` and `react-i18next` for internationalization. All user-facing text must be internationalized - **no hardcoded strings are allowed**.

## Default Language

- **Default**: English (en-US)
- **Supported**: English (en-US), Chinese (zh-CN)

## File Structure

```
Client/i18n/
├── config.ts           # i18n configuration
├── locales/
│   ├── en.json        # English translations
│   └── zh-CN.json     # Chinese translations
└── README.md          # This file
```

## Usage in Components

### Basic Usage

```typescript
import { useTranslation } from 'react-i18next';

const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('app.title')}</h1>
      <Button>{t('common.save')}</Button>
    </div>
  );
};
```

### Form Validation

```typescript
import { useTranslation } from 'react-i18next';

const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Form>
      <Form.Item
        name="email"
        rules={[
          { required: true, message: t('auth.emailRequired') },
          { type: 'email', message: t('auth.emailInvalid') },
        ]}
      >
        <Input placeholder={t('auth.email')} />
      </Form.Item>
    </Form>
  );
};
```

### Messages and Notifications

```typescript
import { message } from 'antd';
import { useTranslation } from 'react-i18next';

const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  
  const handleSuccess = () => {
    message.success(t('message.operationSuccess'));
  };
  
  const handleError = () => {
    message.error(t('message.operationFailed'));
  };
};
```

### Interpolation (Dynamic Values)

```typescript
const { t } = useTranslation();

// In translation file: "minLength": "Minimum length is {{min}} characters"
t('validation.minLength', { min: 6 })
// Output: "Minimum length is 6 characters"
```

## Adding New Translations

1. **Add keys to both language files** (`en.json` and `zh-CN.json`)
2. **Use namespace structure**: `category.key` (e.g., `auth.login`, `group.title`)
3. **Keep keys descriptive**: Use clear, meaningful key names
4. **Group related keys**: Keep related translations in the same namespace

### Example

```json
// en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "Feature description",
    "button": "Submit"
  }
}

// zh-CN.json
{
  "myFeature": {
    "title": "我的功能",
    "description": "功能描述",
    "button": "提交"
  }
}
```

## Language Switching

Users can switch languages using the language switcher in the Header component. The selected language is:
- Saved to `localStorage`
- Stored in Redux (`ui.locale`)
- Applied to both app content and Ant Design components

## Best Practices

1. **Never hardcode text**: Always use `t()` function
2. **Use meaningful keys**: `auth.login` is better than `login1`
3. **Group related translations**: Use namespaces for organization
4. **Keep translations complete**: Ensure all keys exist in all language files
5. **Test both languages**: Verify UI works correctly in both languages
6. **Use interpolation for dynamic content**: Don't concatenate strings

## Common Translation Keys

- `common.*`: Common UI elements (save, cancel, delete, etc.)
- `auth.*`: Authentication related (login, register, etc.)
- `group.*`: Group management
- `project.*`: Project management
- `home.*`: Home page
- `user.*`: User profile and settings
- `message.*`: Success/error messages
- `validation.*`: Form validation messages

## Troubleshooting

### Translation not showing
- Check if key exists in both language files
- Verify key path is correct (use dot notation)
- Check browser console for i18n errors

### Language not switching
- Clear localStorage and refresh
- Check Redux state (`ui.locale`)
- Verify i18n config is loaded correctly

