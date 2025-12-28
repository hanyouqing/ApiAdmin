import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, message, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

const { Option } = Select;

interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.user.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/user/list');
      setUsers(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.user.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: User) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      email: record.email,
      role: record.role,
    });
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('admin.user.deleteConfirm'),
      content: t('admin.user.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete('/admin/user/del', { params: { _id: id } });
          message.success(t('admin.user.deleteSuccess'));
          fetchUsers();
        } catch (error: any) {
          message.error(error.response?.data?.message || t('admin.user.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await api.put('/admin/user/up', { _id: editingUser._id, ...values });
        message.success(t('admin.user.updateSuccess'));
      } else {
        await api.post('/admin/user/add', values);
        message.success(t('admin.user.createSuccess'));
      }
      setModalVisible(false);
      form.resetFields();
      fetchUsers();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.user.operationFailed'));
    }
  };

  const columns = [
    {
      title: t('admin.user.username'),
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: t('admin.user.email'),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: t('admin.user.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        const colorMap: Record<string, string> = {
          super_admin: 'red',
          group_leader: 'orange',
          project_leader: 'blue',
          developer: 'green',
          guest: 'default',
        };
        return <Tag color={colorMap[role]}>{t(`admin.user.role.${role}`)}</Tag>;
      },
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 200,
      render: (_: any, record: User) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          {record._id !== user?._id && (
            <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)}>
              {t('common.delete')}
            </Button>
          )}
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
        title={t('admin.user.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
            {t('admin.user.create')}
          </Button>
        }
      >
        <Table columns={columns} dataSource={users} rowKey="_id" loading={loading} />
      </Card>

      <Modal
        title={editingUser ? t('admin.user.edit') : t('admin.user.create')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label={t('admin.user.username')}
            rules={[{ required: true, message: t('admin.user.usernameRequired') }]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>
          <Form.Item
            name="email"
            label={t('admin.user.email')}
            rules={[
              { required: true, message: t('admin.user.emailRequired') },
              { type: 'email', message: t('admin.user.emailInvalid') },
            ]}
          >
            <Input disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label={t('admin.user.password')}
              rules={[{ required: true, message: t('admin.user.passwordRequired') }]}
            >
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="role" label={t('admin.user.role')} rules={[{ required: true }]}>
            <Select>
              <Option value="super_admin">{t('admin.user.role.super_admin')}</Option>
              <Option value="group_leader">{t('admin.user.role.group_leader')}</Option>
              <Option value="project_leader">{t('admin.user.role.project_leader')}</Option>
              <Option value="developer">{t('admin.user.role.developer')}</Option>
              <Option value="guest">{t('admin.user.role.guest')}</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;

