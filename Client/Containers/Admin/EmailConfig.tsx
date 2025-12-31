import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Switch, InputNumber, Space, App } from 'antd';
import { SaveOutlined, MailOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

const { Option } = Select;

interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'aliyun' | 'resend';
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  from?: string;
  apiKey?: string;
  region?: string;
}

const EmailConfig: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string>('');
  const [form] = Form.useForm();
  const watchedProvider = Form.useWatch('provider', form);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await api.get('/email/config');
      const data = response.data.data || {};
      
      // 后端返回的数据结构需要转换
      const formData: any = {
        provider: data.provider || 'smtp',
      };

      if (data.provider === 'smtp' && data.smtp) {
        formData.host = data.smtp.host || '';
        formData.port = data.smtp.port || 587;
        formData.secure = data.smtp.secure || false;
        formData.user = data.smtp.auth?.user || '';
        formData.password = data.smtp.auth?.pass || '';
        formData.from = data.from?.email || data.smtp.auth?.user || '';
      } else if (data.provider === 'sendgrid' && data.sendgrid) {
        formData.apiKey = data.sendgrid.apiKey || '';
        formData.from = data.from?.email || '';
      } else if (data.provider === 'ses' && data.ses) {
        formData.region = data.ses.region || '';
        formData.accessKeyId = data.ses.accessKeyId || '';
        formData.accessKeySecret = data.ses.secretAccessKey || '';
        formData.from = data.from?.email || '';
      } else if (data.provider === 'aliyun' && data.aliyun) {
        formData.region = data.aliyun.region || '';
        formData.accessKeyId = data.aliyun.accessKeyId || '';
        formData.accessKeySecret = data.aliyun.accessKeySecret || '';
        formData.from = data.from?.email || '';
      } else if (data.provider === 'resend' && data.resend) {
        formData.apiKey = data.resend.apiKey || '';
        formData.from = data.from?.email || '';
      }

      form.setFieldsValue(formData);
      if (formData.provider) {
        setProvider(formData.provider);
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.email.fetchFailed') || '获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // 将表单数据转换为后端需要的格式
      const configData: any = {
        provider: values.provider,
      };

      if (values.provider === 'smtp') {
        configData.smtp = {
          host: values.host || '',
          port: values.port || 587,
          secure: values.secure || false,
          auth: {
            user: values.user || '',
            pass: values.password || '',
          },
        };
        configData.from = {
          name: 'ApiAdmin',
          email: values.from || values.user || '',
        };
      } else if (values.provider === 'sendgrid') {
        configData.sendgrid = {
          apiKey: values.apiKey || '',
        };
        configData.from = {
          name: 'ApiAdmin',
          email: values.from || '',
        };
      } else if (values.provider === 'ses') {
        configData.ses = {
          accessKeyId: values.accessKeyId || '',
          secretAccessKey: values.accessKeySecret || '',
          region: values.region || 'us-east-1',
        };
        configData.from = {
          name: 'ApiAdmin',
          email: values.from || '',
        };
      } else if (values.provider === 'aliyun') {
        configData.aliyun = {
          accessKeyId: values.accessKeyId || '',
          accessKeySecret: values.accessKeySecret || '',
          region: values.region || 'cn-hangzhou',
        };
        configData.from = {
          name: 'ApiAdmin',
          email: values.from || '',
        };
      } else if (values.provider === 'resend') {
        configData.resend = {
          apiKey: values.apiKey || '',
        };
        configData.from = {
          name: 'ApiAdmin',
          email: values.from || '',
        };
      }

      await api.put('/email/config', configData);
      message.success(t('admin.email.updateSuccess') || '配置保存成功');
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.email.updateFailed') || '配置保存失败');
    }
  };

  const handleTest = async () => {
    try {
      const testEmail = form.getFieldValue('testEmail');
      if (!testEmail) {
        message.warning(t('admin.email.testEmailPlaceholder') || '请输入测试邮箱地址');
        return;
      }
      await api.post('/email/test', { to: testEmail });
      message.success(t('admin.email.testSuccess') || '测试邮件发送成功');
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.email.testFailed') || '测试邮件发送失败');
    }
  };

  const renderFormFields = () => {
    const currentProvider = provider || watchedProvider || '';

    if (currentProvider === 'smtp') {
      return (
        <>
          <Form.Item name="host" label={t('admin.email.host')}>
            <Input />
          </Form.Item>
          <Form.Item name="port" label={t('admin.email.port')}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="secure" label={t('admin.email.secure')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="user" label={t('admin.email.user')}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label={t('admin.email.password')}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="from" label={t('admin.email.from')}>
            <Input type="email" />
          </Form.Item>
        </>
      );
    }

    if (currentProvider === 'sendgrid') {
      return (
        <>
          <Form.Item name="apiKey" label={t('admin.email.apiKey')}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="from" label={t('admin.email.from')}>
            <Input type="email" />
          </Form.Item>
        </>
      );
    }

    if (currentProvider === 'ses') {
      return (
        <>
          <Form.Item name="region" label={t('admin.email.region')}>
            <Input placeholder="us-east-1" />
          </Form.Item>
          <Form.Item name="accessKeyId" label="Access Key ID">
            <Input />
          </Form.Item>
          <Form.Item name="accessKeySecret" label="Access Key Secret">
            <Input.Password />
          </Form.Item>
          <Form.Item name="from" label={t('admin.email.from')}>
            <Input type="email" />
          </Form.Item>
        </>
      );
    }

    if (currentProvider === 'aliyun') {
      return (
        <>
          <Form.Item name="accessKeyId" label="Access Key ID">
            <Input />
          </Form.Item>
          <Form.Item name="accessKeySecret" label="Access Key Secret">
            <Input.Password />
          </Form.Item>
          <Form.Item name="region" label={t('admin.email.region')}>
            <Input placeholder="cn-hangzhou" />
          </Form.Item>
          <Form.Item name="from" label={t('admin.email.from')}>
            <Input type="email" />
          </Form.Item>
        </>
      );
    }

    if (currentProvider === 'resend') {
      return (
        <>
          <Form.Item name="apiKey" label={t('admin.email.apiKey')}>
            <Input.Password placeholder="re_xxxxxxxxxxxx" />
          </Form.Item>
          <Form.Item name="from" label={t('admin.email.from')}>
            <Input type="email" placeholder="onboarding@resend.dev" />
          </Form.Item>
        </>
      );
    }

    return null;
  };

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  return (
    <Card title={t('admin.email.title')} loading={loading}>
      <Form form={form} layout="vertical">
        <Form.Item name="provider" label={t('admin.email.provider')} rules={[{ required: true }]}>
          <Select onChange={(value) => setProvider(value)}>
            <Option value="smtp">{t('admin.email.provider.smtp')}</Option>
            <Option value="sendgrid">{t('admin.email.provider.sendgrid')}</Option>
            <Option value="ses">{t('admin.email.provider.ses')}</Option>
            <Option value="aliyun">{t('admin.email.provider.aliyun')}</Option>
            <Option value="resend">{t('admin.email.provider.resend')}</Option>
          </Select>
        </Form.Item>
        {renderFormFields()}
        <Form.Item>
          <Space>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              {t('common.save')}
            </Button>
            <Button icon={<MailOutlined />} onClick={handleTest}>
              {t('admin.email.sendTest')}
            </Button>
          </Space>
        </Form.Item>
        <Form.Item name="testEmail" label={t('admin.email.testEmail')}>
          <Input placeholder={t('admin.email.testEmailPlaceholder')} />
        </Form.Item>
      </Form>
    </Card>
  );
};

export default EmailConfig;

