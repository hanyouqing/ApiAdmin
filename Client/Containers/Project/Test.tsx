import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, message, Switch, InputNumber, Tabs, Descriptions, Typography, Collapse } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '../../Utils/api';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchTestCollections,
  createTestCollection,
  updateTestCollection,
  deleteTestCollection,
  fetchTestCollection,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  runTest,
  fetchTestHistory,
} from '../../Reducer/Modules/Test';
import { fetchInterfaces } from '../../Reducer/Modules/Interface';
import type { AppDispatch, RootState } from '../../Reducer/Create';
import type { TestCollection, TestCase } from '../../Reducer/Modules/Test';
import TestRules from './TestRules';

const { TextArea } = Input;
const { Option } = Select;

const TestManagement: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { currentProject } = useSelector((state: RootState) => state.project);
  
  // 从路由路径中提取 projectId，或从 Redux store 获取
  const projectId = useMemo(() => {
    if (params.projectId) {
      return params.projectId;
    }
    // 从 URL 路径中提取：/project/:projectId/test
    const pathMatch = location.pathname.match(/\/project\/([^/]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    // 最后从 Redux store 获取
    return currentProject?._id || '';
  }, [params.projectId, location.pathname, currentProject?._id]);
  const { t } = useTranslation();
  const { collections, currentCollection, testCases, testResults, loading } = useSelector(
    (state: RootState) => state.test
  );
  const { interfaces } = useSelector((state: RootState) => state.interface);
  const [form] = Form.useForm();
  const [caseForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [caseModalVisible, setCaseModalVisible] = useState(false);
  const [editingCollection, setEditingCollection] = useState<TestCollection | null>(null);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [running, setRunning] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  useEffect(() => {
    if (projectId && projectId !== 'test' && projectId !== 'interface' && projectId !== 'setting' && projectId !== 'activity') {
      dispatch(fetchTestCollections(projectId));
      dispatch(fetchInterfaces(projectId));
    }
  }, [dispatch, projectId]);

  const handleCreate = () => {
    setEditingCollection(null);
    form.resetFields();
    form.setFieldsValue({ project_id: projectId });
    setModalVisible(true);
  };

  const handleEdit = (record: TestCollection) => {
    setEditingCollection(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('test.deleteConfirm'),
      content: t('test.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await dispatch(deleteTestCollection(id)).unwrap();
          message.success(t('test.deleteSuccess'));
        } catch (error: any) {
          message.error(error.message || t('message.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCollection) {
        await dispatch(updateTestCollection({ id: editingCollection._id, data: values })).unwrap();
        message.success(t('test.updateSuccess'));
      } else {
        await dispatch(createTestCollection(values)).unwrap();
        message.success(t('test.createSuccess'));
      }
      setModalVisible(false);
      form.resetFields();
      if (projectId) {
        dispatch(fetchTestCollections(projectId));
      }
    } catch (error: any) {
      message.error(error.message || t('message.operationFailed'));
    }
  };

  const handleViewCollection = async (id: string) => {
    await dispatch(fetchTestCollection(id));
    await dispatch(fetchTestHistory(id));
  };

  const handleCreateCase = () => {
    if (!currentCollection) return;
    setEditingCase(null);
    caseForm.resetFields();
    caseForm.setFieldsValue({
      collection_id: currentCollection._id,
      enabled: true,
      order: 0,
      request: {
        method: 'GET',
        query: {},
        body: {},
        headers: {},
        path_params: {},
      },
    });
    setCaseModalVisible(true);
  };

  const handleEditCase = (record: TestCase) => {
    setEditingCase(record);
    caseForm.setFieldsValue(record);
    setCaseModalVisible(true);
  };

  const handleDeleteCase = (id: string) => {
    Modal.confirm({
      title: t('test.case.deleteConfirm'),
      content: t('test.case.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await dispatch(deleteTestCase(id)).unwrap();
          message.success(t('test.case.deleteSuccess'));
          if (currentCollection) {
            dispatch(fetchTestCollection(currentCollection._id));
          }
        } catch (error: any) {
          message.error(error.message || t('message.deleteFailed'));
        }
      },
    });
  };

  const handleSubmitCase = async () => {
    try {
      const values = await caseForm.validateFields();
      
      // Parse JSON strings to objects
      const request: any = { ...values.request };
      if (typeof request.query === 'string') {
        try {
          request.query = JSON.parse(request.query);
        } catch {
          request.query = {};
        }
      }
      if (typeof request.body === 'string') {
        try {
          request.body = JSON.parse(request.body);
        } catch {
          request.body = {};
        }
      }
      if (typeof request.headers === 'string') {
        try {
          request.headers = JSON.parse(request.headers);
        } catch {
          request.headers = {};
        }
      }

      const data = { ...values, request };
      
      if (editingCase) {
        await dispatch(updateTestCase({ id: editingCase._id, data })).unwrap();
        message.success(t('test.case.updateSuccess'));
      } else {
        await dispatch(createTestCase(data)).unwrap();
        message.success(t('test.case.createSuccess'));
      }
      setCaseModalVisible(false);
      caseForm.resetFields();
      if (currentCollection) {
        dispatch(fetchTestCollection(currentCollection._id));
      }
    } catch (error: any) {
      message.error(error.message || t('message.operationFailed'));
    }
  };

  const handleRunTest = async () => {
    if (!currentCollection) return;
    setRunning(true);
    try {
      const result = await dispatch(runTest(currentCollection._id)).unwrap();
      message.success(t('test.runSuccess'));
      dispatch(fetchTestHistory(currentCollection._id));
      // 自动显示测试结果
      if (result) {
        setSelectedResult(result);
        setResultModalVisible(true);
      }
    } catch (error: any) {
      message.error(error.message || t('test.runFailed'));
    } finally {
      setRunning(false);
    }
  };

  const handleExportReport = (result: any) => {
    try {
      const report = {
        collection: currentCollection?.name,
        status: result.status,
        duration: result.duration,
        createdAt: result.created_at,
        results: result.results || [],
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-report-${result._id}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success(t('test.exportSuccess'));
    } catch (error) {
      message.error(t('test.exportFailed'));
    }
  };

  const collectionColumns = [
    {
      title: t('test.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('common.description'),
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: t('test.testCaseCount'),
      dataIndex: 'test_cases',
      key: 'test_cases',
      render: (cases: string[]) => cases?.length || 0,
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 250,
      render: (_: any, record: TestCollection) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            onClick={() => handleViewCollection(record._id)}
          >
            {t('test.viewCases')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  const caseColumns = [
    {
      title: t('test.case.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('test.case.interface'),
      dataIndex: 'interface_id',
      key: 'interface_id',
      render: (id: string) => {
        const inter = interfaces.find((i) => i._id === id);
        return inter ? `${inter.method} ${inter.path}` : '-';
      },
    },
    {
      title: t('test.case.order'),
      dataIndex: 'order',
      key: 'order',
      width: 100,
    },
    {
      title: t('test.case.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? t('common.yes') : t('common.no')}</Tag>,
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 200,
      render: (_: any, record: TestCase) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditCase(record)}
          >
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteCase(record._id)}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        items={[
          {
            key: 'collections',
            label: t('test.title'),
            children: (
              <Card
                title={t('test.title')}
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
                    {t('test.create')}
                  </Button>
                }
              >
                <Table
                  columns={collectionColumns}
                  dataSource={collections}
                  rowKey="_id"
                  loading={loading}
                />
              </Card>
            ),
          },
          {
            key: 'rules',
            label: t('test.rules.title'),
            children: <TestRules />,
          },
        ]}
      />

      {currentCollection && (
        <Card
          title={currentCollection.name}
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleRunTest}
                loading={running}
              >
                {t('test.run')}
              </Button>
              <Button icon={<PlusOutlined />} onClick={handleCreateCase}>
                {t('test.case.create')}
              </Button>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <Tabs
            items={[
              {
                key: 'cases',
                label: t('test.case.title'),
                children: (
                  <Table
                    columns={caseColumns}
                    dataSource={testCases}
                    rowKey="_id"
                    loading={loading}
                  />
                ),
              },
              {
                key: 'history',
                label: t('test.history'),
                children: (
                  <Table
                    columns={[
                      {
                        title: t('test.result.status'),
                        dataIndex: 'status',
                        key: 'status',
                        render: (status: string) => {
                          const colors: Record<string, string> = {
                            success: 'green',
                            failed: 'red',
                            running: 'blue',
                          };
                          return <Tag color={colors[status]}>{t(`test.result.statusOptions.${status}`)}</Tag>;
                        },
                      },
                      {
                        title: t('test.result.duration'),
                        dataIndex: 'duration',
                        key: 'duration',
                        render: (duration: number) => `${duration}ms`,
                      },
                      {
                        title: t('common.createdAt'),
                        dataIndex: 'created_at',
                        key: 'created_at',
                        render: (text: string) => new Date(text).toLocaleString(),
                      },
                      {
                        title: t('common.operation'),
                        key: 'action',
                        width: 150,
                        render: (_: any, record: any) => (
                          <Space>
                            <Button
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => {
                                setSelectedResult(record);
                                setResultModalVisible(true);
                              }}
                            >
                              {t('test.viewDetails')}
                            </Button>
                            <Button
                              type="link"
                              icon={<DownloadOutlined />}
                              onClick={() => handleExportReport(record)}
                            >
                              {t('test.exportReport')}
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                    dataSource={testResults}
                    rowKey="_id"
                  />
                ),
              },
            ]}
          />
        </Card>
      )}

      <Modal
        title={editingCollection ? t('test.edit') : t('test.create')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="project_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label={t('test.name')}
            rules={[{ required: true, message: t('test.nameRequired') }]}
          >
            <Input placeholder={t('test.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <TextArea rows={3} placeholder={t('test.descriptionPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingCase ? t('test.case.edit') : t('test.case.create')}
        open={caseModalVisible}
        onOk={handleSubmitCase}
        onCancel={() => {
          setCaseModalVisible(false);
          caseForm.resetFields();
        }}
        width={800}
      >
        <Form form={caseForm} layout="vertical">
          <Form.Item name="collection_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label={t('test.case.name')}
            rules={[{ required: true, message: t('test.case.nameRequired') }]}
          >
            <Input placeholder={t('test.case.namePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="interface_id"
            label={t('test.case.interface')}
            rules={[{ required: true, message: t('test.case.interfaceRequired') }]}
          >
            <Select placeholder={t('test.case.interfacePlaceholder')}>
              {interfaces.map((inter) => (
                <Option key={inter._id} value={inter._id}>
                  {inter.method} {inter.path}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="order" label={t('test.case.order')}>
            <InputNumber min={0} defaultValue={0} />
          </Form.Item>
          <Form.Item name="enabled" valuePropName="checked" label={t('test.case.enabled')}>
            <Switch />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name={['request', 'query']} label={t('test.case.requestQuery')}>
            <TextArea rows={4} placeholder='{"key": "value"}' />
          </Form.Item>
          <Form.Item name={['request', 'body']} label={t('test.case.requestBody')}>
            <TextArea rows={6} placeholder='{"key": "value"}' />
          </Form.Item>
          <Form.Item name="assertion_script" label={t('test.case.assertionScript')}>
            <TextArea rows={6} placeholder="// JavaScript assertion script" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('test.result.details')}
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
              <Descriptions.Item label={t('test.result.status')}>
                <Tag color={selectedResult.status === 'success' ? 'green' : 'red'}>
                  {t(`test.result.statusOptions.${selectedResult.status}`)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('test.result.duration')}>
                {selectedResult.duration}ms
              </Descriptions.Item>
              <Descriptions.Item label={t('common.createdAt')} span={2}>
                {new Date(selectedResult.created_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5}>{t('test.result.caseResults')}</Typography.Title>
            <Collapse
              items={(selectedResult.results || []).map((caseResult: any, index: number) => ({
                key: index,
                label: `${caseResult.name || `Case ${index + 1}`} - ${caseResult.status === 'success' ? t('test.result.success') : t('test.result.failed')}`,
                children: (
                  <div>
                    <Descriptions bordered size="small" column={1}>
                      <Descriptions.Item label={t('test.result.requestUrl')}>
                        {caseResult.request?.url || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('test.result.requestMethod')}>
                        {caseResult.request?.method || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('test.result.responseStatus')}>
                        {caseResult.response?.status || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('test.result.responseBody')}>
                        <Typography.Paragraph copyable>
                          <pre style={{ maxHeight: 200, overflow: 'auto' }}>
                            {typeof caseResult.response?.body === 'string'
                              ? caseResult.response.body
                              : JSON.stringify(caseResult.response?.body, null, 2)}
                          </pre>
                        </Typography.Paragraph>
                      </Descriptions.Item>
                      {caseResult.error && (
                        <Descriptions.Item label={t('test.result.error')}>
                          <Typography.Text type="danger">{caseResult.error}</Typography.Text>
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </div>
                ),
              }))}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TestManagement;

