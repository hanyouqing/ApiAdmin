import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, App, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../Utils/api';
import { fetchGroups } from '../../Reducer/Modules/Group';
import type { AppDispatch, RootState } from '../../Reducer/Create';

const { Option } = Select;
const { TextArea } = Input;

interface Project {
  _id: string;
  project_name: string;
  project_desc?: string;
  group_id: string | any;
  uid: string | any;
  basepath?: string;
  icon?: string;
  color?: string;
  env: any[];
  created_at: string;
  updated_at: string;
}

const ProjectManagement: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user.user);
  const { groups } = useSelector((state: RootState) => state.group);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (user) {
      fetchProjects();
      dispatch(fetchGroups());
    }
  }, [user, dispatch]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // 如果是超级管理员，使用管理员 API 获取所有项目
      // 否则使用普通用户 API，只返回用户参与的项目
      const apiPath = user?.role === 'super_admin' ? '/admin/project/list' : '/project/list';
      const response = await api.get(apiPath);
      setProjects(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.project.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: Project) => {
    setEditingProject(record);
    form.setFieldsValue({
      project_name: record.project_name,
      project_desc: record.project_desc,
      group_id: typeof record.group_id === 'object' ? record.group_id._id : record.group_id,
      basepath: record.basepath,
      color: record.color,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('admin.project.deleteConfirm'),
      content: t('admin.project.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete('/project/del', { params: { _id: id } });
          message.success(t('admin.project.deleteSuccess'));
          fetchProjects();
        } catch (error: any) {
          message.error(error.response?.data?.message || t('admin.project.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingProject) {
        await api.put('/project/up', { _id: editingProject._id, ...values });
        message.success(t('admin.project.updateSuccess'));
      } else {
        await api.post('/project/add', values);
        message.success(t('admin.project.createSuccess'));
      }
      setModalVisible(false);
      form.resetFields();
      fetchProjects();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.project.operationFailed'));
    }
  };

  const columns = [
    {
      title: t('admin.project.name'),
      dataIndex: 'project_name',
      key: 'project_name',
    },
    {
      title: t('admin.project.group'),
      dataIndex: 'group_id',
      key: 'group_id',
      render: (group: any) => (typeof group === 'object' ? group.group_name : '-'),
    },
    {
      title: t('admin.project.owner'),
      dataIndex: 'uid',
      key: 'uid',
      render: (owner: any) => (typeof owner === 'object' ? owner.username : '-'),
    },
    {
      title: t('admin.project.envCount'),
      dataIndex: 'env',
      key: 'env',
      render: (env: any[]) => (
        <Tag icon={<EnvironmentOutlined />}>{Array.isArray(env) ? env.length : 0}</Tag>
      ),
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
      width: 250,
      render: (_: any, record: Project) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/project/${record._id}`)}>
            {t('common.view')}
          </Button>
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
        title={t('admin.project.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
            {t('admin.project.create')}
          </Button>
        }
      >
        <Table columns={columns} dataSource={projects} rowKey="_id" loading={loading} />
      </Card>

      <Modal
        title={editingProject ? t('admin.project.edit') : t('admin.project.create')}
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
            name="project_name"
            label={t('admin.project.name')}
            rules={[{ required: true, message: t('admin.project.nameRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="project_desc" label={t('common.description')}>
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="group_id"
            label={t('admin.project.group')}
            rules={[{ required: true, message: t('admin.project.groupRequired') }]}
          >
            <Select>
              {groups.map((group: any) => (
                <Option key={group._id} value={group._id}>
                  {group.group_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="basepath" label={t('admin.project.basepath')}>
            <Input placeholder="/api" />
          </Form.Item>
          <Form.Item name="color" label={t('admin.project.color')}>
            <Input type="color" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectManagement;

