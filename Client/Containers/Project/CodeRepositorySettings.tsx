import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, Switch, Space, message, App, Modal } from 'antd';
import { CheckCircleOutlined, ReloadOutlined, DownloadOutlined, BugOutlined, FileTextOutlined } from '@ant-design/icons';
import { api } from '../../Utils/api';
import { useTranslation } from 'react-i18next';

const { Option } = Select;
const { TextArea } = Input;

interface CodeRepositorySettingsProps {
  projectId: string;
}

const CodeRepositorySettings: React.FC<CodeRepositorySettingsProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [repository, setRepository] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      fetchRepository();
    }
  }, [projectId]);

  const fetchRepository = async () => {
    if (!projectId) return;
    try {
      const response = await api.get(`/projects/${projectId}/repository`);
      const data = response.data.data;
      if (data) {
        setRepository(data);
        form.setFieldsValue({
          provider: data.provider,
          repository_url: data.repository_url,
          branch: data.branch,
          auth_type: data.auth_type || 'token',
          access_token: data.access_token ? '***' : '',
          ssh_private_key: data.auth_type === 'ssh' ? '***' : '',
          ssh_private_key_password: data.auth_type === 'ssh' ? '***' : '',
          username: data.username,
          enabled: data.enabled,
          auto_sync: data.auto_sync,
        });
      } else {
        form.resetFields();
      }
    } catch (error: any) {
      console.error('Failed to fetch repository:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!projectId) return;
    setLoading(true);
    try {
      // 如果 access_token 是 ***，说明没有修改，不发送
      if (values.access_token === '***') {
        delete values.access_token;
      }
      // 如果 ssh_private_key 是 ***，说明没有修改，不发送
      if (values.ssh_private_key === '***') {
        delete values.ssh_private_key;
      }
      // 如果 ssh_private_key_password 是 ***，说明没有修改，不发送
      if (values.ssh_private_key_password === '***') {
        delete values.ssh_private_key_password;
      }

      await api.post(`/projects/${projectId}/repository`, values);
      messageApi.success(t('project.repository.saveSuccess'));
      fetchRepository();
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.repository.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!projectId) return;
    setTesting(true);
    try {
      await api.post(`/projects/${projectId}/repository/test`);
      messageApi.success(t('project.repository.testSuccess'));
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.repository.testFailed'));
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      await api.delete(`/projects/${projectId}/repository`);
      messageApi.success(t('project.repository.deleteSuccess'));
      setRepository(null);
      form.resetFields();
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.repository.deleteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePullCode = async () => {
    if (!projectId) return;
    setPulling(true);
    try {
      await api.post(`/projects/${projectId}/repository/pull`);
      messageApi.success(t('project.repository.pullSuccess'));
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.repository.pullFailed'));
    } finally {
      setPulling(false);
    }
  };

  return (
    <Card
      title={t('project.repository.title')}
      extra={
        repository && (
          <Button danger onClick={handleDelete} loading={loading}>
            {t('common.delete')}
          </Button>
        )
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ maxWidth: 800 }}
      >
        <Form.Item
          name="provider"
          label={t('project.repository.provider')}
          rules={[{ required: true, message: t('project.repository.providerRequired') }]}
        >
          <Select placeholder={t('project.repository.selectProvider')}>
            <Option value="github">GitHub</Option>
            <Option value="gitlab">GitLab</Option>
            <Option value="gitee">Gitee</Option>
            <Option value="bitbucket">Bitbucket</Option>
            <Option value="custom">自定义</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="repository_url"
          label={t('project.repository.url')}
          rules={[
            { required: true, message: t('project.repository.urlRequired') },
            { type: 'url', message: t('project.repository.urlInvalid') },
          ]}
          tooltip={t('project.repository.urlTooltip')}
        >
          <Input placeholder="https://github.com/owner/repo" />
        </Form.Item>

        <Form.Item
          name="branch"
          label={t('project.repository.branch')}
          initialValue="main"
        >
          <Input placeholder="main" />
        </Form.Item>

        <Form.Item
          name="auth_type"
          label={t('project.repository.authType')}
          initialValue="token"
        >
          <Select>
            <Option value="token">{t('project.repository.authTypeToken')}</Option>
            <Option value="ssh">{t('project.repository.authTypeSSH')}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.auth_type !== currentValues.auth_type}
        >
          {({ getFieldValue }) =>
            getFieldValue('auth_type') === 'token' ? (
              <>
                <Form.Item
                  name="username"
                  label={t('project.repository.username')}
                  tooltip={t('project.repository.usernameTooltip')}
                >
                  <Input placeholder={t('project.repository.usernamePlaceholder')} />
                </Form.Item>

                <Form.Item
                  name="access_token"
                  label={t('project.repository.accessToken')}
                  tooltip={t('project.repository.tokenTooltip')}
                >
                  <Input.Password placeholder={t('project.repository.tokenPlaceholder')} />
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item
                  name="ssh_private_key"
                  label={t('project.repository.sshPrivateKey')}
                  tooltip={t('project.repository.sshPrivateKeyTooltip')}
                >
                  <TextArea 
                    rows={6} 
                    placeholder={t('project.repository.sshPrivateKeyPlaceholder')}
                  />
                </Form.Item>
                <Form.Item
                  name="ssh_private_key_password"
                  label={t('project.repository.sshPrivateKeyPassword')}
                  tooltip={t('project.repository.sshPrivateKeyPasswordTooltip')}
                >
                  <Input.Password placeholder={t('project.repository.sshPrivateKeyPasswordPlaceholder')} />
                </Form.Item>
              </>
            )
          }
        </Form.Item>

        <Form.Item
          name="enabled"
          valuePropName="checked"
          label={t('project.repository.enabled')}
          initialValue={true}
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name="auto_sync"
          valuePropName="checked"
          label={t('project.repository.autoSync')}
          tooltip={t('project.repository.autoSyncTooltip')}
        >
          <Switch />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} style={{ color: '#ffffff' }}>
              {t('common.save')}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleTest} loading={testing}>
              {t('project.repository.testConnection')}
            </Button>
            {repository && (
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handlePullCode} 
                loading={pulling}
              >
                {t('project.repository.pullCode')}
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CodeRepositorySettings;

