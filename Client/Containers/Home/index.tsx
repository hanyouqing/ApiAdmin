import React, { useEffect, useMemo, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  List, 
  Typography,
  Space,
  Button,
  Progress,
  Empty,
  Badge,
  Collapse,
  Tag,
  Spin,
  Divider
} from 'antd';
import { 
  ProjectOutlined, 
  FolderOutlined, 
  ApiOutlined,
  UserOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchGroups } from '../../Reducer/Modules/Group';
import { fetchProjects } from '../../Reducer/Modules/Project';
import { fetchInterfaces } from '../../Reducer/Modules/Interface';
import { api } from '../../Utils/api';
import type { AppDispatch, RootState } from '../../Reducer/Create';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

// 监控统计接口类型
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

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const user = useSelector((state: RootState) => state.user.user);
  const { groups } = useSelector((state: RootState) => state.group);
  const { projects } = useSelector((state: RootState) => state.project);
  const { interfaces } = useSelector((state: RootState) => state.interface);

  // 确保数据是数组
  const safeGroups = Array.isArray(groups) ? groups : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeInterfaces = Array.isArray(interfaces) ? interfaces : [];

  // 监控数据状态（仅超级管理员）
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorStats, setMonitorStats] = useState<MonitorStats | null>(null);
  const [hierarchy, setHierarchy] = useState<Group[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';

  // 设置 dayjs locale
  useEffect(() => {
    const locale = i18n.language === 'zh-CN' ? 'zh-cn' : 'en';
    dayjs.locale(locale);
  }, [i18n.language]);

  // 加载基础数据
  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchProjects());
  }, [dispatch]);

  useEffect(() => {
    // 获取所有项目的接口数量
    if (safeProjects.length > 0) {
      const projectIds = safeProjects.map((p) => p._id);
      projectIds.forEach((projectId) => {
        dispatch(fetchInterfaces(projectId)).catch(() => {
          // 静默处理错误
        });
      });
    }
  }, [dispatch, safeProjects]);

  // 加载监控数据（仅超级管理员）
  useEffect(() => {
    if (isSuperAdmin) {
      fetchMonitorStats();
      fetchHierarchy();
      const interval = setInterval(() => {
        fetchMonitorStats();
        fetchHierarchy();
      }, 30000); // 每30秒刷新
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin]);

  const fetchMonitorStats = async () => {
    setMonitorLoading(true);
    try {
      const response = await api.get('/monitor/stats');
      setMonitorStats(response.data.data || {});
    } catch (error: any) {
      // 忽略端点不存在的情况
    } finally {
      setMonitorLoading(false);
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

  // 计算接口总数
  const totalInterfaceCount = useMemo(() => {
    return safeInterfaces.length;
  }, [safeInterfaces]);

  // 渲染测试任务卡片
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
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>{t('home.welcome')}</Title>
        {isSuperAdmin && (
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchMonitorStats();
              fetchHierarchy();
            }}
            loading={monitorLoading || hierarchyLoading}
          >
            {t('common.refresh')}
          </Button>
        )}
      </div>

      {/* 基础统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={isSuperAdmin ? 6 : 8}>
          <Card>
            <Statistic
              title={t('home.groupCount')}
              value={safeGroups.length}
              prefix={<FolderOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={isSuperAdmin ? 6 : 8}>
          <Card>
            <Statistic
              title={t('home.projectCount')}
              value={safeProjects.length}
              prefix={<ProjectOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={isSuperAdmin ? 6 : 8}>
          <Card>
            <Statistic
              title={t('home.interfaceCount')}
              value={totalInterfaceCount}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
        {isSuperAdmin && monitorStats && (
          <>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('admin.monitor.users')}
                  value={monitorStats.users || 0}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            {monitorStats.mockRequests !== undefined && (
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic
                    title={t('admin.monitor.mockRequests')}
                    value={monitorStats.mockRequests || 0}
                    prefix={<ThunderboltOutlined />}
                  />
                </Card>
              </Col>
            )}
          </>
        )}
      </Row>

      {/* 系统监控（仅超级管理员） */}
      {isSuperAdmin && monitorStats?.system && (
        <Card 
          title={t('admin.monitor.system')}
          loading={monitorLoading}
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={12} md={6}>
              <Statistic 
                title={t('admin.monitor.cpu')} 
                value={typeof monitorStats.system.cpu === 'number' ? monitorStats.system.cpu : 0} 
                suffix="%" 
              />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic 
                title={t('admin.monitor.memory')} 
                value={
                  typeof monitorStats.system.memory === 'number' 
                    ? monitorStats.system.memory 
                    : (monitorStats.system.memoryDetail 
                        ? Math.round((monitorStats.system.memoryDetail.used / monitorStats.system.memoryDetail.total) * 100)
                        : 0)
                } 
                suffix="%" 
              />
              {monitorStats.system.memoryDetail && (
                <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                  {monitorStats.system.memoryDetail.used}MB / {monitorStats.system.memoryDetail.total}MB
                </div>
              )}
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic 
                title={t('admin.monitor.disk')} 
                value={typeof monitorStats.system.disk === 'number' ? monitorStats.system.disk : 0} 
                suffix="%" 
              />
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Statistic 
                title={t('admin.monitor.uptime')} 
                value={formatUptime(monitorStats.system.uptime)} 
              />
            </Col>
          </Row>

          {/* 请求统计 */}
          {monitorStats.requests && (
            <>
              <Divider />
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={12} md={6}>
                  <Statistic 
                    title={t('admin.monitor.requests')} 
                    value={monitorStats.requests.total} 
                  />
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Statistic 
                    title={t('admin.monitor.successRate')} 
                    value={monitorStats.requests.total > 0 ? ((monitorStats.requests.success / monitorStats.requests.total) * 100).toFixed(2) : 0} 
                    suffix="%" 
                  />
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Statistic 
                    title={t('admin.monitor.errorRate')} 
                    value={monitorStats.requests.total > 0 ? ((monitorStats.requests.error / monitorStats.requests.total) * 100).toFixed(2) : 0} 
                    suffix="%" 
                  />
                </Col>
                <Col xs={12} sm={12} md={6}>
                  <Statistic 
                    title={t('admin.monitor.avgResponseTime')} 
                    value={monitorStats.requests.avgResponseTime} 
                    suffix="ms" 
                  />
                </Col>
              </Row>
            </>
          )}
        </Card>
      )}

      {/* 最近项目和分组 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={t('home.recentProjects')} 
            extra={<a onClick={() => navigate('/project')}>{t('common.viewAll')}</a>}
          >
            <List
              dataSource={safeProjects.slice(0, 5)}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/project/${item._id}`)}
                >
                  <List.Item.Meta
                    title={item.project_name}
                    description={item.project_desc}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={t('home.recentGroups')} 
            extra={<a onClick={() => navigate('/group')}>{t('common.viewAll')}</a>}
          >
            <List
              dataSource={safeGroups.slice(0, 5)}
              renderItem={(item) => (
                <List.Item
                  key={item._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/group/${item._id}`)}
                >
                  <List.Item.Meta
                    title={item.group_name}
                    description={item.group_desc}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 测试流水线（仅超级管理员） */}
      {isSuperAdmin && (
        <Card 
          title={t('admin.monitor.pipelineMonitor')} 
          loading={hierarchyLoading}
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
      )}
    </div>
  );
};

export default Home;
