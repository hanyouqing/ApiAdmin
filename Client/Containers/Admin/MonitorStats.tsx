import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Spin, 
  Tree, 
  Tag, 
  Space, 
  Button, 
  Tooltip, 
  Progress,
  Empty,
  Badge,
  Typography,
  Collapse
} from 'antd';
import { 
  UserOutlined, 
  ProjectOutlined, 
  ApiOutlined, 
  ThunderboltOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;

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

interface TaskStats {
  total: number;
  passed: number;
  failed: number;
  error: number;
  running: number;
  cancelled: number;
}

interface LatestResult {
  status: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    error: number;
    skipped: number;
  };
  started_at: string;
  completed_at: string | null;
  duration: number;
}

interface Task {
  _id: string;
  name: string;
  description: string;
  enabled: boolean;
  schedule: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  base_url: string;
  createdBy: {
    username: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  latestResult: LatestResult | null;
  stats: TaskStats;
  environment: {
    name: string;
    base_url: string;
  } | null;
}

interface Project {
  _id: string;
  project_name: string;
  project_desc: string;
  group_id: {
    _id: string;
    group_name: string;
  };
  tasks: Task[];
  taskCount: number;
}

interface Group {
  _id: string;
  group_name: string;
  group_desc: string;
  projects: Project[];
  projectCount: number;
  totalTasks: number;
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

const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'passed':
      return 'success';
    case 'failed':
      return 'error';
    case 'error':
      return 'error';
    case 'running':
      return 'processing';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'passed':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'failed':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'error':
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'running':
      return <PlayCircleOutlined style={{ color: '#1890ff' }} spin />;
    case 'cancelled':
      return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    default:
      return null;
  }
};

const MonitorStats: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user.user);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [hierarchy, setHierarchy] = useState<Group[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);

  // 设置 dayjs locale
  useEffect(() => {
    const locale = i18n.language === 'zh-CN' ? 'zh-cn' : 'en';
    dayjs.locale(locale);
  }, [i18n.language]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchStats();
      fetchHierarchy();
      const interval = setInterval(() => {
        fetchStats();
        fetchHierarchy();
      }, 30000); // Refresh every 30 seconds
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

  const fetchHierarchy = async () => {
    setHierarchyLoading(true);
    try {
      const response = await api.get('/monitor/hierarchy');
      setHierarchy(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch hierarchy:', error);
    } finally {
      setHierarchyLoading(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  const renderTaskCard = (task: Task) => {
    const { latestResult, stats: taskStats, environment } = task;
    const successRate = taskStats.total > 0 
      ? ((taskStats.passed / taskStats.total) * 100).toFixed(1) 
      : '0';
    
    return (
      <Card
        key={task._id}
        size="small"
        style={{ marginBottom: 8 }}
        title={
          <Space>
            {getStatusIcon(latestResult?.status || 'default')}
            <Text strong>{task.name}</Text>
            {!task.enabled && <Tag color="default">{t('admin.monitor.disabled')}</Tag>}
            {task.schedule?.enabled && <Tag color="blue">{t('admin.monitor.scheduled')}</Tag>}
          </Space>
        }
        extra={
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/test-pipeline?taskId=${task._id}`)}
          >
            {t('admin.monitor.viewDetails')}
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {task.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {task.description}
            </Text>
          )}
          
          {environment && (
            <div>
              <EnvironmentOutlined /> {environment.name}
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {environment.base_url}
              </Text>
            </div>
          )}
          
          {task.base_url && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('admin.monitor.baseUrl')}: {task.base_url}
              </Text>
            </div>
          )}

          {latestResult && (
            <div>
              <Space>
                <Tag color={getStatusColor(latestResult.status)}>
                  {t(`admin.monitor.status.${latestResult.status}`, latestResult.status)}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {latestResult.started_at 
                    ? dayjs(latestResult.started_at).fromNow()
                    : t('admin.monitor.unknown')}
                </Text>
                {latestResult.duration > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('admin.monitor.duration')}: {formatDuration(latestResult.duration)}
                  </Text>
                )}
              </Space>
              <div style={{ marginTop: 8 }}>
                <Progress
                  percent={parseFloat(successRate)}
                  size="small"
                  status={parseFloat(successRate) === 100 ? 'success' : 'normal'}
                  format={() => `${latestResult.summary.passed}/${latestResult.summary.total}`}
                />
              </div>
            </div>
          )}

          <Row gutter={8}>
            <Col span={6}>
              <Statistic
                title={t('admin.monitor.total')}
                value={taskStats.total}
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('admin.monitor.passed')}
                value={taskStats.passed}
                valueStyle={{ fontSize: 14, color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('admin.monitor.failed')}
                value={taskStats.failed}
                valueStyle={{ fontSize: 14, color: '#ff4d4f' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={t('admin.monitor.error')}
                value={taskStats.error}
                valueStyle={{ fontSize: 14, color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </Space>
      </Card>
    );
  };

  return (
    <div>
      <Card 
        title={t('admin.monitor.title')} 
        loading={loading}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchStats();
              fetchHierarchy();
            }}
          >
            {t('common.refresh')}
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={t('admin.monitor.users')}
                value={stats?.users || 0}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={t('admin.monitor.projects')}
                value={stats?.projects || 0}
                prefix={<ProjectOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={t('admin.monitor.interfaces')}
                value={stats?.interfaces || 0}
                prefix={<ApiOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title={t('admin.monitor.mockRequests')}
                value={stats?.mockRequests || 0}
                prefix={<ThunderboltOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {stats?.system && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={24} md={stats.requests ? 16 : 24}>
              <Card title={t('admin.monitor.system')}>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={12} md={6}>
                    <Statistic 
                      title={t('admin.monitor.cpu')} 
                      value={typeof stats.system.cpu === 'number' ? stats.system.cpu : 0} 
                      suffix="%" 
                    />
                  </Col>
                  <Col xs={12} sm={12} md={6}>
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
                    />
                    {stats.system.memoryDetail && (
                      <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                        {stats.system.memoryDetail.used}MB / {stats.system.memoryDetail.total}MB
                      </div>
                    )}
                  </Col>
                  <Col xs={12} sm={12} md={6}>
                    <Statistic 
                      title={t('admin.monitor.disk')} 
                      value={typeof stats.system.disk === 'number' ? stats.system.disk : 0} 
                      suffix="%" 
                    />
                  </Col>
                  <Col xs={12} sm={12} md={6}>
                    <Statistic 
                      title={t('admin.monitor.uptime')} 
                      value={formatUptime(stats.system.uptime)} 
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
            {stats.requests && (
              <Col xs={24} sm={24} md={8}>
                <Card title={t('admin.monitor.requests')}>
                  <Row gutter={[16, 16]}>
                    <Col xs={12} sm={12} md={24}>
                      <Statistic title={t('admin.monitor.requests')} value={stats.requests.total} />
                    </Col>
                    <Col xs={12} sm={12} md={24}>
                      <Statistic title={t('admin.monitor.successRate')} value={stats.requests.total > 0 ? ((stats.requests.success / stats.requests.total) * 100).toFixed(2) : 0} suffix="%" />
                    </Col>
                    <Col xs={12} sm={12} md={24}>
                      <Statistic title={t('admin.monitor.errorRate')} value={stats.requests.total > 0 ? ((stats.requests.error / stats.requests.total) * 100).toFixed(2) : 0} suffix="%" />
                    </Col>
                    <Col xs={12} sm={12} md={24}>
                      <Statistic title={t('admin.monitor.avgResponseTime')} value={stats.requests.avgResponseTime} suffix="ms" />
                    </Col>
                  </Row>
                </Card>
              </Col>
            )}
          </Row>
        )}
      </Card>

      <Card 
        title={t('admin.monitor.pipelineMonitor')} 
        loading={hierarchyLoading}
        style={{ marginTop: 16 }}
      >
        {hierarchy.length === 0 ? (
          <Empty description={t('admin.monitor.noData')} />
        ) : (
          <Collapse 
            defaultActiveKey={hierarchy.map(g => g._id)}
            items={hierarchy.map(group => ({
              key: group._id,
              label: (
                <Space>
                  <FolderOpenOutlined />
                  <Text strong>{group.group_name}</Text>
                  <Badge count={group.projectCount} showZero style={{ backgroundColor: '#52c41a' }} />
                  <Text type="secondary">
                    ({group.totalTasks} {t('admin.monitor.testPipelines')})
                  </Text>
                </Space>
              ),
              children: group.projects.length === 0 ? (
                <Empty description={t('admin.monitor.noProjectsInGroup')} />
              ) : (
                <Collapse
                  items={group.projects.map(project => ({
                    key: project._id,
                    label: (
                      <Space>
                        <ProjectOutlined />
                        <Text strong>{project.project_name}</Text>
                        <Badge count={project.taskCount} showZero style={{ backgroundColor: '#1890ff' }} />
                      </Space>
                    ),
                    children: project.tasks.length === 0 ? (
                      <Empty description={t('admin.monitor.noPipelinesInProject')} />
                    ) : (
                      <div>
                        {project.tasks.map(task => renderTaskCard(task))}
                      </div>
                    ),
                  }))}
                />
              ),
            }))}
          />
        )}
      </Card>
    </div>
  );
};

export default MonitorStats;
