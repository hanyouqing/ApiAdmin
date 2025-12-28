import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import { UserOutlined, ProjectOutlined, ApiOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

interface MonitorStats {
  users: number;
  projects: number;
  interfaces: number;
  mockRequests: number;
  system?: {
    cpu: number;
    memory: number | { used: number; total: number; free?: number; heapUsed?: number; heapTotal?: number; external?: number };
    disk: number;
    uptime: number;
    memoryDetail?: {
      used: number;
      total: number;
      free: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  };
  requests?: {
    total: number;
    success: number;
    error: number;
    avgResponseTime: number;
  };
}

const formatUptime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  }
};

const MonitorStats: React.FC = () => {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.user.user);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MonitorStats | null>(null);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchStats();
      const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await api.get('/monitor/stats');
      setStats(response.data.data || {});
    } catch (error: any) {
      // Ignore if endpoint doesn't exist yet
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  if (!stats) {
    return <Spin />;
  }

  return (
    <div>
      <Card title={t('admin.monitor.title')} loading={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={t('admin.monitor.users')}
                value={stats.users || 0}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={t('admin.monitor.projects')}
                value={stats.projects || 0}
                prefix={<ProjectOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={t('admin.monitor.interfaces')}
                value={stats.interfaces || 0}
                prefix={<ApiOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={t('admin.monitor.mockRequests')}
                value={stats.mockRequests || 0}
                prefix={<ThunderboltOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {stats.system && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Card title={t('admin.monitor.system')}>
                <Statistic 
                  title={t('admin.monitor.cpu')} 
                  value={typeof stats.system.cpu === 'number' ? stats.system.cpu : 0} 
                  suffix="%" 
                />
                <Statistic 
                  title={t('admin.monitor.memory')} 
                  value={
                    typeof stats.system.memory === 'number' 
                      ? stats.system.memory 
                      : (stats.system.memoryDetail 
                          ? Math.round((stats.system.memoryDetail.used / stats.system.memoryDetail.total) * 100)
                          : 0)
                  } 
                  suffix="%" 
                  style={{ marginTop: 16 }} 
                />
                {stats.system.memoryDetail && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                    {stats.system.memoryDetail.used}MB / {stats.system.memoryDetail.total}MB
                  </div>
                )}
                <Statistic 
                  title={t('admin.monitor.disk')} 
                  value={typeof stats.system.disk === 'number' ? stats.system.disk : 0} 
                  suffix="%" 
                  style={{ marginTop: 16 }} 
                />
                <Statistic 
                  title={t('admin.monitor.uptime')} 
                  value={formatUptime(stats.system.uptime)} 
                  style={{ marginTop: 16 }} 
                />
              </Card>
            </Col>
            {stats.requests && (
              <Col xs={24} sm={12} md={8}>
                <Card title={t('admin.monitor.requests')}>
                  <Statistic title={t('admin.monitor.requests')} value={stats.requests.total} />
                  <Statistic title={t('admin.monitor.successRate')} value={stats.requests.total > 0 ? ((stats.requests.success / stats.requests.total) * 100).toFixed(2) : 0} suffix="%" style={{ marginTop: 16 }} />
                  <Statistic title={t('admin.monitor.errorRate')} value={stats.requests.total > 0 ? ((stats.requests.error / stats.requests.total) * 100).toFixed(2) : 0} suffix="%" style={{ marginTop: 16 }} />
                  <Statistic title={t('admin.monitor.avgResponseTime')} value={stats.requests.avgResponseTime} suffix="ms" style={{ marginTop: 16 }} />
                </Card>
              </Col>
            )}
          </Row>
        )}
      </Card>
    </div>
  );
};

export default MonitorStats;

