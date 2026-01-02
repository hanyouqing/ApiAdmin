import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, Select, Switch, App, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

const { Option } = Select;
const { TextArea } = Input;

interface CodeRepository {
  _id: string;
  project_id: string;
  provider: string;
  repository_url: string;
  branch: string;
  auth_type: 'token' | 'ssh';
  enabled: boolean;
  auto_sync: boolean;
  project?: {
    project_name: string;
  };
}

const CodeManagement: React.FC = () => {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [repositories, setRepositories] = useState<CodeRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRepo, setEditingRepo] = useState<CodeRepository | null>(null);
  const [form] = Form.useForm();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (projects.length > 0) {
      fetchRepositories();
    }
  }, [projects]);

  const fetchProjects = async () => {
    try {
      const apiPath = user?.role === 'super_admin' ? '/admin/project/list' : '/project/list';
      const response = await api.get(apiPath);
      const data = response.data?.data || response.data || [];
      setProjects(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('获取项目列表失败:', error);
    }
  };

  const fetchRepositories = async () => {
    if (projects.length === 0) return;
    
    setLoading(true);
    try {
      const repoList: CodeRepository[] = [];
      for (const project of projects) {
        try {
          const response = await api.get(`/projects/${project._id}/repository`);
          if (response.data.data) {
            repoList.push({
              ...response.data.data,
              project: { project_name: project.project_name },
            });
          }
        } catch (error: any) {
          // 忽略没有配置仓库的项目
          if (error.response?.status !== 404) {
            console.warn(`获取项目 ${project._id} 的代码仓库配置失败:`, error);
          }
        }
      }
      setRepositories(repoList);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.codeManagement.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRepo(null);
    form.resetFields();
    form.setFieldsValue({
      auth_type: 'token',
      enabled: true,
      auto_sync: false,
    });
    setModalVisible(true);
  };

  const handleEdit = (record: CodeRepository) => {
    setEditingRepo(record);
    form.setFieldsValue({
      project_id: record.project_id,
      provider: record.provider,
      repository_url: record.repository_url,
      branch: record.branch,
      auth_type: record.auth_type || 'token',
      access_token: record.auth_type === 'token' ? '***' : '',
      ssh_private_key: record.auth_type === 'ssh' ? '***' : '',
      ssh_private_key_password: record.auth_type === 'ssh' ? '***' : '',
      enabled: record.enabled,
      auto_sync: record.auto_sync,
    });
    setModalVisible(true);
  };

  const handleDelete = (record: CodeRepository) => {
    Modal.confirm({
      title: t('admin.codeManagement.deleteConfirm'),
      content: t('admin.codeManagement.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete(`/projects/${record.project_id}/repository`);
          messageApi.success(t('admin.codeManagement.deleteSuccess'));
          fetchRepositories();
        } catch (error: any) {
          messageApi.error(error.response?.data?.message || t('admin.codeManagement.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const projectId = values.project_id;

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
      messageApi.success(t('admin.codeManagement.saveSuccess'));
      setModalVisible(false);
      form.resetFields();
      await fetchProjects();
      fetchRepositories();
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.codeManagement.saveFailed'));
    }
  };

  const handlePullCode = async (record: CodeRepository) => {
    try {
      await api.post(`/projects/${record.project_id}/repository/pull`);
      messageApi.success(t('admin.codeManagement.pullSuccess'));
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.codeManagement.pullFailed'));
    }
  };

  const columns = [
    {
      title: t('admin.codeManagement.project'),
      dataIndex: 'project',
      key: 'project',
      render: (project: any) => project?.project_name || '-',
    },
    {
      title: t('admin.codeManagement.provider'),
      dataIndex: 'provider',
      key: 'provider',
      render: (provider: string) => <Tag>{provider}</Tag>,
    },
    {
      title: t('admin.codeManagement.repositoryUrl'),
      dataIndex: 'repository_url',
      key: 'repository_url',
      ellipsis: true,
    },
    {
      title: t('admin.codeManagement.branch'),
      dataIndex: 'branch',
      key: 'branch',
    },
    {
      title: t('admin.codeManagement.authType'),
      dataIndex: 'auth_type',
      key: 'auth_type',
      render: (type: string) => (
        <Tag color={type === 'ssh' ? 'blue' : 'green'}>
          {type === 'ssh' ? t('admin.codeManagement.authTypeSSH') : t('admin.codeManagement.authTypeToken')}
        </Tag>
      ),
    },
    {
      title: t('admin.codeManagement.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? t('common.yes') : t('common.no')}
        </Tag>
      ),
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 200,
      render: (_: any, record: CodeRepository) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button type="link" icon={<DownloadOutlined />} onClick={() => handlePullCode(record)}>
            {t('admin.codeManagement.pullCode')}
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  return (
    <div>
      <Card
        title={t('admin.codeManagement.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
            {t('admin.codeManagement.create')}
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={repositories}
          rowKey="_id"
          loading={loading}
          locale={{
            emptyText: t('common.empty'),
          }}
        />
      </Card>

      <Modal
        title={editingRepo ? t('admin.codeManagement.edit') : t('admin.codeManagement.create')}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={handleSubmit}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="project_id"
            label={t('admin.codeManagement.project')}
            rules={[{ required: true, message: t('admin.codeManagement.projectRequired') }]}
          >
            <Select placeholder={t('admin.codeManagement.selectProject')} disabled={!!editingRepo}>
              {projects.map((project) => (
                <Option key={project._id} value={project._id}>
                  {project.project_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

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
              <Option value="custom">{t('project.repository.custom')}</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="repository_url"
            label={t('project.repository.url')}
            rules={[
              { required: true, message: t('project.repository.urlRequired') },
              { type: 'url', message: t('project.repository.urlInvalid') },
            ]}
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
                    name="access_token"
                    label={t('project.repository.accessToken')}
                    rules={[{ required: true, message: t('project.repository.tokenPlaceholder') }]}
                  >
                    <Input.Password placeholder={t('project.repository.tokenPlaceholder')} />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item
                    name="ssh_private_key"
                    label={t('project.repository.sshPrivateKey')}
                    rules={[{ required: true, message: t('project.repository.sshPrivateKeyPlaceholder') }]}
                  >
                    <TextArea rows={6} placeholder={t('project.repository.sshPrivateKeyPlaceholder')} />
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
            initialValue={false}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CodeManagement;

