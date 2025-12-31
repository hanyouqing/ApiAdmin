import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, message, InputNumber, Switch, Tabs, Descriptions, Typography, Collapse } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, ApiOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import Mock from 'mockjs';
import JSON5 from 'json5';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchInterfaces, createInterface, updateInterface, deleteInterface, runInterface, fetchInterfaceDetail } from '../../Reducer/Modules/Interface';
import { fetchInterfaceCats, createInterfaceCat } from '../../Reducer/Modules/InterfaceCat';
import { fetchMockExpectations, createMockExpectation, updateMockExpectation, deleteMockExpectation } from '../../Reducer/Modules/MockExpectation';
import { fetchProjectDetail, fetchProjects } from '../../Reducer/Modules/Project';
import type { AppDispatch, RootState } from '../../Reducer/Create';
import type { Interface } from '../../Reducer/Modules/Interface';
import type { MockExpectation } from '../../Reducer/Modules/MockExpectation';

const { TextArea } = Input;
const { Option } = Select;

const InterfaceManagement: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const location = useLocation();
  const match = useMatch('/project/:projectId/interface/*');
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { interfaces, loading } = useSelector((state: RootState) => state.interface);
  const { cats } = useSelector((state: RootState) => state.interfaceCat);
  const { expectations: mockExpectations, loading: mockLoading } = useSelector((state: RootState) => state.mockExpectation);
  const { currentProject, projects } = useSelector((state: RootState) => state.project);
  
  // 检查当前路径是否是接口相关路径
  const isInterfacePath = location.pathname.includes('/interface') || match !== null;
  const [form] = Form.useForm();
  const [catForm] = Form.useForm();
  const [mockForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [mockModalVisible, setMockModalVisible] = useState(false);
  const [editingInterface, setEditingInterface] = useState<Interface | null>(null);
  const [editingMock, setEditingMock] = useState<MockExpectation | null>(null);
  const [selectedInterfaceId, setSelectedInterfaceId] = useState<string | null>(null);
  const [runModalVisible, setRunModalVisible] = useState(false);
  const [runningInterface, setRunningInterface] = useState<Interface | null>(null);
  const [runResult, setRunResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [runForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [catFilter, setCatFilter] = useState<string | undefined>(undefined);
  const [mockPreviewVisible, setMockPreviewVisible] = useState(false);
  const [mockPreviewData, setMockPreviewData] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 从路由路径中提取 projectId，或从 Redux store 获取
  const projectId = useMemo(() => {
    // 首先检查当前路径是否包含路由关键字，如果是则返回空
    const pathParts = location.pathname.split('/');
    const routeKeywords = ['interface', 'test', 'setting', 'activity'];
    const hasRouteKeyword = pathParts.some(part => routeKeywords.includes(part));
    
    if (params.projectId) {
      // 如果 params.projectId 是路由关键字，返回空
      if (routeKeywords.includes(params.projectId)) {
        return '';
      }
      return params.projectId;
    }
    
    // 从 URL 路径中提取：/project/:projectId/interface
    const pathMatch = location.pathname.match(/\/project\/([^/]+)/);
    if (pathMatch && pathMatch[1]) {
      const extractedId = pathMatch[1];
      // 排除路由关键字
      if (routeKeywords.includes(extractedId)) {
        return '';
      }
      return extractedId;
    }
    
    // 如果路径包含路由关键字但不是从 projectId 位置匹配到的，尝试从 Redux store 获取
    if (hasRouteKeyword) {
      return currentProject?._id || '';
    }
    
    // 最后从 Redux store 获取
    return currentProject?._id || '';
  }, [params.projectId, location.pathname, currentProject?._id]);

  // 获取项目列表
  useEffect(() => {
    if (projects.length === 0) {
      dispatch(fetchProjects());
    }
  }, [dispatch, projects.length]);

  useEffect(() => {
    // 如果当前没有 projectId 且项目列表不为空，默认选择第一个项目
    if (isInterfacePath && !projectId && projects.length > 0) {
      const firstProject = projects[0];
      if (firstProject?._id) {
        // 导航到第一个项目的接口页面
        navigate(`/project/${firstProject._id}/interface`, { replace: true });
        return;
      }
    }
    
    // 只在接口相关路径且 projectId 有效时执行
    if (isInterfacePath && 
        projectId && 
        projectId !== 'interface' && 
        projectId !== 'test' && 
        projectId !== 'setting' && 
        projectId !== 'activity' &&
        projectId.length > 0) {
      dispatch(fetchInterfaces(projectId));
      dispatch(fetchInterfaceCats(projectId));
      dispatch(fetchProjectDetail(projectId));
    }
  }, [dispatch, projectId, isInterfacePath, projects, navigate]);

  const handleCreate = () => {
    setEditingInterface(null);
    form.resetFields();
    form.setFieldsValue({ project_id: projectId, method: 'GET', req_body_type: 'json', res_body_type: 'json', status: 'developing' });
    setModalVisible(true);
  };

  const handleEdit = (record: Interface) => {
    setEditingInterface(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('interface.deleteConfirm'),
      content: t('interface.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await dispatch(deleteInterface(id)).unwrap();
          message.success(t('interface.deleteSuccess'));
          setSelectedRowKeys([]);
          if (projectId) {
            dispatch(fetchInterfaces(projectId));
          }
        } catch (error: any) {
          message.error(error.message || t('message.deleteFailed'));
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t('interface.noSelection'));
      return;
    }
    Modal.confirm({
      title: t('interface.batchDeleteConfirm'),
      content: t('interface.batchDeleteConfirmMessage', { count: selectedRowKeys.length }),
      onOk: async () => {
        try {
          const deletePromises = selectedRowKeys.map((id) => dispatch(deleteInterface(id as string)).unwrap());
          await Promise.all(deletePromises);
          message.success(t('interface.batchDeleteSuccess', { count: selectedRowKeys.length }));
          setSelectedRowKeys([]);
          if (projectId) {
            dispatch(fetchInterfaces(projectId));
          }
        } catch (error: any) {
          message.error(error.message || t('message.deleteFailed'));
        }
      },
    });
  };

  const handleRun = async (record: Interface) => {
    setRunningInterface(record);
    if (projectId) {
      await dispatch(fetchProjectDetail(projectId));
    }
    await dispatch(fetchInterfaceDetail(record._id));
    runForm.resetFields();
    runForm.setFieldsValue({
      _id: record._id,
      env: currentProject?.env?.[0]?.name || '',
      params: {
        query: '{}',
        body: '{}',
        headers: '{}',
        path: {},
      },
    });
    setRunModalVisible(true);
  };

  const handleRunSubmit = async () => {
    try {
      const values = await runForm.validateFields();
      
      // Parse JSON strings to objects
      const params: any = {};
      if (values.params?.query) {
        try {
          params.query = typeof values.params.query === 'string' ? JSON.parse(values.params.query) : values.params.query;
        } catch {
          params.query = {};
        }
      }
      if (values.params?.body) {
        try {
          params.body = typeof values.params.body === 'string' ? JSON.parse(values.params.body) : values.params.body;
        } catch {
          params.body = {};
        }
      }
      if (values.params?.headers) {
        try {
          params.headers = typeof values.params.headers === 'string' ? JSON.parse(values.params.headers) : values.params.headers;
        } catch {
          params.headers = {};
        }
      }
      if (values.params?.path) {
        params.path = values.params.path;
      }

      setRunning(true);
      setRunResult(null);
      const result = await dispatch(runInterface({ ...values, params })).unwrap();
      setRunResult(result);
      message.success(t('interface.runSuccess'));
    } catch (error: any) {
      message.error(error.message || t('interface.runFailed'));
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingInterface) {
        await dispatch(updateInterface({ id: editingInterface._id, data: values })).unwrap();
        message.success(t('interface.updateSuccess'));
      } else {
        await dispatch(createInterface(values)).unwrap();
        message.success(t('interface.createSuccess'));
      }
      setModalVisible(false);
      form.resetFields();
      if (projectId) {
        dispatch(fetchInterfaces(projectId));
      }
    } catch (error: any) {
      message.error(error.message || t('message.operationFailed'));
    }
  };

  const handleCreateCat = async () => {
    try {
      const values = await catForm.validateFields();
      await dispatch(createInterfaceCat({ ...values, project_id: projectId })).unwrap();
      message.success(t('interface.cat.createSuccess'));
      setCatModalVisible(false);
      catForm.resetFields();
      if (projectId) {
        dispatch(fetchInterfaceCats(projectId));
      }
    } catch (error: any) {
      message.error(error.message || t('message.createFailed'));
    }
  };

  const handleManageMock = (interfaceId: string) => {
    setSelectedInterfaceId(interfaceId);
    dispatch(fetchMockExpectations(interfaceId));
    setMockModalVisible(true);
  };

  const handleCreateMock = () => {
    setEditingMock(null);
    mockForm.resetFields();
    mockForm.setFieldsValue({
      interface_id: selectedInterfaceId,
      enabled: true,
      priority: 0,
      response: {
        status_code: 200,
        delay: 0,
        headers: {},
        body: '{}',
      },
    });
  };

  const handleEditMock = (record: MockExpectation) => {
    setEditingMock(record);
    mockForm.setFieldsValue(record);
  };

  const handleDeleteMock = (id: string) => {
    Modal.confirm({
      title: t('interface.mockExpectation.deleteConfirm'),
      content: t('interface.mockExpectation.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await dispatch(deleteMockExpectation(id)).unwrap();
          message.success(t('interface.mockExpectation.deleteSuccess'));
          if (selectedInterfaceId) {
            dispatch(fetchMockExpectations(selectedInterfaceId));
          }
        } catch (error: any) {
          message.error(error.message || t('message.deleteFailed'));
        }
      },
    });
  };

  const handleSubmitMock = async () => {
    try {
      const values = await mockForm.validateFields();
      if (editingMock) {
        await dispatch(updateMockExpectation({ id: editingMock._id, data: values })).unwrap();
        message.success(t('interface.mockExpectation.updateSuccess'));
      } else {
        await dispatch(createMockExpectation(values)).unwrap();
        message.success(t('interface.mockExpectation.createSuccess'));
      }
      if (selectedInterfaceId) {
        dispatch(fetchMockExpectations(selectedInterfaceId));
      }
      mockForm.resetFields();
      setEditingMock(null);
    } catch (error: any) {
      message.error(error.message || t('message.operationFailed'));
    }
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'blue',
      POST: 'green',
      PUT: 'orange',
      DELETE: 'red',
      PATCH: 'purple',
      HEAD: 'cyan',
      OPTIONS: 'default',
    };
    return colors[method] || 'default';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      developing: 'processing',
      developed: 'warning',
      tested: 'success',
      online: 'default',
    };
    return colors[status] || 'default';
  };

  const filteredInterfaces = useMemo(() => {
    let filtered = interfaces;
    
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((inter) => 
        inter.title?.toLowerCase().includes(searchLower) ||
        inter.path?.toLowerCase().includes(searchLower) ||
        inter.tag?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter((inter) => inter.status === statusFilter);
    }
    
    if (catFilter) {
      filtered = filtered.filter((inter) => inter.catid === catFilter);
    }
    
    return filtered;
  }, [interfaces, searchText, statusFilter, catFilter]);

  const columns = [
    {
      title: t('interface.name'),
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: t('interface.method'),
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (method: string) => <Tag color={getMethodColor(method)}>{method}</Tag>,
    },
    {
      title: t('interface.path'),
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: t('interface.category'),
      dataIndex: 'catid',
      key: 'catid',
      render: (catid: string) => {
        const cat = cats.find((c) => c._id === catid);
        return cat ? cat.name : '-';
      },
    },
    {
      title: t('interface.status'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => <Tag color={getStatusColor(status)}>{t(`interface.status.${status}`)}</Tag>,
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 200,
      render: (_: any, record: Interface) => (
        <Space>
          <Button
            type="link"
            icon={<PlayCircleOutlined />}
            onClick={() => handleRun(record)}
          >
            {t('interface.run')}
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            {t('common.edit')}
          </Button>
          <Button
            type="link"
            icon={<ApiOutlined />}
            onClick={() => handleManageMock(record._id)}
          >
            {t('interface.mockExpectation.title')}
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

  return (
    <div>
      <Card
        title={t('interface.title')}
        extra={
          <Space>
            <Button onClick={() => setCatModalVisible(true)}>
              {t('interface.cat.create')}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
              {t('interface.create')}
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
          <Space>
            <Input
              placeholder={t('interface.searchPlaceholder')}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder={t('interface.filterByStatus')}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: 150 }}
            >
              <Option value="developing">{t('interface.status.developing')}</Option>
              <Option value="developed">{t('interface.status.developed')}</Option>
              <Option value="tested">{t('interface.status.tested')}</Option>
              <Option value="online">{t('interface.status.online')}</Option>
            </Select>
            <Select
              placeholder={t('interface.filterByCategory')}
              value={catFilter}
              onChange={setCatFilter}
              allowClear
              style={{ width: 200 }}
            >
              {cats.map((cat) => (
                <Option key={cat._id} value={cat._id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                {t('interface.batchDelete', { count: selectedRowKeys.length })}
              </Button>
            )}
          </Space>
        </Space>
        <Table
          columns={columns}
          dataSource={filteredInterfaces}
          rowKey="_id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (newSelectedRowKeys) => {
              setSelectedRowKeys(newSelectedRowKeys);
            },
          }}
        />
      </Card>

      <Modal
        title={editingInterface ? t('interface.edit') : t('interface.create')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="project_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="title"
            label={t('interface.name')}
            rules={[{ required: true, message: t('interface.titleRequired') }]}
          >
            <Input placeholder={t('interface.titlePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="method"
            label={t('interface.method')}
            rules={[{ required: true, message: t('interface.methodRequired') }]}
          >
            <Select>
              <Option value="GET">GET</Option>
              <Option value="POST">POST</Option>
              <Option value="PUT">PUT</Option>
              <Option value="DELETE">DELETE</Option>
              <Option value="PATCH">PATCH</Option>
              <Option value="HEAD">HEAD</Option>
              <Option value="OPTIONS">OPTIONS</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="path"
            label={t('interface.path')}
            rules={[{ required: true, message: t('interface.pathRequired') }]}
          >
            <Input placeholder="/api/example" />
          </Form.Item>
          <Form.Item name="catid" label={t('interface.category')}>
            <Select placeholder={t('interface.categoryPlaceholder')} allowClear>
              {cats.map((cat) => (
                <Option key={cat._id} value={cat._id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status" label={t('interface.status')}>
            <Select>
              <Option value="developing">{t('interface.status.developing')}</Option>
              <Option value="developed">{t('interface.status.developed')}</Option>
              <Option value="tested">{t('interface.status.tested')}</Option>
              <Option value="online">{t('interface.status.online')}</Option>
            </Select>
          </Form.Item>
          <Form.Item name="desc" label={t('common.description')}>
            <TextArea rows={3} placeholder={t('interface.descPlaceholder')} />
          </Form.Item>
          <Form.Item name="req_body_type" label={t('interface.reqBodyType')}>
            <Select>
              <Option value="form">{t('interface.reqBodyType.form')}</Option>
              <Option value="json">{t('interface.reqBodyType.json')}</Option>
              <Option value="file">{t('interface.reqBodyType.file')}</Option>
              <Option value="raw">{t('interface.reqBodyType.raw')}</Option>
            </Select>
          </Form.Item>
          <Form.Item name="req_body" label={t('interface.reqBody')}>
            <TextArea rows={6} placeholder={t('interface.reqBodyPlaceholder')} />
          </Form.Item>
          <Form.Item name="res_body_type" label={t('interface.resBodyType')}>
            <Select>
              <Option value="json">{t('interface.resBodyType.json')}</Option>
              <Option value="raw">{t('interface.resBodyType.raw')}</Option>
            </Select>
          </Form.Item>
          <Form.Item name="res_body" label={t('interface.resBody')}>
            <TextArea rows={6} placeholder={t('interface.resBodyPlaceholder')} />
          </Form.Item>
          <Collapse
            items={[
              {
                key: 'mock',
                label: t('interface.mockScript'),
                children: (
                  <Form.Item
                    name="mock_script"
                    label={t('interface.mockScript')}
                    tooltip={t('interface.mockScriptTooltip')}
                    getValueFromEvent={(value) => value}
                    getValueProps={(value) => ({ value: value || '' })}
                  >
                    <Editor
                      height="300px"
                      defaultLanguage="javascript"
                      theme="vs-dark"
                      onChange={(value) => form.setFieldValue('mock_script', value || '')}
                      value={form.getFieldValue('mock_script') || ''}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                      }}
                    />
                  </Form.Item>
                ),
              },
            ]}
          />
          {form.getFieldValue('res_body') && form.getFieldValue('res_body_type') === 'json' && (
            <Form.Item>
              <Button
                icon={<EyeOutlined />}
                onClick={() => {
                  try {
                    const resBody = form.getFieldValue('res_body') || '{}';
                    const parsed = currentProject?.enable_json5 ? JSON5.parse(resBody) : JSON.parse(resBody);
                    const mocked = Mock.mock(parsed);
                    setMockPreviewData(mocked);
                    setMockPreviewVisible(true);
                  } catch (error) {
                    message.error(t('interface.mockPreviewError'));
                  }
                }}
              >
                {t('interface.mockPreview')}
              </Button>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={t('interface.mockPreview')}
        open={mockPreviewVisible}
        onCancel={() => setMockPreviewVisible(false)}
        footer={null}
        width={800}
      >
        <Editor
          height="400px"
          defaultLanguage="json"
          theme="vs-dark"
          value={JSON.stringify(mockPreviewData, null, 2)}
          options={{
            readOnly: true,
            minimap: { enabled: false },
          }}
        />
      </Modal>

      <Modal
        title={t('interface.cat.create')}
        open={catModalVisible}
        onOk={handleCreateCat}
        onCancel={() => {
          setCatModalVisible(false);
          catForm.resetFields();
        }}
      >
        <Form form={catForm} layout="vertical">
          <Form.Item
            name="name"
            label={t('interface.cat.name')}
            rules={[{ required: true, message: t('interface.cat.nameRequired') }]}
          >
            <Input placeholder={t('interface.cat.namePlaceholder')} />
          </Form.Item>
          <Form.Item name="desc" label={t('common.description')}>
            <TextArea rows={3} placeholder={t('interface.cat.descPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('interface.mockExpectation.title')}
        open={mockModalVisible}
        onCancel={() => {
          setMockModalVisible(false);
          setSelectedInterfaceId(null);
          mockForm.resetFields();
          setEditingMock(null);
        }}
        footer={null}
        width={1000}
      >
        <Tabs
          items={[
            {
              key: 'list',
              label: t('interface.mockExpectation.title'),
              children: (
                <div>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateMock}
                    style={{ marginBottom: 16 }}
                  >
                    {t('interface.mockExpectation.create')}
                  </Button>
                  <Table
                    columns={[
                      {
                        title: t('interface.mockExpectation.name'),
                        dataIndex: 'name',
                        key: 'name',
                      },
                      {
                        title: t('interface.mockExpectation.priority'),
                        dataIndex: 'priority',
                        key: 'priority',
                        width: 100,
                      },
                      {
                        title: t('interface.mockExpectation.enabled'),
                        dataIndex: 'enabled',
                        key: 'enabled',
                        width: 100,
                        render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? t('common.yes') : t('common.no')}</Tag>,
                      },
                      {
                        title: t('common.operation'),
                        key: 'action',
                        width: 150,
                        render: (_: any, record: MockExpectation) => (
                          <Space>
                            <Button
                              type="link"
                              icon={<EditOutlined />}
                              onClick={() => handleEditMock(record)}
                            >
                              {t('common.edit')}
                            </Button>
                            <Button
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteMock(record._id)}
                            >
                              {t('common.delete')}
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                    dataSource={mockExpectations}
                    rowKey="_id"
                    loading={mockLoading}
                  />
                </div>
              ),
            },
            {
              key: 'form',
              label: editingMock ? t('interface.mockExpectation.edit') : t('interface.mockExpectation.create'),
              children: (
                <Form form={mockForm} layout="vertical" onFinish={handleSubmitMock}>
                  <Form.Item name="interface_id" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item
                    name="name"
                    label={t('interface.mockExpectation.name')}
                    rules={[{ required: true, message: t('interface.mockExpectation.nameRequired') }]}
                  >
                    <Input placeholder={t('interface.mockExpectation.namePlaceholder')} />
                  </Form.Item>
                  <Form.Item name="ip_filter" label={t('interface.mockExpectation.ipFilter')}>
                    <Input placeholder="192.168.1.1" />
                  </Form.Item>
                  <Form.Item name="priority" label={t('interface.mockExpectation.priority')}>
                    <InputNumber min={0} defaultValue={0} />
                  </Form.Item>
                  <Form.Item name="enabled" valuePropName="checked" label={t('interface.mockExpectation.enabled')}>
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name={['response', 'status_code']}
                    label={t('interface.mockExpectation.statusCode')}
                  >
                    <InputNumber min={100} max={599} defaultValue={200} />
                  </Form.Item>
                  <Form.Item name={['response', 'delay']} label={t('interface.mockExpectation.delay')}>
                    <InputNumber min={0} defaultValue={0} />
                  </Form.Item>
                  <Form.Item name={['response', 'body']} label={t('interface.mockExpectation.body')}>
                    <TextArea rows={8} placeholder='{"code": 0, "message": "success"}' />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit">
                        {t('common.save')}
                      </Button>
                      <Button onClick={() => setEditingMock(null)}>
                        {t('common.cancel')}
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              ),
            },
          ]}
          activeKey={editingMock ? 'form' : 'list'}
          onChange={(key) => {
            if (key === 'list') {
              setEditingMock(null);
              mockForm.resetFields();
            }
          }}
        />
      </Modal>

      <Modal
        title={t('interface.run')}
        open={runModalVisible}
        onCancel={() => {
          setRunModalVisible(false);
          setRunningInterface(null);
          setRunResult(null);
          runForm.resetFields();
        }}
        footer={null}
        width={900}
      >
        <Tabs
          items={[
            {
              key: 'request',
              label: t('interface.run.request'),
              children: (
                <Form form={runForm} layout="vertical" onFinish={handleRunSubmit}>
                  <Form.Item name="_id" hidden>
                    <Input />
                  </Form.Item>
                  {currentProject?.env && currentProject.env.length > 0 && (
                    <Form.Item name="env" label={t('interface.run.environment')}>
                      <Select>
                        {currentProject.env.map((env: any) => (
                          <Option key={env.name} value={env.name}>
                            {env.name} - {env?.host || env?.base_url || ''}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}
                  <Form.Item name={['params', 'query']} label={t('interface.run.query')}>
                    <TextArea rows={4} placeholder='{"key": "value"}' />
                  </Form.Item>
                  {runningInterface && ['POST', 'PUT', 'PATCH'].includes(runningInterface.method) && (
                    <Form.Item name={['params', 'body']} label={t('interface.run.body')}>
                      <TextArea rows={8} placeholder='{"key": "value"}' />
                    </Form.Item>
                  )}
                  <Form.Item name={['params', 'headers']} label={t('interface.run.headers')}>
                    <TextArea rows={4} placeholder='{"Content-Type": "application/json"}' />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={running} icon={<PlayCircleOutlined />}>
                      {t('interface.run')}
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'response',
              label: t('interface.run.response'),
              children: runResult ? (
                <div>
                  <Descriptions column={1} bordered>
                    <Descriptions.Item label={t('interface.run.status')}>
                      <Tag color={runResult.response?.status >= 200 && runResult.response?.status < 300 ? 'green' : 'red'}>
                        {runResult.response?.status} {runResult.response?.statusText}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('interface.run.duration')}>
                      {runResult.response?.duration}ms
                    </Descriptions.Item>
                    <Descriptions.Item label={t('interface.run.url')}>
                      {runResult.request?.url}
                    </Descriptions.Item>
                  </Descriptions>
                  <Typography.Title level={5} style={{ marginTop: 16 }}>
                    {t('interface.run.responseHeaders')}
                  </Typography.Title>
                  <Typography.Paragraph>
                    <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                      {JSON.stringify(runResult.response?.headers || {}, null, 2)}
                    </pre>
                  </Typography.Paragraph>
                  <Typography.Title level={5}>
                    {t('interface.run.responseBody')}
                  </Typography.Title>
                  <Typography.Paragraph>
                    <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
                      {typeof runResult.response?.data === 'string'
                        ? runResult.response.data
                        : JSON.stringify(runResult.response?.data || {}, null, 2)}
                    </pre>
                  </Typography.Paragraph>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  {t('interface.run.noResult')}
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default InterfaceManagement;
