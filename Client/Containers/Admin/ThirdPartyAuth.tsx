import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Switch, Button, Tabs, Select, App } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

const { Option } = Select;

interface ThirdPartyAuthConfig {
  github?: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  gitlab?: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  google?: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  wechat?: {
    enabled: boolean;
    appId: string;
    appSecret: string;
    redirectUri: string;
  };
  phone?: {
    enabled: boolean;
    provider: 'aliyun' | 'tencent';
    accessKeyId: string;
    accessKeySecret: string;
    signName: string;
    templateCode: string;
  };
  email?: {
    enabled: boolean;
  };
}

const ThirdPartyAuth: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ThirdPartyAuthConfig>({});
  const [githubForm] = Form.useForm();
  const [gitlabForm] = Form.useForm();
  const [googleForm] = Form.useForm();
  const [wechatForm] = Form.useForm();
  const [phoneForm] = Form.useForm();
  const [emailForm] = Form.useForm();

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/auth/third-party/config');
      const data = response.data.data || {};
      setConfig(data);
      
      // 设置表单默认值，确保所有字段都有值
      githubForm.setFieldsValue({
        enabled: data.github?.enabled || false,
        clientId: data.github?.clientId || '',
        clientSecret: data.github?.clientSecret || '',
        redirectUri: data.github?.redirectUri || '',
      });
      
      gitlabForm.setFieldsValue({
        enabled: data.gitlab?.enabled || false,
        clientId: data.gitlab?.clientId || '',
        clientSecret: data.gitlab?.clientSecret || '',
        redirectUri: data.gitlab?.redirectUri || '',
      });
      
      googleForm.setFieldsValue({
        enabled: data.google?.enabled || false,
        clientId: data.google?.clientId || '',
        clientSecret: data.google?.clientSecret || '',
        redirectUri: data.google?.redirectUri || '',
      });
      
      wechatForm.setFieldsValue({
        enabled: data.wechat?.enabled || false,
        appId: data.wechat?.appId || '',
        appSecret: data.wechat?.appSecret || '',
        redirectUri: data.wechat?.redirectUri || '',
      });
      
      phoneForm.setFieldsValue({
        enabled: data.phone?.enabled || false,
        provider: data.phone?.provider || 'aliyun',
        accessKeyId: data.phone?.accessKeyId || '',
        accessKeySecret: data.phone?.accessKeySecret || '',
        signName: data.phone?.signName || '',
        templateCode: data.phone?.templateCode || '',
      });
      
      emailForm.setFieldsValue({
        enabled: data.email?.enabled || false,
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.thirdPartyAuth.fetchFailed') || '获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (provider: string, form: any) => {
    try {
      const values = await form.validateFields();
      await api.post(`/admin/auth/third-party/config/${provider}`, values);
      message.success(t('admin.thirdPartyAuth.updateSuccess'));
      fetchConfig();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.thirdPartyAuth.updateFailed'));
    }
  };

  const renderGitHubForm = () => (
    <Form form={githubForm} layout="vertical">
      <Form.Item name="enabled" label={t('admin.thirdPartyAuth.enabled')} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="clientId" label={t('admin.thirdPartyAuth.clientId')}>
        <Input />
      </Form.Item>
      <Form.Item name="clientSecret" label={t('admin.thirdPartyAuth.clientSecret')}>
        <Input.Password />
      </Form.Item>
      <Form.Item name="redirectUri" label={t('admin.thirdPartyAuth.redirectUri')}>
        <Input placeholder="https://your-domain.com/api/auth/github/callback" />
      </Form.Item>
      <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('github', githubForm)}>
        {t('common.save')}
      </Button>
    </Form>
  );

  const renderGitLabForm = () => (
    <Form form={gitlabForm} layout="vertical">
      <Form.Item name="enabled" label={t('admin.thirdPartyAuth.enabled')} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="clientId" label={t('admin.thirdPartyAuth.clientId')}>
        <Input />
      </Form.Item>
      <Form.Item name="clientSecret" label={t('admin.thirdPartyAuth.clientSecret')}>
        <Input.Password />
      </Form.Item>
      <Form.Item name="redirectUri" label={t('admin.thirdPartyAuth.redirectUri')}>
        <Input placeholder="https://your-domain.com/api/auth/gitlab/callback" />
      </Form.Item>
      <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('gitlab', gitlabForm)}>
        {t('common.save')}
      </Button>
    </Form>
  );

  const renderGoogleForm = () => (
    <Form form={googleForm} layout="vertical">
      <Form.Item name="enabled" label={t('admin.thirdPartyAuth.enabled')} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="clientId" label={t('admin.thirdPartyAuth.clientId')}>
        <Input />
      </Form.Item>
      <Form.Item name="clientSecret" label={t('admin.thirdPartyAuth.clientSecret')}>
        <Input.Password />
      </Form.Item>
      <Form.Item name="redirectUri" label={t('admin.thirdPartyAuth.redirectUri')}>
        <Input placeholder="https://your-domain.com/api/auth/google/callback" />
      </Form.Item>
      <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('google', googleForm)}>
        {t('common.save')}
      </Button>
    </Form>
  );

  const renderWeChatForm = () => (
    <Form form={wechatForm} layout="vertical">
      <Form.Item name="enabled" label={t('admin.thirdPartyAuth.enabled')} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="appId" label={t('admin.thirdPartyAuth.appId')}>
        <Input />
      </Form.Item>
      <Form.Item name="appSecret" label={t('admin.thirdPartyAuth.appSecret')}>
        <Input.Password />
      </Form.Item>
      <Form.Item name="redirectUri" label={t('admin.thirdPartyAuth.redirectUri')}>
        <Input placeholder="https://your-domain.com/api/auth/wechat/callback" />
      </Form.Item>
      <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('wechat', wechatForm)}>
        {t('common.save')}
      </Button>
    </Form>
  );

  const renderPhoneForm = () => (
    <Form form={phoneForm} layout="vertical">
      <Form.Item name="enabled" label={t('admin.thirdPartyAuth.enabled')} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="provider" label={t('admin.thirdPartyAuth.smsProvider')}>
        <Select>
          <Option value="aliyun">{t('admin.thirdPartyAuth.smsProviderAliyun')}</Option>
          <Option value="tencent">{t('admin.thirdPartyAuth.smsProviderTencent')}</Option>
        </Select>
      </Form.Item>
      <Form.Item name="accessKeyId" label={t('admin.thirdPartyAuth.accessKeyId')}>
        <Input />
      </Form.Item>
      <Form.Item name="accessKeySecret" label={t('admin.thirdPartyAuth.accessKeySecret')}>
        <Input.Password />
      </Form.Item>
      <Form.Item name="signName" label={t('admin.thirdPartyAuth.signName')}>
        <Input />
      </Form.Item>
      <Form.Item name="templateCode" label={t('admin.thirdPartyAuth.templateCode')}>
        <Input />
      </Form.Item>
      <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('phone', phoneForm)}>
        {t('common.save')}
      </Button>
    </Form>
  );

  const renderEmailForm = () => (
    <Form form={emailForm} layout="vertical">
      <Form.Item name="enabled" label={t('admin.thirdPartyAuth.enabled')} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave('email', emailForm)}>
        {t('common.save')}
      </Button>
    </Form>
  );

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  const tabItems = [
    {
      key: 'github',
      label: t('admin.thirdPartyAuth.github'),
      children: renderGitHubForm(),
    },
    {
      key: 'gitlab',
      label: t('admin.thirdPartyAuth.gitlab'),
      children: renderGitLabForm(),
    },
    {
      key: 'google',
      label: t('admin.thirdPartyAuth.google'),
      children: renderGoogleForm(),
    },
    {
      key: 'wechat',
      label: t('admin.thirdPartyAuth.wechat'),
      children: renderWeChatForm(),
    },
    {
      key: 'phone',
      label: t('admin.thirdPartyAuth.phone'),
      children: renderPhoneForm(),
    },
    {
      key: 'email',
      label: t('admin.thirdPartyAuth.email'),
      children: renderEmailForm(),
    },
  ];

  return (
    <Card title={t('admin.thirdPartyAuth.title')} loading={loading}>
      <Tabs items={tabItems} />
    </Card>
  );
};

export default ThirdPartyAuth;

