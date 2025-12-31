import React, { useEffect, useState } from 'react';
import { Card, Table, Input, Select, Button, Space, Tag, App, DatePicker, Row, Col, Statistic } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface LoginLog {
  _id: string;
  userId?: {
    _id: string;
    username: string;
    email: string;
  };
  username: string;
  email: string;
  loginType: string;
  provider?: string;
  status: 'success' | 'failed';
  failureReason?: string;
  ip: string;
  userAgent?: string;
  location?: string;
  createdAt: string;
}

interface Statistics {
  total: number;
  success: number;
  failed: number;
  successRate: string;
  loginTypeStats: Array<{ type: string; count: number }>;
  dailyStats: Array<{ date: string; total: number; success: number; failed: number }>;
}

const LoginLogManagement: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [selectedLoginType, setSelectedLoginType] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchLogs();
      fetchStatistics();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchLogs();
    }
  }, [pagination.page, pagination.pageSize, selectedStatus, selectedLoginType, dateRange]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
      if (selectedStatus) params.status = selectedStatus;
      if (selectedLoginType) params.loginType = selectedLoginType;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString();
        params.endDate = dateRange[1].endOf('day').toISOString();
      }
      
      const response = await api.get('/login-logs', { params });
      const data = response.data.data || {};
      setLogs(data.list || []);
      setPagination({
        ...pagination,
        total: data.pagination?.total || 0,
      });
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.loginLog.fetchFailed') || '获取登录日志失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params: any = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].startOf('day').toISOString();
        params.endDate = dateRange[1].endOf('day').toISOString();
      }
      
      const response = await api.get('/login-logs/statistics', { params });
      setStatistics(response.data.data || null);
    } catch (error: any) {
      // 静默失败，不影响主功能
      console.error('Failed to fetch statistics:', error);
    }
  };

  const getLoginTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      password: t('admin.loginLog.type.password') || '密码登录',
      phone: t('admin.loginLog.type.phone') || '手机登录',
      email: t('admin.loginLog.type.email') || '邮箱登录',
      sso: t('admin.loginLog.type.sso') || 'SSO登录',
      github: 'GitHub',
      gitlab: 'GitLab',
      gmail: 'Gmail',
      wechat: t('admin.loginLog.type.wechat') || '微信',
      other: t('admin.loginLog.type.other') || '其他',
    };
    return labels[type] || type;
  };

  const columns = [
    {
      title: t('admin.loginLog.user') || '用户',
      key: 'user',
      render: (_: any, record: LoginLog) => (
        <div>
          <div>{record.userId?.username || record.username || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.userId?.email || record.email || '-'}</div>
        </div>
      ),
    },
    {
      title: t('admin.loginLog.loginType') || '登录方式',
      dataIndex: 'loginType',
      key: 'loginType',
      render: (type: string, record: LoginLog) => (
        <div>
          <Tag>{getLoginTypeLabel(type)}</Tag>
          {record.provider && <Tag color="blue">{record.provider}</Tag>}
        </div>
      ),
    },
    {
      title: t('admin.loginLog.status') || '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: LoginLog) => (
        <div>
          <Tag color={status === 'success' ? 'green' : 'red'}>
            {status === 'success' ? (t('admin.loginLog.status.success') || '成功') : (t('admin.loginLog.status.failed') || '失败')}
          </Tag>
          {status === 'failed' && record.failureReason && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{record.failureReason}</div>
          )}
        </div>
      ),
    },
    {
      title: t('admin.loginLog.ip') || 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: t('admin.loginLog.location') || '位置',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => location || '-',
    },
    {
      title: t('admin.loginLog.time') || '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
  ];

  const filteredLogs = logs.filter((log) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      (log.userId?.username || log.username || '').toLowerCase().includes(searchLower) ||
      (log.userId?.email || log.email || '').toLowerCase().includes(searchLower) ||
      log.ip.toLowerCase().includes(searchLower)
    );
  });

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  return (
    <div>
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('admin.loginLog.statistics.total') || '总登录次数'}
                value={statistics.total}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('admin.loginLog.statistics.success') || '成功登录'}
                value={statistics.success}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('admin.loginLog.statistics.failed') || '失败登录'}
                value={statistics.failed}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title={t('admin.loginLog.statistics.successRate') || '成功率'}
                value={statistics.successRate}
                suffix="%"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title={t('admin.loginLog.title') || '登录日志'}
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => { fetchLogs(); fetchStatistics(); }}>
            {t('common.refresh') || '刷新'}
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder={t('admin.loginLog.searchPlaceholder') || '搜索用户名、邮箱或IP'}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder={t('admin.loginLog.filterByStatus') || '状态'}
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="success">{t('admin.loginLog.status.success') || '成功'}</Option>
            <Option value="failed">{t('admin.loginLog.status.failed') || '失败'}</Option>
          </Select>
          <Select
            placeholder={t('admin.loginLog.filterByLoginType') || '登录方式'}
            value={selectedLoginType}
            onChange={setSelectedLoginType}
            style={{ width: 150 }}
            allowClear
          >
            <Option value="password">{t('admin.loginLog.type.password') || '密码登录'}</Option>
            <Option value="phone">{t('admin.loginLog.type.phone') || '手机登录'}</Option>
            <Option value="email">{t('admin.loginLog.type.email') || '邮箱登录'}</Option>
            <Option value="sso">{t('admin.loginLog.type.sso') || 'SSO登录'}</Option>
            <Option value="github">GitHub</Option>
            <Option value="gitlab">GitLab</Option>
            <Option value="gmail">Gmail</Option>
            <Option value="wechat">{t('admin.loginLog.type.wechat') || '微信'}</Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
            format="YYYY-MM-DD"
          />
        </Space>
        <Table 
          columns={columns} 
          dataSource={filteredLogs} 
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
    </div>
  );
};

export default LoginLogManagement;


