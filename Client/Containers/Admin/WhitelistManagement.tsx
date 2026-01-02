import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, Switch, App } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

const { Option } = Select;

interface WhitelistEntry {
  _id: string;
  platform: 'github' | 'gitlab' | 'gmail' | 'wechat' | 'phone' | 'email';
  value: string;
  description?: string;
  enabled?: boolean;
  createdAt: string;
}

const WhitelistManagement: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchWhitelist();
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/whitelist/config');
      setEnabled(response.data.data?.enabled || false);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.whitelist.fetchFailed') || '获取配置失败');
    }
  };

  const fetchWhitelist = async () => {
    setLoading(true);
    try {
      const response = await api.get('/whitelist/entries');
      const data = response.data.data || {};
      // 后端返回的是 { list: [], pagination: {} } 格式
      setEntries(data.list || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.whitelist.fetchFailed') || '获取白名单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableChange = async (checked: boolean) => {
    try {
      await api.put('/whitelist/config', { enabled: checked });
      setEnabled(checked);
      message.success(t('admin.whitelist.updateSuccess') || '配置更新成功');
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.whitelist.operationFailed') || '配置更新失败');
    }
  };

  const handleAdd = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('admin.whitelist.deleteConfirm'),
      content: t('admin.whitelist.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete(`/whitelist/entries/${id}`);
          message.success(t('admin.whitelist.deleteSuccess') || '删除成功');
          fetchWhitelist();
        } catch (error: any) {
          message.error(error.response?.data?.message || t('admin.whitelist.operationFailed') || '删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // 后端期望的字段名是 platform，不是 type
      await api.post('/whitelist/entries', {
        platform: values.type,
        value: values.value,
        description: values.description || '',
      });
      message.success(t('admin.whitelist.createSuccess') || '添加成功');
      setModalVisible(false);
      form.resetFields();
      fetchWhitelist();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.whitelist.operationFailed') || '添加失败');
    }
  };

  const columns = [
    {
      title: t('admin.whitelist.type'),
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => {
        const typeMap: Record<string, string> = {
          github: t('admin.whitelist.type.github') || 'GitHub',
          gitlab: t('admin.whitelist.type.gitlab') || 'GitLab',
          gmail: t('admin.whitelist.type.gmail') || 'Gmail',
          wechat: t('admin.whitelist.type.wechat') || '微信',
          phone: t('admin.whitelist.type.phone') || '手机号',
          email: t('admin.whitelist.type.email') || '邮箱',
        };
        return <Tag>{typeMap[platform] || platform}</Tag>;
      },
    },
    {
      title: t('admin.whitelist.value'),
      dataIndex: 'value',
      key: 'value',
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
      width: 150,
      render: (_: any, record: WhitelistEntry) => (
        <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)}>
          {t('common.delete')}
        </Button>
      ),
    },
  ];

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  return (
    <div>
      <Card
        title={t('admin.whitelist.title')}
        extra={
          <Space>
            <span>{t('admin.whitelist.enable')}</span>
            <Switch checked={enabled} onChange={handleEnableChange} />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ color: '#ffffff' }}>
              {t('admin.whitelist.add')}
            </Button>
          </Space>
        }
      >
        <Table columns={columns} dataSource={entries} rowKey="_id" loading={loading} />
      </Card>

      <Modal
        title={t('admin.whitelist.add')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label={t('admin.whitelist.type')} rules={[{ required: true }]}>
            <Select placeholder={t('admin.whitelist.type')}>
              <Option value="github">{t('admin.whitelist.type.github') || 'GitHub'}</Option>
              <Option value="gitlab">{t('admin.whitelist.type.gitlab') || 'GitLab'}</Option>
              <Option value="gmail">{t('admin.whitelist.type.gmail') || 'Gmail'}</Option>
              <Option value="wechat">{t('admin.whitelist.type.wechat') || '微信'}</Option>
              <Option value="phone">{t('admin.whitelist.type.phone') || '手机号'}</Option>
              <Option value="email">{t('admin.whitelist.type.email') || '邮箱'}</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="value"
            label={t('admin.whitelist.value')}
            rules={[{ required: true, message: t('admin.whitelist.valueRequired') }]}
          >
            <Input placeholder={t('admin.whitelist.valuePlaceholder')} />
          </Form.Item>
          <Form.Item name="description" label={t('admin.whitelist.description')}>
            <Input.TextArea rows={2} placeholder={t('admin.whitelist.descriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WhitelistManagement;

