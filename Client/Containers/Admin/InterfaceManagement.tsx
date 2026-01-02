import React, { useEffect, useState, useCallback } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, App, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

const { Option } = Select;
const { TextArea } = Input;

interface Interface {
  _id: string;
  title: string;
  path: string;
  method: string;
  project_id: string | any;
  status: string;
  created_at: string;
  updated_at: string;
}

const InterfaceManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [projects, setProjects] = useState<any[]>([]);
  const [allInterfaces, setAllInterfaces] = useState<Interface[]>([]);
  const [interfaces, setInterfaces] = useState<Interface[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingInterface, setEditingInterface] = useState<Interface | null>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [projectFilter, setProjectFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const fetchProjects = async () => {
    try {
      // 如果是超级管理员，使用管理员 API 获取所有项目
      // 否则使用普通用户 API，只返回用户参与的项目
      const apiPath = user?.role === 'super_admin' ? '/admin/project/list' : '/project/list';
      const response = await api.get(apiPath);
      setProjects(response.data.data || []);
    } catch (error: any) {
      if (message) {
        message.error(error.response?.data?.message || t('admin.project.fetchFailed'));
      } else {
        console.error('获取项目列表失败:', error.response?.data?.message || t('admin.project.fetchFailed'));
      }
    }
  };

  const fetchInterfaces = useCallback(async () => {
    setLoading(true);
    try {
      // 如果是超级管理员，使用管理员 API 获取所有接口
      // 否则使用普通用户 API，只返回用户项目的接口
      const apiPath = user?.role === 'super_admin' ? '/admin/interface/list' : '/interface/list';
      const response = await api.get(apiPath);
      const data = response.data?.data || response.data || [];
      const interfacesList = Array.isArray(data) ? data : [];
      setAllInterfaces(interfacesList);
      setInterfaces(interfacesList);
    } catch (error: any) {
      console.error('获取接口列表失败:', error);
      if (message) {
        message.error(error.response?.data?.message || t('admin.interface.fetchFailed'));
      } else {
        console.error('获取接口列表失败:', error.response?.data?.message || t('admin.interface.fetchFailed'));
      }
      setAllInterfaces([]);
      setInterfaces([]);
    } finally {
      setLoading(false);
    }
  }, [message, t, user?.role]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchInterfaces();
    }
  }, [user, fetchInterfaces]);

  useEffect(() => {
    let filtered = allInterfaces;
    if (searchText) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchText.toLowerCase()) ||
          item.path.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    if (projectFilter) {
      filtered = filtered.filter((item) => {
        const projectId = typeof item.project_id === 'object' ? item.project_id._id : item.project_id;
        return projectId === projectFilter;
      });
    }
    if (statusFilter) {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }
    setInterfaces(filtered);
  }, [searchText, projectFilter, statusFilter, allInterfaces]);

  const handleCreate = () => {
    setEditingInterface(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Interface) => {
    setEditingInterface(record);
    form.setFieldsValue({
      title: record.title,
      path: record.path,
      method: record.method,
      project_id: typeof record.project_id === 'object' ? record.project_id._id : record.project_id,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('admin.interface.deleteConfirm'),
      content: t('admin.interface.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete('/interface/del', { params: { _id: id } });
          if (message) {
            message.success(t('admin.interface.deleteSuccess'));
          }
          fetchInterfaces();
        } catch (error: any) {
          if (message) {
            message.error(error.response?.data?.message || t('admin.interface.deleteFailed'));
          } else {
            console.error('删除接口失败:', error.response?.data?.message || t('admin.interface.deleteFailed'));
          }
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingInterface) {
        await api.put('/interface/up', { _id: editingInterface._id, ...values });
        if (message) {
          message.success(t('admin.interface.updateSuccess'));
        }
      } else {
        await api.post('/interface/add', values);
        if (message) {
          message.success(t('admin.interface.createSuccess'));
        }
      }
      setModalVisible(false);
      form.resetFields();
      fetchInterfaces();
    } catch (error: any) {
      if (message) {
        message.error(error.response?.data?.message || t('admin.interface.operationFailed'));
      } else {
        console.error('操作失败:', error.response?.data?.message || t('admin.interface.operationFailed'));
      }
    }
  };

  const columns = [
    {
      title: t('admin.interface.name'),
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: t('admin.interface.method'),
      dataIndex: 'method',
      key: 'method',
      render: (method: string) => {
        const colorMap: Record<string, string> = {
          GET: 'green',
          POST: 'blue',
          PUT: 'orange',
          DELETE: 'red',
          PATCH: 'purple',
        };
        return <Tag color={colorMap[method]}>{method}</Tag>;
      },
    },
    {
      title: t('admin.interface.path'),
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: t('admin.interface.project'),
      dataIndex: 'project_id',
      key: 'project_id',
      render: (project: any) => (typeof project === 'object' ? project.project_name : '-'),
    },
    {
      title: t('admin.interface.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          developing: 'orange',
          developed: 'blue',
          tested: 'green',
          online: 'purple',
        };
        return <Tag color={colorMap[status]}>{t(`interface.status.${status}`)}</Tag>;
      },
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 200,
      render: (_: any, record: Interface) => {
        const projectId = typeof record.project_id === 'object' ? record.project_id._id : record.project_id;
        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/project/${projectId}/interface`)}
            >
              {t('common.view')}
            </Button>
            <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              {t('common.edit')}
            </Button>
            <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)}>
              {t('common.delete')}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Card
        title={t('admin.interface.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
            {t('admin.interface.create')}
          </Button>
        }
      >
        <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
          <Space>
            <Input
              placeholder={t('admin.interface.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder={t('admin.interface.filterByProject')}
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
            <Select
              placeholder={t('admin.interface.filterByStatus')}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: 150 }}
            >
              <Option value="developing">{t('interface.status.developing')}</Option>
              <Option value="developed">{t('interface.status.developed')}</Option>
              <Option value="tested">{t('interface.status.tested')}</Option>
              <Option value="online">{t('interface.status.online')}</Option>
            </Select>
          </Space>
        </Space>
        <Table 
          columns={columns} 
          dataSource={interfaces || []} 
          rowKey="_id" 
          loading={loading}
          locale={{
            emptyText: t('common.empty'),
          }}
        />
      </Card>

      <Modal
        title={editingInterface ? t('admin.interface.edit') : t('admin.interface.create')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="project_id"
            label={t('admin.interface.project')}
            rules={[{ required: true, message: t('admin.interface.projectRequired') }]}
          >
            <Select placeholder={t('admin.interface.projectPlaceholder')}>
              {projects.map((project: any) => (
                <Option key={project._id} value={project._id}>
                  {project.project_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="title"
            label={t('admin.interface.name')}
            rules={[{ required: true, message: t('admin.interface.titleRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="method"
            label={t('admin.interface.method')}
            rules={[{ required: true, message: t('admin.interface.methodRequired') }]}
          >
            <Select>
              <Option value="GET">GET</Option>
              <Option value="POST">POST</Option>
              <Option value="PUT">PUT</Option>
              <Option value="DELETE">DELETE</Option>
              <Option value="PATCH">PATCH</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="path"
            label={t('admin.interface.path')}
            rules={[{ required: true, message: t('admin.interface.pathRequired') }]}
          >
            <Input placeholder="/api/example" />
          </Form.Item>
          <Form.Item name="status" label={t('admin.interface.status')}>
            <Select>
              <Option value="developing">{t('interface.status.developing')}</Option>
              <Option value="developed">{t('interface.status.developed')}</Option>
              <Option value="tested">{t('interface.status.tested')}</Option>
              <Option value="online">{t('interface.status.online')}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InterfaceManagement;

