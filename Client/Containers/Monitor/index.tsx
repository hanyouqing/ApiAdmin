import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  App,
  InputNumber,
  Drawer,
  Descriptions,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const statusColor: Record<string, string> = {
  idle: 'default',
  passing: 'success',
  failing: 'error',
  error: 'warning',
};

const MonitorsPage: React.FC = () => {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [environments, setEnvironments] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [runsVisible, setRunsVisible] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [activeMonitor, setActiveMonitor] = useState<any | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/project/list');
      setProjects(res.data?.data || []);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('monitor.fetchProjectsFailed'));
    }
  }, [messageApi, t]);

  const fetchEnvironments = useCallback(
    async (pid: string) => {
      try {
        const res = await api.get('/test/environments', { params: { project_id: pid } });
        setEnvironments(res.data?.data || []);
      } catch {
        setEnvironments([]);
      }
    },
    []
  );

  const fetchMonitors = useCallback(
    async (pid: string) => {
      setLoading(true);
      try {
        const res = await api.get('/monitors', { params: { project_id: pid } });
        setMonitors(res.data?.data || []);
      } catch (error: any) {
        messageApi.error(error.response?.data?.message || t('monitor.fetchFailed'));
      } finally {
        setLoading(false);
      }
    },
    [messageApi, t]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (projectId) {
      fetchMonitors(projectId);
      fetchEnvironments(projectId);
    } else {
      setMonitors([]);
      setEnvironments([]);
    }
  }, [projectId, fetchMonitors, fetchEnvironments]);

  const openCreate = () => {
    if (!projectId) {
      messageApi.warning(t('monitor.selectProject'));
      return;
    }
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      request: { method: 'GET', url: '', headers: '{}' },
      assertions: { status_code: 200, body_contains: '', max_response_time_ms: 5000 },
      schedule: { enabled: true, cron: '*/5 * * * *', timezone: 'Asia/Shanghai' },
      notification: { enabled: false, on_failure: true, on_success: false, webhook_url: '', email_addresses: '' },
    });
    setModalVisible(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      description: row.description,
      enabled: row.enabled,
      environment_id: row.environment_id || undefined,
      request: {
        method: row.request?.method || 'GET',
        url: row.request?.url || '',
        headers: JSON.stringify(row.request?.headers || {}, null, 2),
        body: row.request?.body != null ? JSON.stringify(row.request.body, null, 2) : '',
      },
      assertions: row.assertions || {},
      schedule: row.schedule || {},
      notification: {
        ...(row.notification || {}),
        email_addresses: (row.notification?.email_addresses || []).join(', '),
      },
    });
    setModalVisible(true);
  };

  const parseJsonField = (raw: string, label: string) => {
    if (!raw || !String(raw).trim()) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(t('monitor.invalidJson', { field: label }));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      let headers = {};
      let body = null;
      try {
        headers = parseJsonField(values.request?.headers || '{}', 'headers');
        if (values.request?.body?.trim()) {
          body = parseJsonField(values.request.body, 'body');
        }
      } catch (e: any) {
        messageApi.error(e.message);
        return;
      }

      const payload = {
        project_id: projectId,
        name: values.name,
        description: values.description || '',
        enabled: values.enabled !== false,
        environment_id: values.environment_id || null,
        request: {
          method: values.request.method,
          url: values.request.url,
          headers,
          body,
        },
        assertions: values.assertions,
        schedule: values.schedule,
        notification: {
          ...values.notification,
          email_addresses: String(values.notification?.email_addresses || '')
            .split(/[,;\s]+/)
            .filter(Boolean),
        },
      };

      if (editing?._id) {
        await api.put(`/monitors/${editing._id}`, payload);
        messageApi.success(t('monitor.updateSuccess'));
      } else {
        await api.post('/monitors', payload);
        messageApi.success(t('monitor.createSuccess'));
      }
      setModalVisible(false);
      if (projectId) fetchMonitors(projectId);
    } catch (error: any) {
      if (error?.errorFields) return;
      messageApi.error(error.response?.data?.message || t('monitor.operationFailed'));
    }
  };

  const handleDelete = (row: any) => {
    Modal.confirm({
      title: t('monitor.deleteConfirm'),
      content: t('monitor.deleteConfirmMessage', { name: row.name }),
      onOk: async () => {
        try {
          await api.delete(`/monitors/${row._id}`);
          messageApi.success(t('monitor.deleteSuccess'));
          if (projectId) fetchMonitors(projectId);
        } catch (error: any) {
          messageApi.error(error.response?.data?.message || t('monitor.deleteFailed'));
        }
      },
    });
  };

  const handleRun = async (row: any) => {
    try {
      const res = await api.post(`/monitors/${row._id}/run`);
      const status = res.data?.data?.run?.status;
      messageApi.success(t('monitor.runDone', { status }));
      if (projectId) fetchMonitors(projectId);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('monitor.runFailed'));
    }
  };

  const openRuns = async (row: any) => {
    setActiveMonitor(row);
    setRunsVisible(true);
    setRunsLoading(true);
    try {
      const res = await api.get(`/monitors/${row._id}/runs`, { params: { limit: 30 } });
      setRuns(res.data?.data || []);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('monitor.fetchRunsFailed'));
    } finally {
      setRunsLoading(false);
    }
  };

  const columns = [
    { title: t('monitor.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('monitor.url'),
      key: 'url',
      ellipsis: true,
      render: (_: any, row: any) => row.request?.url,
    },
    {
      title: t('monitor.schedule'),
      key: 'schedule',
      render: (_: any, row: any) =>
        row.schedule?.enabled ? <Tag color="blue">{row.schedule.cron}</Tag> : <Tag>{t('monitor.scheduleOff')}</Tag>,
    },
    {
      title: t('monitor.lastStatus'),
      dataIndex: 'last_status',
      render: (status: string) => <Tag color={statusColor[status] || 'default'}>{status || 'idle'}</Tag>,
    },
    {
      title: t('monitor.lastRun'),
      dataIndex: 'last_run_at',
      render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
    },
    {
      title: t('common.actions') || '操作',
      key: 'actions',
      width: 220,
      render: (_: any, row: any) => (
        <Space>
          <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleRun(row)}>
            {t('monitor.run')}
          </Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => openRuns(row)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)} />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card
        title={t('monitor.title')}
        extra={
          <Space>
            <Select
              style={{ minWidth: 220 }}
              placeholder={t('monitor.selectProject')}
              value={projectId}
              onChange={setProjectId}
              options={projects.map((p) => ({ value: p._id, label: p.project_name }))}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t('monitor.create')}
            </Button>
          </Space>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {t('monitor.hint')}
        </Text>
        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={monitors}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editing ? t('monitor.edit') : t('monitor.create')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('monitor.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('monitor.description')}>
            <Input />
          </Form.Item>
          <Form.Item name="enabled" label={t('monitor.enabled')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="environment_id" label={t('monitor.environment')}>
            <Select allowClear placeholder={t('monitor.environmentOptional')}>
              {environments.map((e) => (
                <Option key={e._id} value={e._id}>
                  {e.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name={['request', 'method']} label="Method" rules={[{ required: true }]}>
            <Select>
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map((m) => (
                <Option key={m} value={m}>
                  {m}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name={['request', 'url']} label="URL" rules={[{ required: true }]}>
            <Input placeholder="https://api.example.com/health or /health with env base_url" />
          </Form.Item>
          <Form.Item name={['request', 'headers']} label="Headers (JSON)">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name={['request', 'body']} label="Body (JSON)">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name={['assertions', 'status_code']} label={t('monitor.expectStatus')}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name={['assertions', 'body_contains']} label={t('monitor.bodyContains')}>
            <Input />
          </Form.Item>
          <Form.Item name={['assertions', 'max_response_time_ms']} label={t('monitor.maxMs')}>
            <InputNumber style={{ width: '100%' }} min={100} />
          </Form.Item>
          <Form.Item name={['schedule', 'enabled']} label={t('monitor.scheduleEnabled')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name={['schedule', 'cron']} label="Cron">
            <Input placeholder="*/5 * * * *" />
          </Form.Item>
          <Form.Item name={['schedule', 'timezone']} label="Timezone">
            <Input />
          </Form.Item>
          <Form.Item name={['notification', 'enabled']} label={t('monitor.notifyEnabled')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name={['notification', 'on_failure']} label={t('monitor.notifyOnFailure')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name={['notification', 'webhook_url']} label="Webhook URL">
            <Input />
          </Form.Item>
          <Form.Item name={['notification', 'email_addresses']} label={t('monitor.emails')}>
            <Input placeholder="a@x.com, b@y.com" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={activeMonitor ? `${t('monitor.runs')} — ${activeMonitor.name}` : t('monitor.runs')}
        open={runsVisible}
        onClose={() => setRunsVisible(false)}
        width={640}
      >
        <Table
          loading={runsLoading}
          rowKey="_id"
          size="small"
          dataSource={runs}
          pagination={false}
          columns={[
            {
              title: t('monitor.lastStatus'),
              dataIndex: 'status',
              render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s}</Tag>,
            },
            {
              title: t('monitor.lastRun'),
              dataIndex: 'run_at',
              render: (v: string) => new Date(v).toLocaleString(),
            },
            { title: 'ms', dataIndex: 'duration', width: 80 },
            { title: t('monitor.message'), dataIndex: 'message', ellipsis: true },
          ]}
          expandable={{
            expandedRowRender: (record) => (
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="Request">
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(record.request, null, 2)}
                  </pre>
                </Descriptions.Item>
                <Descriptions.Item label="Response">
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto' }}>
                    {JSON.stringify(record.response, null, 2)}
                  </pre>
                </Descriptions.Item>
              </Descriptions>
            ),
          }}
        />
      </Drawer>
    </div>
  );
};

export default MonitorsPage;
