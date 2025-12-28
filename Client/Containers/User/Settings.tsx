import React, { useState } from 'react';
import { Card, Form, Input, Button, message, App } from 'antd';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { AppDispatch } from '../../Reducer/Create';

const Settings: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    if (values.newPassword !== values.confirmNewPassword) {
      messageApi.error(t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/user/password/change', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      messageApi.success(t('user.passwordChangeSuccess'));
      form.resetFields();
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('user.passwordChangeFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={t('user.settings')}>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 500 }}>
        <Form.Item
          name="oldPassword"
          label={t('user.oldPassword')}
          rules={[{ required: true, message: t('auth.passwordRequired') }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t('user.newPassword')}
          rules={[
            { required: true, message: t('auth.passwordRequired') },
            { min: 6, message: t('auth.passwordTooShort') },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirmNewPassword"
          label={t('user.confirmNewPassword')}
          dependencies={['newPassword']}
          rules={[
            { required: true, message: t('auth.confirmPasswordRequired') },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(t('auth.passwordMismatch')));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ color: '#ffffff' }}>
            {t('user.changePassword')}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default Settings;

