import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchProjects, createProject, deleteProject, updateProject } from '../../Reducer/Modules/Project';
import { fetchGroups } from '../../Reducer/Modules/Group';
import { api } from '../../Utils/api';
import type { AppDispatch, RootState } from '../../Reducer/Create';

const ProjectList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { projects, loading } = useSelector((state: RootState) => state.project);
  const { groups } = useSelector((state: RootState) => state.group);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  useEffect(() => {
    dispatch(fetchProjects());
    dispatch(fetchGroups());
  }, [dispatch]);

  const handleCreate = () => {
    setEditingProject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
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
      title: t('project.deleteConfirm'),
      content: t('project.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete('/project/del', { params: { _id: id } });
          message.success(t('project.deleteSuccess'));
          dispatch(fetchProjects());
        } catch (error: any) {
          message.error(error.response?.data?.message || t('project.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingProject) {
        await api.put('/project/up', { _id: editingProject._id, ...values });
        message.success(t('project.updateSuccess'));
      } else {
        await dispatch(createProject(values)).unwrap();
        message.success(t('project.createSuccess'));
      }
      setModalVisible(false);
      form.resetFields();
      setEditingProject(null);
      dispatch(fetchProjects());
    } catch (error: any) {
      message.error(error.response?.data?.message || error.message || t('message.operationFailed'));
    }
  };

  const columns = [
    {
      title: t('project.projectName'),
      dataIndex: 'project_name',
      key: 'project_name',
      render: (text: string, record: any) => (
        <Space>
          {record.color && (
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: record.color,
                verticalAlign: 'middle',
              }}
            />
          )}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: t('common.description'),
      dataIndex: 'project_desc',
      key: 'project_desc',
      render: (desc: string) => desc || '-',
    },
    {
      title: t('project.group'),
      dataIndex: 'group_id',
      key: 'group_id',
      render: (group: any) => (typeof group === 'object' ? group.group_name : '-'),
    },
    {
      title: t('admin.project.envCount'),
      key: 'env_count',
      render: (_: any, record: any) => (
        <Tag color="blue" icon={<EnvironmentOutlined />}>
          {Array.isArray(record.env) ? record.env.length : 0} {t('admin.project.envUnit') || '环境'}
        </Tag>
      ),
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 250,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/project/${record._id}`)}
          >
            {t('common.view')}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={t('project.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
            {t('project.create')}
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={projects || []}
          rowKey="_id"
          loading={loading}
          locale={{
            emptyText: t('common.empty'),
          }}
        />
      </Card>

      <Modal
        title={editingProject ? t('project.edit') : t('project.create')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setEditingProject(null);
        }}
        width={600}
        okButtonProps={{ style: { color: '#ffffff' } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="group_id"
            label={t('project.group')}
            rules={[{ required: true, message: t('project.groupRequired') }]}
          >
            <Select placeholder={t('project.groupPlaceholder')} disabled={!!editingProject}>
              {groups.map((group) => (
                <Select.Option key={group._id} value={group._id}>
                  {group.group_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="project_name"
            label={t('project.projectName')}
            rules={[{ required: true, message: t('project.nameRequired') }]}
          >
            <Input placeholder={t('project.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="project_desc" label={t('common.description')}>
            <Input.TextArea placeholder={t('project.descPlaceholder')} rows={4} />
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

export default ProjectList;

