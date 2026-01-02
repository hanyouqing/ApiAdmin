import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, App, Switch, Radio } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { AppDispatch, RootState } from '../../Reducer/Create';

const { Option } = Select;
const { TextArea } = Input;

interface Environment {
  _id?: string;
  project_id: string;
  project_name?: string;
  name: string;
  base_url: string;
  variables?: any;
  headers?: any;
  description?: string;
  is_default?: boolean;
}

const EnvironmentManagement: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [projects, setProjects] = useState<any[]>([]);
  const [environments, setEnvironments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEnv, setEditingEnv] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [projectFilter, setProjectFilter] = useState<string | undefined>(undefined);
  const [variablesFormat, setVariablesFormat] = useState<'json' | 'keyvalue'>('json');
  const [headersFormat, setHeadersFormat] = useState<'json' | 'keyvalue'>('json');

  const fetchProjects = async () => {
    try {
      // 如果是超级管理员，使用管理员 API 获取所有项目
      // 否则使用普通用户 API，只返回用户参与的项目
      const apiPath = user?.role === 'super_admin' ? '/admin/project/list' : '/project/list';
      const response = await api.get(apiPath);
      const projectList = response.data.data || [];
      // 确保每个项目都有 env 字段
      const projectsWithEnv = projectList.map((project: any) => ({
        ...project,
        env: Array.isArray(project.env) ? project.env : [],
      }));
      setProjects(projectsWithEnv);
    } catch (error: any) {
      if (message) {
        message.error(error.response?.data?.message || t('admin.project.fetchFailed'));
      } else {
        console.error('获取项目列表失败:', error.response?.data?.message || t('admin.project.fetchFailed'));
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      if (projects.length > 0) {
        // 延迟一下，确保 projects 已经设置
        const timer = setTimeout(() => {
          if (projectFilter) {
            fetchEnvironments(projectFilter);
          } else {
            // 如果没有选择项目，获取所有项目的环境
            fetchEnvironments();
          }
        }, 100);
        return () => clearTimeout(timer);
      } else {
        // 如果没有项目，清空环境列表
        setEnvironments([]);
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, projects, user]);

  const fetchEnvironments = async (projectId?: string) => {
    setLoading(true);
    try {
      if (projectId) {
        // 获取指定项目的环境
        const response = await api.get('/test/environments', {
          params: { project_id: projectId },
        });
        const envList = response.data?.data || [];
        // 统一环境数据结构，确保与测试流水线页面一致
        const project = projects.find((p: any) => p._id === projectId);
        const envsWithProject = envList.map((env: any) => ({
          ...env,
          project_name: project?.project_name || t('admin.environment.unknownProject'),
          // 统一使用 base_url，移除 host 字段的兼容（后端已统一使用 base_url）
          base_url: env.base_url || '',
        }));
        setEnvironments(envsWithProject);
        console.log(`获取项目 ${projectId} 的环境成功，共 ${envsWithProject.length} 个`);
      } else {
        // 获取所有项目的环境
        if (projects.length === 0) {
          console.warn('项目列表为空，无法获取环境列表');
          setEnvironments([]);
          setLoading(false);
          return;
        }
        
        const allEnvironments: any[] = [];
        for (const project of projects) {
          try {
            const response = await api.get('/test/environments', {
              params: { project_id: project._id },
            });
            const envList = response.data?.data || [];
            envList.forEach((env: any) => {
              allEnvironments.push({
                ...env,
                project_name: project.project_name || t('admin.environment.unknownProject'),
                // 统一使用 base_url，移除 host 字段的兼容（后端已统一使用 base_url）
                base_url: env.base_url || '',
              });
            });
            console.log(`获取项目 ${project._id} (${project.project_name}) 的环境成功，共 ${envList.length} 个`);
          } catch (error: any) {
            // 忽略单个项目的错误，继续处理其他项目
            console.warn(`获取项目 ${project._id} (${project.project_name}) 的环境失败:`, error.response?.data?.message || error.message);
          }
        }
        setEnvironments(allEnvironments);
        console.log(`获取所有项目环境完成，共 ${allEnvironments.length} 个`);
      }
    } catch (error: any) {
      console.error('获取环境列表失败:', error);
      if (message) {
        message.error(error.response?.data?.message || t('admin.environment.fetchFailed'));
      } else {
        console.error('获取环境列表失败:', error.response?.data?.message || t('admin.environment.fetchFailed'));
      }
      setEnvironments([]);
    } finally {
      setLoading(false);
    }
  };

  // 将对象转换为 key=value 格式字符串
  const objectToKeyValue = (obj: any): string => {
    if (!obj || typeof obj !== 'object') {
      return '';
    }
    return Object.entries(obj)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  };

  // 将 key=value 格式字符串转换为对象
  const keyValueToObject = (str: string): any => {
    if (!str || typeof str !== 'string') {
      return {};
    }
    const obj: any = {};
    const lines = str.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        if (key) {
          obj[key] = value;
        }
      }
    }
    return obj;
  };

  const handleCreate = () => {
    setEditingEnv(null);
    form.resetFields();
    setVariablesFormat('json');
    setHeadersFormat('json');
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingEnv(record);
    
    // 处理 variables
    let variablesValue = '';
    if (record.variables && typeof record.variables === 'object') {
      variablesValue = JSON.stringify(record.variables, null, 2);
    } else if (record.variables) {
      variablesValue = record.variables;
    } else {
      variablesValue = '{}';
    }
    
    // 处理 headers
    let headersValue = '';
    if (record.headers && typeof record.headers === 'object') {
      headersValue = JSON.stringify(record.headers, null, 2);
    } else if (record.headers) {
      headersValue = record.headers;
    } else {
      headersValue = '{}';
    }
    
    form.setFieldsValue({
      project_id: record.project_id,
      name: record.name,
      base_url: record.base_url || '',
      variables: variablesValue,
      headers: headersValue,
      description: record.description || '',
      is_default: record.is_default || false,
    });
    
    // 重置格式为 JSON
    setVariablesFormat('json');
    setHeadersFormat('json');
    setModalVisible(true);
  };

  const handleDelete = (envId: string) => {
    Modal.confirm({
      title: t('admin.environment.deleteConfirm'),
      content: t('admin.environment.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete(`/test/environments/${envId}`);
          if (message) {
            message.success(t('admin.environment.deleteSuccess'));
          } else {
            console.log('删除成功:', t('admin.environment.deleteSuccess'));
          }
          // 更新环境列表
          fetchEnvironments(projectFilter);
        } catch (error: any) {
          if (message) {
            message.error(error.response?.data?.message || t('admin.environment.deleteFailed'));
          } else {
            console.error('删除失败:', error.response?.data?.message || t('admin.environment.deleteFailed'));
          }
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let variables = {};
      let headers = {};
      
      // 处理 variables
      if (values.variables) {
        try {
          if (variablesFormat === 'json') {
            variables = JSON.parse(values.variables);
          } else {
            // key=value 格式
            variables = keyValueToObject(values.variables);
          }
        } catch (error) {
          if (message) {
            message.error(
              variablesFormat === 'json' 
                ? t('admin.environment.invalidJson')
                : '无效的 key=value 格式'
            );
          } else {
            console.error(t('admin.environment.invalidFormat'), error);
          }
          return;
        }
      }
      
      // 处理 headers
      if (values.headers) {
        try {
          if (headersFormat === 'json') {
            headers = JSON.parse(values.headers);
          } else {
            // key=value 格式
            headers = keyValueToObject(values.headers);
          }
        } catch (error) {
          if (message) {
            message.error(
              headersFormat === 'json'
                ? t('admin.environment.invalidHeadersJson')
                : t('admin.environment.invalidHeadersKeyValue')
            );
          } else {
            console.error('无效的 Headers 格式:', error);
          }
          return;
        }
      }
      
      if (editingEnv && editingEnv._id) {
        // 更新环境
        await api.put(`/test/environments/${editingEnv._id}`, {
          name: values.name,
          base_url: values.base_url,
          variables,
          headers,
          description: values.description || '',
          is_default: values.is_default || false,
        });
        message.success(t('admin.environment.updateSuccess'));
      } else {
        // 创建环境
        await api.post('/test/environments', {
          project_id: values.project_id,
          name: values.name,
          base_url: values.base_url,
          variables,
          headers,
          description: values.description || '',
          is_default: values.is_default || false,
        });
        message.success(t('admin.environment.createSuccess'));
      }
      setModalVisible(false);
      form.resetFields();
      setEditingEnv(null);
      // 更新环境列表
      fetchEnvironments(projectFilter);
    } catch (error: any) {
      if (message) {
        message.error(error.response?.data?.message || t('admin.environment.operationFailed'));
      } else {
        console.error('操作失败:', error.response?.data?.message || t('admin.environment.operationFailed'));
      }
    }
  };

  const columns = [
    {
      title: t('admin.environment.project'),
      dataIndex: 'project_name',
      key: 'project_name',
    },
    {
      title: t('admin.environment.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('admin.environment.host'),
      dataIndex: 'base_url',
      key: 'base_url',
      render: (url: string) => url || '-',
    },
    {
      title: t('admin.environment.variables'),
      dataIndex: 'variables',
      key: 'variables',
      render: (variables: any) => (
        <Tag>{variables ? Object.keys(variables).length : 0} {t('admin.environment.variablesCount')}</Tag>
      ),
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={t('admin.environment.title')}
        extra={
          <Space>
            <Select
              placeholder={t('admin.environment.filterByProject')}
              value={projectFilter}
              onChange={setProjectFilter}
              allowClear
              style={{ width: 200 }}
            >
              {projects.map((project: any) => (
                <Option key={project._id} value={project._id}>
                  {project.project_name}
                </Option>
              ))}
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
              {t('admin.environment.create')}
            </Button>
          </Space>
        }
      >
        <Table 
          columns={columns} 
          dataSource={environments || []} 
          rowKey={(record) => record._id || `${record.project_id}-${record.name}`} 
          loading={loading}
          locale={{
            emptyText: t('common.empty'),
          }}
        />
      </Card>

      <Modal
        title={editingEnv ? t('admin.environment.edit') : t('admin.environment.create')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okButtonProps={{ style: { color: '#ffffff' } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="project_id"
            label={t('admin.environment.project')}
            rules={[{ required: true, message: t('admin.environment.projectRequired') }]}
          >
            <Select disabled={!!editingEnv}>
              {projects.map((project: any) => (
                <Option key={project._id} value={project._id}>
                  {project.project_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label={t('admin.environment.name')}
            rules={[{ required: true, message: t('admin.environment.nameRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="base_url"
            label={t('admin.environment.host')}
            rules={[{ required: true, message: t('admin.environment.hostRequired') }]}
          >
            <Input placeholder="http://localhost:8080" />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <TextArea rows={2} placeholder={t('admin.environment.descriptionPlaceholder')} />
          </Form.Item>
          
          <Form.Item 
            name="variables" 
            label={
              <Space>
                <span>{t('admin.environment.variables')}</span>
                <Radio.Group 
                  size="small" 
                  value={variablesFormat} 
                  onChange={(e) => {
                    const newFormat = e.target.value;
                    const currentValue = form.getFieldValue('variables') || '';
                    
                    if (newFormat === 'keyvalue') {
                      // 从 JSON 转换为 key=value
                      try {
                        const obj = JSON.parse(currentValue || '{}');
                        form.setFieldValue('variables', objectToKeyValue(obj));
                      } catch {
                        // 如果解析失败，保持原值
                      }
                    } else {
                      // 从 key=value 转换为 JSON
                      try {
                        const obj = keyValueToObject(currentValue);
                        form.setFieldValue('variables', JSON.stringify(obj, null, 2));
                      } catch {
                        // 如果转换失败，保持原值
                      }
                    }
                    setVariablesFormat(newFormat);
                  }}
                >
                  <Radio.Button value="json">JSON</Radio.Button>
                  <Radio.Button value="keyvalue">Key=Value</Radio.Button>
                </Radio.Group>
              </Space>
            }
          >
            <TextArea 
              rows={6} 
              placeholder={
                variablesFormat === 'json' 
                  ? '{"key1": "value1", "key2": "value2"}' 
                  : 'key1=value1\nkey2=value2'
              }
            />
          </Form.Item>
          
          <Form.Item 
            name="headers" 
            label={
              <Space>
                <span>Headers</span>
                <Radio.Group 
                  size="small" 
                  value={headersFormat} 
                  onChange={(e) => {
                    const newFormat = e.target.value;
                    const currentValue = form.getFieldValue('headers') || '';
                    
                    if (newFormat === 'keyvalue') {
                      // 从 JSON 转换为 key=value
                      try {
                        const obj = JSON.parse(currentValue || '{}');
                        form.setFieldValue('headers', objectToKeyValue(obj));
                      } catch {
                        // 如果解析失败，保持原值
                      }
                    } else {
                      // 从 key=value 转换为 JSON
                      try {
                        const obj = keyValueToObject(currentValue);
                        form.setFieldValue('headers', JSON.stringify(obj, null, 2));
                      } catch {
                        // 如果转换失败，保持原值
                      }
                    }
                    setHeadersFormat(newFormat);
                  }}
                >
                  <Radio.Button value="json">JSON</Radio.Button>
                  <Radio.Button value="keyvalue">Key=Value</Radio.Button>
                </Radio.Group>
              </Space>
            }
          >
            <TextArea 
              rows={6} 
              placeholder={
                headersFormat === 'json' 
                  ? '{"Authorization": "Bearer token", "Content-Type": "application/json"}' 
                  : 'Authorization=Bearer token\nContent-Type=application/json'
              }
            />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked" label={t('admin.environment.setAsDefault')}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnvironmentManagement;

