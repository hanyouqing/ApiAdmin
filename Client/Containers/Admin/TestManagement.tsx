import React, { useEffect, useState } from 'react';
import { Card, Table, Space, Tag, Button, Select, DatePicker, Statistic, Row, Col, App, Tabs, Descriptions, Modal, Typography, Collapse } from 'antd';
import { PlayCircleOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface TestCollection {
  _id: string;
  name: string;
  description?: string;
  project_id: {
    _id: string;
    project_name: string;
  };
  uid: {
    _id: string;
    username: string;
    email?: string;
  };
  test_case_count: number;
  latest_result?: {
    status: string;
    run_at: string;
  };
  created_at: string;
}

interface TestResult {
  _id: string;
  collection_id: {
    _id: string;
    name: string;
    project_id: string;
  };
  test_case_id: {
    _id: string;
    name: string;
  };
  project?: {
    _id: string;
    project_name: string;
  };
  status: string;
  request: any;
  response: any;
  assertion_result?: {
    passed: boolean;
    message?: string;
    errors?: string[];
  };
  error?: {
    message: string;
    stack?: string;
  };
  duration: number;
  run_at: string;
  uid: {
    _id: string;
    username: string;
  };
}

interface TestStatistics {
  overview: {
    totalCollections: number;
    totalTestCases: number;
    totalResults: number;
    passedResults: number;
    failedResults: number;
    errorResults: number;
    passRate: string;
  };
  trend: Array<{
    _id: string;
    total: number;
    passed: number;
    failed: number;
    error: number;
  }>;
  projectStats: Array<{
    _id: string;
    project_name: string;
    collectionCount: number;
  }>;
}

const TestManagement: React.FC = () => {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const { user } = useSelector((state: RootState) => state.user);
  const [activeTab, setActiveTab] = useState('collections');
  const [collections, setCollections] = useState<TestCollection[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [statistics, setStatistics] = useState<TestStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [projects, setProjects] = useState<Array<{ _id: string; project_name: string }>>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeTab === 'collections') {
      fetchCollections();
    } else if (activeTab === 'results') {
      fetchResults();
    } else if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab, selectedProject, selectedStatus, pagination.current, pagination.pageSize]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/admin/project/list');
      setProjects(response.data.data || []);
    } catch (error: any) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/test/collections', {
        params: {
          project_id: selectedProject || undefined,
          page: pagination.current,
          pageSize: pagination.pageSize,
        },
      });
      setCollections(response.data.data.collections || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination?.total || 0,
      }));
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/test/results', {
        params: {
          project_id: selectedProject || undefined,
          status: selectedStatus || undefined,
          page: pagination.current,
          pageSize: pagination.pageSize,
        },
      });
      setResults(response.data.data.results || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination?.total || 0,
      }));
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProject) params.project_id = selectedProject;
      if (dateRange) {
        params.startDate = dateRange[0].format('YYYY-MM-DD');
        params.endDate = dateRange[1].format('YYYY-MM-DD');
      }
      const response = await api.get('/admin/test/statistics', { params });
      setStatistics(response.data.data);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRunTest = async (collectionId: string) => {
    try {
      await api.post('/test/run', { collection_id: collectionId });
      messageApi.success(t('admin.test.runSuccess'));
      if (activeTab === 'collections') {
        fetchCollections();
      } else if (activeTab === 'results') {
        fetchResults();
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.runFailed'));
    }
  };

  const handleViewResult = (result: TestResult) => {
    setSelectedResult(result);
    setResultModalVisible(true);
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      passed: { color: 'green', text: t('admin.test.result.status.passed') },
      failed: { color: 'red', text: t('admin.test.result.status.failed') },
      error: { color: 'orange', text: t('admin.test.result.status.error') },
      running: { color: 'blue', text: t('admin.test.result.status.running') },
      pending: { color: 'default', text: t('admin.test.result.status.pending') },
    };
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const collectionColumns = [
    {
      title: t('admin.test.collectionName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('admin.test.project'),
      key: 'project',
      render: (_: any, record: TestCollection) => record.project_id?.project_name || '-',
    },
    {
      title: t('admin.test.testCaseCount'),
      dataIndex: 'test_case_count',
      key: 'test_case_count',
      align: 'center' as const,
    },
    {
      title: t('admin.test.latestResult'),
      key: 'latest_result',
      render: (_: any, record: TestCollection) => {
        if (!record.latest_result) {
          return <Tag>未执行</Tag>;
        }
        return (
          <Space>
            {getStatusTag(record.latest_result.status)}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(record.latest_result.run_at).format('YYYY-MM-DD HH:mm')}
            </Text>
          </Space>
        );
      },
    },
    {
      title: t('admin.test.creator'),
      key: 'creator',
      render: (_: any, record: TestCollection) => record.uid?.username || '-',
    },
    {
      title: t('admin.test.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 120,
      render: (_: any, record: TestCollection) => (
        <Button
          type="link"
          icon={<PlayCircleOutlined />}
          onClick={() => handleRunTest(record._id)}
        >
          {t('admin.test.run')}
        </Button>
      ),
    },
  ];

  const resultColumns = [
    {
      title: t('admin.test.testCase'),
      key: 'test_case',
      render: (_: any, record: TestResult) => record.test_case_id?.name || '-',
    },
    {
      title: t('admin.test.collection'),
      key: 'collection',
      render: (_: any, record: TestResult) => record.collection_id?.name || '-',
    },
    {
      title: t('admin.test.project'),
      key: 'project',
      render: (_: any, record: TestResult) => record.project?.project_name || '-',
    },
    {
      title: t('admin.test.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: t('admin.test.duration'),
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => `${duration}ms`,
    },
    {
      title: t('admin.test.runAt'),
      dataIndex: 'run_at',
      key: 'run_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: t('admin.test.runner'),
      key: 'runner',
      render: (_: any, record: TestResult) => record.uid?.username || '-',
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 100,
      render: (_: any, record: TestResult) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewResult(record)}
        >
          {t('common.view')}
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
        title={t('admin.test.title')}
        extra={
          <Space>
            <Select
              placeholder={t('admin.test.filterByProject')}
              style={{ width: 200 }}
              allowClear
              value={selectedProject}
              onChange={setSelectedProject}
            >
              {projects.map((project) => (
                <Option key={project._id} value={project._id}>
                  {project.project_name}
                </Option>
              ))}
            </Select>
            {activeTab === 'results' && (
              <Select
                placeholder={t('admin.test.filterByStatus')}
                style={{ width: 150 }}
                allowClear
                value={selectedStatus}
                onChange={setSelectedStatus}
              >
                <Option value="passed">通过</Option>
                <Option value="failed">失败</Option>
                <Option value="error">错误</Option>
              </Select>
            )}
            {activeTab === 'statistics' && (
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              />
            )}
            <Button icon={<ReloadOutlined />} onClick={() => {
              if (activeTab === 'collections') fetchCollections();
              else if (activeTab === 'results') fetchResults();
              else if (activeTab === 'statistics') fetchStatistics();
            }}>
              {t('common.refresh')}
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'collections',
              label: t('admin.test.collections'),
              children: (
                <Table
                  columns={collectionColumns}
                  dataSource={collections}
                  rowKey="_id"
                  loading={loading}
                  pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total) => t('admin.test.total', { total }),
                  }}
                  onChange={(pagination) => {
                    setPagination(prev => ({
                      ...prev,
                      current: pagination.current || 1,
                      pageSize: pagination.pageSize || 20,
                    }));
                  }}
                />
              ),
            },
            {
              key: 'results',
              label: t('admin.test.results'),
              children: (
                <Table
                  columns={resultColumns}
                  dataSource={results}
                  rowKey="_id"
                  loading={loading}
                  pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total) => t('admin.test.total', { total }),
                  }}
                  onChange={(pagination) => {
                    setPagination(prev => ({
                      ...prev,
                      current: pagination.current || 1,
                      pageSize: pagination.pageSize || 20,
                    }));
                  }}
                />
              ),
            },
            {
              key: 'statistics',
              label: t('admin.test.statistics'),
              children: statistics ? (
                <div>
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                      <Statistic
                        title={t('admin.test.totalCollections')}
                        value={statistics.overview.totalCollections}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={t('admin.test.totalTestCases')}
                        value={statistics.overview.totalTestCases}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={t('admin.test.totalResults')}
                        value={statistics.overview.totalResults}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={t('admin.test.passRate')}
                        value={statistics.overview.passRate}
                        suffix="%"
                        valueStyle={{ color: parseFloat(statistics.overview.passRate) >= 80 ? '#3f8600' : '#cf1322' }}
                      />
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                      <Statistic
                        title={t('admin.test.passedResults')}
                        value={statistics.overview.passedResults}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title={t('admin.test.failedResults')}
                        value={statistics.overview.failedResults}
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title={t('admin.test.errorResults')}
                        value={statistics.overview.errorResults}
                        valueStyle={{ color: '#fa8c16' }}
                      />
                    </Col>
                  </Row>
                  <Card title={t('admin.test.projectStats')} style={{ marginTop: 16 }}>
                    <Table
                      dataSource={statistics.projectStats}
                      rowKey="_id"
                      pagination={false}
                      columns={[
                        {
                          title: t('admin.test.project'),
                          dataIndex: 'project_name',
                          key: 'project_name',
                        },
                        {
                          title: t('admin.test.collectionCount'),
                          dataIndex: 'collectionCount',
                          key: 'collectionCount',
                          align: 'center' as const,
                        },
                      ]}
                    />
                  </Card>
                </div>
              ) : (
                <div>{t('common.loading')}</div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={t('admin.test.resultDetail')}
        open={resultModalVisible}
        onCancel={() => {
          setResultModalVisible(false);
          setSelectedResult(null);
        }}
        footer={null}
        width={1000}
      >
        {selectedResult && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('admin.test.testCase')}>
                {selectedResult.test_case_id?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.test.collection')}>
                {selectedResult.collection_id?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.test.project')}>
                {selectedResult.project?.project_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.test.status')}>
                {getStatusTag(selectedResult.status)}
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.test.duration')}>
                {selectedResult.duration}ms
              </Descriptions.Item>
              <Descriptions.Item label={t('admin.test.runAt')}>
                {dayjs(selectedResult.run_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <Collapse>
              <Panel header={t('admin.test.request')} key="request">
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
                  {JSON.stringify(selectedResult.request, null, 2)}
                </pre>
              </Panel>
              <Panel header={t('admin.test.response')} key="response">
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
                  {JSON.stringify(selectedResult.response, null, 2)}
                </pre>
              </Panel>
              {selectedResult.assertion_result && (
                <Panel header={t('admin.test.assertionResult')} key="assertion">
                  <Descriptions column={1}>
                    <Descriptions.Item label={t('admin.test.passed')}>
                      {selectedResult.assertion_result.passed ? (
                        <Tag color="green">{t('common.yes')}</Tag>
                      ) : (
                        <Tag color="red">{t('common.no')}</Tag>
                      )}
                    </Descriptions.Item>
                    {selectedResult.assertion_result.message && (
                      <Descriptions.Item label={t('admin.test.message')}>
                        {selectedResult.assertion_result.message}
                      </Descriptions.Item>
                    )}
                    {selectedResult.assertion_result.errors && selectedResult.assertion_result.errors.length > 0 && (
                      <Descriptions.Item label={t('admin.test.errors')}>
                        <ul>
                          {selectedResult.assertion_result.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Panel>
              )}
              {selectedResult.error && (
                <Panel header={t('admin.test.error')} key="error">
                  <Paragraph>
                    <Text strong>{t('admin.test.errorMessage')}:</Text>
                    <br />
                    {selectedResult.error.message}
                  </Paragraph>
                  {selectedResult.error.stack && (
                    <Paragraph>
                      <Text strong>{t('admin.test.stackTrace')}:</Text>
                      <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
                        {selectedResult.error.stack}
                      </pre>
                    </Paragraph>
                  )}
                </Panel>
              )}
            </Collapse>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TestManagement;

