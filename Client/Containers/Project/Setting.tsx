import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Switch, Space, message, App, Modal, Upload, Select, Tabs, Table, Tag, List, Avatar } from 'antd';
import { UploadOutlined, DownloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { updateProject, fetchProjectDetail } from '../../Reducer/Modules/Project';
import { fetchGroups } from '../../Reducer/Modules/Group';
import { api } from '../../Utils/api';
import type { AppDispatch, RootState } from '../../Reducer/Create';
import type { UploadFile } from 'antd';
import { getAvatarUrl } from '../../Utils/avatar';
import TestRules from './TestRules';

const { TextArea } = Input;
const { Option } = Select;

const Setting: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const { currentProject } = useSelector((state: RootState) => state.project);
  
  // 从路由路径中提取 projectId，或从 Redux store 获取
  const projectId = React.useMemo(() => {
    if (params.projectId) {
      return params.projectId;
    }
    // 从 URL 路径中提取：/project/:projectId/setting
    const pathMatch = location.pathname.match(/\/project\/([^/]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    // 最后从 Redux store 获取
    return currentProject?._id || '';
  }, [params.projectId, location.pathname, currentProject?._id]);
  const { groups } = useSelector((state: RootState) => state.group);
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFormat, setImportFormat] = useState('postman');
  const [importFile, setImportFile] = useState<UploadFile | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState('normal');
  const [swaggerUrl, setSwaggerUrl] = useState('');
  const [envModalVisible, setEnvModalVisible] = useState(false);
  const [editingEnv, setEditingEnv] = useState<any>(null);
  const [envForm] = Form.useForm();
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [memberForm] = Form.useForm();

  useEffect(() => {
    if (currentProject && projectId) {
      form.setFieldsValue({
        ...currentProject,
        mock_strict: currentProject.mock_strict || false,
        enable_json5: currentProject.enable_json5 || false,
      });
    }
    dispatch(fetchGroups());
  }, [currentProject, form, projectId, dispatch]);

  const onFinish = async (values: any) => {
    if (!projectId) return;
    setLoading(true);
    try {
      await dispatch(updateProject({ id: projectId, data: values })).unwrap();
      messageApi.success(t('project.updateSuccess'));
      dispatch(fetchProjectDetail(projectId));
    } catch (error: any) {
      messageApi.error(error.message || t('message.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!currentProject) {
    return <Card>{t('common.loading')}</Card>;
  }

  const handleImport = async () => {
    if (!projectId) return;
    
    // Swagger URL 导入
    if (importFormat === 'swagger' && swaggerUrl) {
      setImporting(true);
      try {
        // 如果 URL 不包含 .json，尝试自动添加
        let fetchUrl = swaggerUrl;
        if (!swaggerUrl.endsWith('.json') && !swaggerUrl.includes('/swagger.json') && !swaggerUrl.includes('/openapi.json')) {
          // 如果 URL 以 /swagger 或 /swagger-ui 结尾，尝试添加 .json
          if (swaggerUrl.endsWith('/swagger') || swaggerUrl.endsWith('/swagger-ui')) {
            fetchUrl = swaggerUrl.replace(/\/swagger(-ui)?$/, '/swagger.json');
          } else if (swaggerUrl.endsWith('/')) {
            fetchUrl = swaggerUrl + 'swagger.json';
          } else {
            fetchUrl = swaggerUrl + '/swagger.json';
          }
        }

        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          // 如果第一次请求失败，且 URL 被修改过，尝试原始 URL
          if (fetchUrl !== swaggerUrl) {
            const originalResponse = await fetch(swaggerUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });
            if (originalResponse.ok) {
              const contentType = originalResponse.headers.get('content-type') || '';
              if (contentType.includes('application/json')) {
                const text = await originalResponse.text();
                if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                  throw new Error('服务器返回了 HTML 页面而不是 JSON。请使用 /swagger.json 端点');
                }
                const data = JSON.parse(text);
                await api.post('/import', {
                  project_id: projectId,
                  format: importFormat,
                  mode: importMode,
                  data,
                });
                messageApi.success(t('importExport.importSuccess'));
                setImportModalVisible(false);
                setSwaggerUrl('');
                dispatch(fetchProjectDetail(projectId));
                return;
              }
            }
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        
        // 检查是否是 HTML 页面
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          throw new Error('服务器返回了 HTML 页面而不是 JSON。请确保 URL 指向 Swagger JSON 文件（例如：/swagger.json）');
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`JSON 解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
        }

        await api.post('/import', {
          project_id: projectId,
          format: importFormat,
          mode: importMode,
          data,
        });
        messageApi.success(t('importExport.importSuccess'));
        setImportModalVisible(false);
        setSwaggerUrl('');
        dispatch(fetchProjectDetail(projectId));
      } catch (error: any) {
        messageApi.error(error.response?.data?.message || error.message || t('importExport.importFailed'));
      } finally {
        setImporting(false);
      }
      return;
    }

    // 文件导入
    if (!importFile) return;
    setImporting(true);
    try {
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(importFile.originFileObj as File);
      });

      let data;
      try {
        data = JSON.parse(fileContent);
      } catch (parseError) {
        messageApi.error(t('importExport.invalidJson'));
        setImporting(false);
        return;
      }

      await api.post('/import', {
        project_id: projectId,
        format: importFormat,
        mode: importMode,
        data,
      });
      messageApi.success(t('importExport.importSuccess'));
      setImportModalVisible(false);
      setImportFile(null);
      if (projectId) {
        dispatch(fetchProjectDetail(projectId));
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || error.message || t('importExport.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!projectId) return;
    try {
      const response = await api.get('/export', {
        params: { project_id: projectId, format },
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject?.project_name || 'project'}.${format === 'json' ? 'json' : format === 'swagger' ? 'json' : format === 'markdown' ? 'md' : 'html'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      messageApi.success(t('importExport.exportSuccess'));
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('importExport.exportFailed'));
    }
  };

  const handleCreateEnv = () => {
    setEditingEnv(null);
    envForm.resetFields();
    setEnvModalVisible(true);
  };

  const handleEditEnv = (env: any) => {
    setEditingEnv(env);
    envForm.setFieldsValue({
      name: env.name,
      host: env?.host || env?.base_url || '',
      variables: JSON.stringify(env.variables || {}, null, 2),
    });
    setEnvModalVisible(true);
  };

  const handleDeleteEnv = (envName: string) => {
    Modal.confirm({
      title: t('project.environment.deleteConfirm'),
      content: t('project.environment.deleteConfirmMessage', { name: envName }),
      onOk: async () => {
        if (!projectId) return;
        try {
          await api.delete('/project/environment/del', {
            params: { project_id: projectId, env_name: envName },
          });
          messageApi.success(t('project.environment.deleteSuccess'));
          dispatch(fetchProjectDetail(projectId));
        } catch (error: any) {
          messageApi.error(error.response?.data?.message || t('project.environment.deleteFailed'));
        }
      },
    });
  };

  const handleSubmitEnv = async () => {
    if (!projectId) return;
    try {
      const values = await envForm.validateFields();
      let variables = {};
      if (values.variables) {
        try {
          variables = JSON.parse(values.variables);
        } catch {
          messageApi.error(t('project.environment.invalidJson'));
          return;
        }
      }

      if (editingEnv) {
        await api.put('/project/environment/up', {
          project_id: projectId,
          env_name: editingEnv.name,
          name: values.name,
          host: values.host,
          variables,
        });
        messageApi.success(t('project.environment.updateSuccess'));
      } else {
        await api.post('/project/environment/add', {
          project_id: projectId,
          name: values.name,
          host: values.host,
          variables,
        });
        messageApi.success(t('project.environment.createSuccess'));
      }
      setEnvModalVisible(false);
      envForm.resetFields();
      dispatch(fetchProjectDetail(projectId));
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.environment.operationFailed'));
    }
  };

  const handleAddMember = () => {
    memberForm.resetFields();
    setMemberModalVisible(true);
  };

  const handleRemoveMember = (memberId: string) => {
    Modal.confirm({
      title: t('project.member.removeConfirm'),
      content: t('project.member.removeConfirmMessage'),
      onOk: async () => {
        if (!projectId) return;
        try {
          await api.delete('/project/member/del', {
            params: { project_id: projectId, member_id: memberId },
          });
          messageApi.success(t('project.member.removeSuccess'));
          dispatch(fetchProjectDetail(projectId));
        } catch (error: any) {
          messageApi.error(error.response?.data?.message || t('project.member.removeFailed'));
        }
      },
    });
  };

  const handleSubmitMember = async () => {
    if (!projectId) return;
    try {
      const values = await memberForm.validateFields();
      await api.post('/project/member/add', {
        project_id: projectId,
        member_email: values.email,
      });
      messageApi.success(t('project.member.addSuccess'));
      setMemberModalVisible(false);
      memberForm.resetFields();
      dispatch(fetchProjectDetail(projectId));
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.member.addFailed'));
    }
  };

  const envColumns = [
    {
      title: t('project.environment.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('project.environment.host'),
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: t('project.environment.variables'),
      dataIndex: 'variables',
      key: 'variables',
      render: (variables: any) => (
        <Tag>{Object.keys(variables || {}).length} {t('project.environment.variablesCount')}</Tag>
      ),
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditEnv(record)}>
            {t('common.edit')}
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteEnv(record.name)}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title={t('project.tabs.setting')}>
      <Tabs
        items={[
          {
            key: 'basic',
            label: t('project.setting.basic'),
            children: (
              <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 800 }}>
        <Form.Item
          name="project_name"
          label={t('project.projectName')}
          rules={[{ required: true, message: t('project.nameRequired') }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="project_desc" label={t('common.description')}>
          <TextArea rows={3} />
        </Form.Item>
        <Form.Item name="basepath" label={t('project.basepath')}>
          <Input placeholder="/api/v1" />
        </Form.Item>
        <Form.Item name="color" label={t('project.color')}>
          <Input type="color" style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="icon" label={t('project.icon')}>
          <Input placeholder="图标名称或URL" />
        </Form.Item>
        <Form.Item name="mock_strict" valuePropName="checked" label={t('project.mockStrict')}>
          <Switch />
        </Form.Item>
        <Form.Item name="enable_json5" valuePropName="checked" label={t('project.enableJson5')}>
          <Switch />
        </Form.Item>
        <Form.Item name="token" label={t('project.token')}>
          <Input disabled />
        </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    {t('common.save')}
                  </Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'member',
            label: t('project.setting.member'),
            children: (
              <div style={{ maxWidth: 800 }}>
                <Card
                  title={t('project.member.title')}
                  extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMember} style={{ color: '#ffffff' }}>
                      {t('project.member.add')}
                    </Button>
                  }
                >
                  <List
                    dataSource={currentProject?.member || []}
                    renderItem={(member: any) => (
                      <List.Item
                        key={member._id || member}
                        actions={[
                          currentProject?.uid !== member._id && currentProject?.uid !== member ? (
                            <Button
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleRemoveMember(member._id || member)}
                            >
                              {t('project.member.remove')}
                            </Button>
                          ) : null,
                        ].filter(Boolean)}
                      >
                        <List.Item.Meta
                          avatar={<Avatar src={getAvatarUrl(member.avatar)} icon={<UserOutlined />} />}
                          title={member.username || member}
                          description={member.email || ''}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'environment',
            label: t('project.setting.environment'),
            children: (
              <div style={{ maxWidth: 800 }}>
                <Card
                  title={t('project.environment.title')}
                  extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateEnv} style={{ color: '#ffffff' }}>
                      {t('project.environment.create')}
                    </Button>
                  }
                >
                  <Table
                    columns={envColumns}
                    dataSource={currentProject?.env || []}
                    rowKey="name"
                    pagination={false}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'advanced',
            label: t('project.setting.advanced'),
            children: (
              <div style={{ maxWidth: 800 }}>
                <Card title={t('project.advanced.migrate')} style={{ marginBottom: 16 }}>
                  <Form
                    onFinish={async (values) => {
                      if (!projectId) return;
                      try {
                        await api.post('/project/migrate', {
                          project_id: projectId,
                          target_group_id: values.target_group_id,
                        });
                        messageApi.success(t('project.advanced.migrateSuccess'));
                        dispatch(fetchProjectDetail(projectId));
                      } catch (error: any) {
                        messageApi.error(error.response?.data?.message || t('project.advanced.migrateFailed'));
                      }
                    }}
                  >
                    <Form.Item
                      name="target_group_id"
                      label={t('project.advanced.targetGroup')}
                      rules={[{ required: true, message: t('project.advanced.targetGroupRequired') }]}
                    >
                      <Select placeholder={t('project.advanced.targetGroupPlaceholder')}>
                        {groups.map((group: any) => (
                          <Option key={group._id} value={group._id}>
                            {group.group_name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" style={{ color: '#ffffff' }}>
                        {t('project.advanced.migrate')}
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
                <Card title={t('project.advanced.copy')}>
                  <Form
                    onFinish={async (values) => {
                      if (!projectId) return;
                      try {
                        const response = await api.post('/project/copy', {
                          project_id: projectId,
                          new_project_name: values.new_project_name,
                          target_group_id: values.target_group_id,
                        });
                        messageApi.success(t('project.advanced.copySuccess'));
                        // 可以导航到新项目
                        if (response.data?.data?._id) {
                          window.location.href = `/project/${response.data.data._id}`;
                        }
                      } catch (error: any) {
                        messageApi.error(error.response?.data?.message || t('project.advanced.copyFailed'));
                      }
                    }}
                  >
                    <Form.Item
                      name="new_project_name"
                      label={t('project.advanced.newProjectName')}
                      rules={[{ required: true, message: t('project.advanced.newProjectNameRequired') }]}
                    >
                      <Input placeholder={t('project.advanced.newProjectNamePlaceholder')} />
                    </Form.Item>
                    <Form.Item
                      name="target_group_id"
                      label={t('project.advanced.targetGroup')}
                    >
                      <Select placeholder={t('project.advanced.targetGroupPlaceholder')} allowClear>
                        {groups.map((group: any) => (
                          <Option key={group._id} value={group._id}>
                            {group.group_name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" style={{ color: '#ffffff' }}>
                        {t('project.advanced.copy')}
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </div>
            ),
          },
          {
            key: 'importExport',
            label: t('project.setting.importExport'),
            children: (
              <div style={{ maxWidth: 800 }}>
                <Card title={t('importExport.import')} style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8 }}>{t('importExport.format')}</label>
                      <Select
                        value={importFormat}
                        onChange={(value) => {
                          setImportFormat(value);
                          setImportFile(null);
                          setSwaggerUrl('');
                        }}
                        style={{ width: 200 }}
                      >
                        <Option value="postman">Postman</Option>
                        <Option value="swagger">Swagger/OpenAPI</Option>
                        <Option value="har">HAR</Option>
                        <Option value="apiadmin">ApiAdmin JSON</Option>
                      </Select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8 }}>{t('importExport.importMode')}</label>
                      <Select
                        value={importMode}
                        onChange={setImportMode}
                        style={{ width: 200 }}
                      >
                        <Option value="normal">{t('importExport.mode.normal')}</Option>
                        <Option value="good">{t('importExport.mode.good')}</Option>
                        <Option value="mergin">{t('importExport.mode.mergin')}</Option>
                      </Select>
                    </div>
                    {importFormat === 'swagger' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: 8 }}>{t('importExport.swaggerUrl')}</label>
                        <Input
                          placeholder="https://api.example.com/swagger.json"
                          value={swaggerUrl}
                          onChange={(e) => setSwaggerUrl(e.target.value)}
                          style={{ width: '100%', maxWidth: 500 }}
                        />
                      </div>
                    )}
                    {importFormat !== 'swagger' || !swaggerUrl ? (
                      <Upload
                        beforeUpload={(file) => {
                          setImportFile({ ...file, uid: file.uid } as UploadFile);
                          return false;
                        }}
                        onRemove={() => setImportFile(null)}
                        accept=".json,.yaml,.yml"
                        maxCount={1}
                      >
                        <Button icon={<UploadOutlined />}>{t('importExport.selectFile')}</Button>
                      </Upload>
                    ) : null}
                    {(importFile || (importFormat === 'swagger' && swaggerUrl)) && (
                      <Button
                        type="primary"
                        onClick={handleImport}
                        loading={importing}
                        style={{ color: '#ffffff' }}
                      >
                        {t('importExport.import')}
                      </Button>
                    )}
                  </Space>
                </Card>
                <Card title={t('importExport.export')}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleExport('json')}
                    >
                      {t('importExport.exportJson')}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleExport('swagger')}
                    >
                      {t('importExport.exportSwagger')}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleExport('markdown')}
                    >
                      {t('importExport.exportMarkdown')}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleExport('html')}
                    >
                      {t('importExport.exportHtml')}
                    </Button>
                  </Space>
                </Card>
              </div>
            ),
          },
          {
            key: 'testRules',
            label: t('test.rules.title'),
            children: <TestRules />,
          },
          {
            key: 'repository',
            label: t('project.setting.repository'),
            children: <CodeRepositorySettings projectId={projectId} />,
          },
        ]}
      />

      <Modal
        title={editingEnv ? t('project.environment.edit') : t('project.environment.create')}
        open={envModalVisible}
        onOk={handleSubmitEnv}
        onCancel={() => {
          setEnvModalVisible(false);
          envForm.resetFields();
          setEditingEnv(null);
        }}
        width={600}
        okButtonProps={{ style: { color: '#ffffff' } }}
      >
        <Form form={envForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('project.environment.name')}
            rules={[{ required: true, message: t('project.environment.nameRequired') }]}
          >
            <Input placeholder={t('project.environment.namePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="host"
            label={t('project.environment.host')}
            rules={[{ required: true, message: t('project.environment.hostRequired') }]}
          >
            <Input placeholder={t('project.environment.hostPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="variables"
            label={t('project.environment.variables')}
            tooltip={t('project.environment.variablesTooltip')}
          >
            <TextArea rows={6} placeholder='{"key": "value"}' />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('project.member.add')}
        open={memberModalVisible}
        onOk={handleSubmitMember}
        onCancel={() => {
          setMemberModalVisible(false);
          memberForm.resetFields();
        }}
      >
        <Form form={memberForm} layout="vertical">
          <Form.Item
            name="email"
            label={t('project.member.email')}
            rules={[
              { required: true, message: t('project.member.emailRequired') },
              { type: 'email', message: t('project.member.emailInvalid') },
            ]}
          >
            <Input placeholder={t('project.member.emailPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default Setting;
