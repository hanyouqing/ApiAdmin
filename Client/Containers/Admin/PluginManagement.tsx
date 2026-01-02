import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Tag, Switch, App } from 'antd';
import { PlusOutlined, DeleteOutlined, SettingOutlined, ReloadOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

interface Plugin {
  _id: string;
  name: string;
  displayName?: string;
  version: string;
  author: string;
  enabled: boolean;
  description?: string;
  category?: string;
  installed?: boolean;
}

const PluginManagement: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchPlugins();
    }
  }, [user]);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const response = await api.get('/plugins');
      setPlugins(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.plugin.operationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (id: string, enabled: boolean) => {
    try {
      await api.patch(`/plugins/${id}/enable`, { enabled });
      message.success(enabled ? t('admin.plugin.enableSuccess') : t('admin.plugin.disableSuccess'));
      fetchPlugins();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.plugin.operationFailed'));
    }
  };

  const handleUninstall = (id: string) => {
    Modal.confirm({
      title: t('admin.plugin.uninstall'),
      content: t('admin.plugin.uninstallConfirm'),
      onOk: async () => {
        try {
          await api.delete(`/plugins/${id}`);
          message.success(t('admin.plugin.uninstallSuccess'));
          fetchPlugins();
        } catch (error: any) {
          message.error(error.response?.data?.message || t('admin.plugin.operationFailed'));
        }
      },
    });
  };

  const columns = [
    {
      title: t('admin.plugin.name'),
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string, record: Plugin) => text || record.name,
    },
    {
      title: t('admin.plugin.version'),
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: t('admin.plugin.author'),
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: t('admin.plugin.category'),
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => category ? <Tag>{category}</Tag> : '-',
    },
    {
      title: t('admin.plugin.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: Plugin) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleEnable(record._id, checked)}
        />
      ),
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 200,
      render: (_: any, record: Plugin) => (
        <Space>
          <Button type="link" icon={<SettingOutlined />}>
            {t('admin.plugin.configure')}
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleUninstall(record._id)}>
            {t('admin.plugin.uninstall')}
          </Button>
        </Space>
      ),
    },
  ];

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  return (
    <Card
      title={t('admin.plugin.title')}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPlugins}>
            {t('common.refresh')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} style={{ color: '#ffffff' }}>
            {t('admin.plugin.install')}
          </Button>
        </Space>
      }
    >
      <Table columns={columns} dataSource={plugins} rowKey="_id" loading={loading} />
    </Card>
  );
};

export default PluginManagement;

