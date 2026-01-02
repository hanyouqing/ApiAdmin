import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Select, Button, Space, Tag, App } from 'antd';
import { ExportOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

const { Option } = Select;

interface OperationLog {
  _id: string;
  type: string;
  action: string;
  targetId: string;
  targetName?: string;
  userId?: {
    _id: string;
    username: string;
  };
  username: string;
  details?: any;
  ip: string;
  userAgent?: string;
  uri?: string;
  projectId?: {
    _id: string;
    project_name: string;
  };
  createdAt: string;
}

const OperationLog: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | undefined>();
  const [selectedAction, setSelectedAction] = useState<string | undefined>();
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchLogs();
    }
  }, [user, searchText, selectedUser, selectedAction, selectedType, pagination.page, pagination.pageSize]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
      if (selectedType) params.type = selectedType;
      if (selectedUser) params.userId = selectedUser;
      if (selectedAction) params.action = selectedAction;
      
      const response = await api.get('/logs', { params });
      const data = response.data.data || {};
      setLogs(data.list || []);
      setPagination({
        ...pagination,
        total: data.pagination?.total || 0,
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.operationLog.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params: any = { format: 'csv' };
      if (selectedType) params.type = selectedType;
      if (selectedUser) params.userId = selectedUser;
      if (selectedAction) params.action = selectedAction;
      
      const response = await api.get('/logs/export', { 
        params,
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `operation-log-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success(t('admin.operationLog.exportSuccess'));
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.operationLog.exportFailed'));
    }
  };

  const columns = [
    {
      title: t('admin.operationLog.user'),
      dataIndex: 'username',
      key: 'username',
      render: (text: string, record: OperationLog) => record.userId?.username || text || '-',
    },
    {
      title: t('admin.operationLog.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: t('admin.operationLog.action'),
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => <Tag color="blue">{action}</Tag>,
    },
    {
      title: t('admin.operationLog.resource'),
      dataIndex: 'targetName',
      key: 'targetName',
      render: (text: string, record: OperationLog) => text || record.targetId || '-',
    },
    {
      title: t('admin.operationLog.uri'),
      dataIndex: 'uri',
      key: 'uri',
      render: (uri: string) => (
        <span style={{ 
          fontFamily: 'monospace', 
          fontSize: '12px',
          wordBreak: 'break-all',
          maxWidth: '300px',
          display: 'inline-block'
        }}>
          {uri || '-'}
        </span>
      ),
    },
    {
      title: t('admin.operationLog.ip'),
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: t('admin.operationLog.time'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
  ];

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  return (
    <Card
      title={t('admin.operationLog.title')}
      extra={
        <Button icon={<ExportOutlined />} onClick={handleExport}>
          {t('admin.operationLog.export')}
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder={t('admin.operationLog.filterByType')}
          value={selectedType}
          onChange={setSelectedType}
          style={{ width: 150 }}
          allowClear
        >
          <Option value="project">{t('admin.operationLog.type.project')}</Option>
          <Option value="interface">{t('admin.operationLog.type.interface')}</Option>
          <Option value="user">{t('admin.operationLog.type.user')}</Option>
          <Option value="group">{t('admin.operationLog.type.group')}</Option>
          <Option value="test">{t('admin.operationLog.type.test')}</Option>
          <Option value="mock">{t('admin.operationLog.type.mock')}</Option>
        </Select>
        <Select
          placeholder={t('admin.operationLog.filterByAction')}
          value={selectedAction}
          onChange={setSelectedAction}
          style={{ width: 150 }}
          allowClear
        >
          <Option value="create">{t('admin.operationLog.action.create')}</Option>
          <Option value="update">{t('admin.operationLog.action.update')}</Option>
          <Option value="delete">{t('admin.operationLog.action.delete')}</Option>
          <Option value="login">{t('admin.operationLog.action.login')}</Option>
          <Option value="logout">{t('admin.operationLog.action.logout')}</Option>
        </Select>
      </Space>
      <Table 
        columns={columns} 
        dataSource={logs} 
        rowKey="_id" 
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPagination({ ...pagination, page, pageSize });
          },
        }}
      />
    </Card>
  );
};

export default OperationLog;

