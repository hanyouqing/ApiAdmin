import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Tag, Switch, App } from 'antd';
import { PlusOutlined, DeleteOutlined, SettingOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
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
      message.error(error.response?.data?.message || t('admin.plugin.operationFailed') || '获取插件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (id: string, enabled: boolean) => {
    try {
      await api.patch(`/plugins/${id}/enable`, { enabled });
      message.success(enabled ? (t('admin.plugin.enableSuccess') || '插件已启用') : (t('admin.plugin.disableSuccess') || '插件已禁用'));
      fetchPlugins();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.plugin.operationFailed') || '操作失败');
    }
  };

  const handleUninstall = (id: string) => {
    Modal.confirm({
      title: t('admin.plugin.uninstall') || '卸载插件',
      content: t('admin.plugin.uninstallConfirm') || '确定要卸载此插件吗？',
      onOk: async () => {
        try {
          await api.delete(`/plugins/${id}`);
          message.success(t('admin.plugin.uninstallSuccess') || '插件卸载成功');
          fetchPlugins();
        } catch (error: any) {
          message.error(error.response?.data?.message || t('admin.plugin.operationFailed') || '卸载失败');
        }
      },
    });
  };

  const handleInstallDefault = () => {
    Modal.confirm({
      title: t('admin.plugin.installDefault') || '安装默认插件',
      content: t('admin.plugin.installDefaultConfirm') || '确定要安装默认插件吗？这将安装系统推荐的插件。',
      onOk: async () => {
        try {
          const response = await api.post('/plugins/install/default');
          const data = response.data.data || {};
          const installedCount = data.installed?.length || 0;
          const skippedCount = data.skipped?.length || 0;
          
          if (installedCount > 0) {
            message.success(t('admin.plugin.installDefaultSuccess') || `成功安装 ${installedCount} 个默认插件`);
          } else if (skippedCount > 0) {
            message.info(t('admin.plugin.installDefaultSkipped') || '所有默认插件已安装');
          } else {
            message.warning(t('admin.plugin.installDefaultNoPlugins') || '没有可安装的默认插件');
          }
          fetchPlugins();
        } catch (error: any) {
          message.error(error.response?.data?.message || t('admin.plugin.operationFailed') || '安装默认插件失败');
        }
      },
    });
  };

  const columns = [
    {
      title: t('admin.plugin.name') || '插件名称',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text: string, record: Plugin) => text || record.name,
    },
    {
      title: t('admin.plugin.version') || '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: t('admin.plugin.author') || '作者',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: t('admin.plugin.category') || '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => category ? <Tag>{category}</Tag> : '-',
    },
    {
      title: t('admin.plugin.status') || '状态',
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
      title: t('common.operation') || '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Plugin) => (
        <Space>
          <Button type="link" icon={<SettingOutlined />}>
            {t('admin.plugin.configure') || '配置'}
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleUninstall(record._id)}>
            {t('admin.plugin.uninstall') || '卸载'}
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
          <Button icon={<DownloadOutlined />} onClick={handleInstallDefault}>
            {t('admin.plugin.installDefault') || '安装默认插件'}
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

