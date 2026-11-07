import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  App,
  Drawer,
  Descriptions,
  Typography,
  Switch,
  List,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CommentOutlined,
  UndoOutlined,
  DeleteFilled,
  BugOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../Utils/api';

const { TextArea } = Input;
const { Text, Link } = Typography;

const statusColor: Record<string, string> = {
  open: 'processing',
  in_progress: 'blue',
  resolved: 'success',
  closed: 'default',
  reopened: 'warning',
};

const severityColor: Record<string, string> = {
  critical: 'magenta',
  major: 'red',
  minor: 'orange',
  trivial: 'default',
};

const BugsPage: React.FC = () => {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>(
    searchParams.get('project_id') || undefined
  );
  const [bugs, setBugs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [comment, setComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const statusOptions = useMemo(
    () =>
      ['open', 'in_progress', 'resolved', 'closed', 'reopened'].map(s => ({
        value: s,
        label: t(`bug.status.${s}`),
      })),
    [t]
  );

  const severityOptions = useMemo(
    () =>
      ['critical', 'major', 'minor', 'trivial'].map(s => ({
        value: s,
        label: t(`bug.severity.${s}`),
      })),
    [t]
  );

  const priorityOptions = useMemo(
    () =>
      ['p0', 'p1', 'p2', 'p3'].map(s => ({
        value: s,
        label: s.toUpperCase(),
      })),
    []
  );

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/project/list');
      setProjects(res.data?.data || []);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('bug.fetchProjectsFailed'));
    }
  }, [messageApi, t]);

  const fetchBugs = useCallback(
    async (pid: string, pageNum = 1) => {
      setLoading(true);
      try {
        const res = await api.get('/bugs', {
          params: {
            project_id: pid,
            page: pageNum,
            pageSize: 20,
            status: statusFilter,
            severity: severityFilter,
            q: q || undefined,
            include_deleted: showDeleted ? '1' : undefined,
          },
        });
        const data = res.data?.data || {};
        setBugs(data.items || []);
        setTotal(data.total || 0);
        setPage(data.page || pageNum);
      } catch (error: any) {
        messageApi.error(error.response?.data?.message || t('bug.fetchFailed'));
      } finally {
        setLoading(false);
      }
    },
    [messageApi, t, statusFilter, severityFilter, q, showDeleted]
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (projectId) {
      fetchBugs(projectId, 1);
      const next = new URLSearchParams(searchParams);
      next.set('project_id', projectId);
      setSearchParams(next, { replace: true });
    } else {
      setBugs([]);
      setTotal(0);
    }
  }, [projectId, fetchBugs]);

  const openCreate = useCallback(
    (prefill?: Record<string, string | undefined>) => {
      if (!projectId) {
        messageApi.warning(t('bug.selectProject'));
        return;
      }
      setEditing(null);
      form.resetFields();
      form.setFieldsValue({
        status: 'open',
        severity: 'major',
        priority: 'p2',
        title: prefill?.title || '',
        description: prefill?.description || '',
        monitor_id: prefill?.monitor_id || undefined,
        monitor_run_id: prefill?.monitor_run_id || undefined,
        auto_test_result_id: prefill?.auto_test_result_id || undefined,
        interface_id: prefill?.interface_id || undefined,
      });
      setModalVisible(true);
    },
    [projectId, messageApi, t, form]
  );

  useEffect(() => {
    if (!projectId) return;
    const title = searchParams.get('title');
    if (!title || modalVisible || editing) return;
    openCreate({
      title,
      description: searchParams.get('description') || undefined,
      monitor_id: searchParams.get('monitor_id') || undefined,
      monitor_run_id: searchParams.get('monitor_run_id') || undefined,
      auto_test_result_id: searchParams.get('auto_test_result_id') || undefined,
      interface_id: searchParams.get('interface_id') || undefined,
    });
    const next = new URLSearchParams(searchParams);
    [
      'title',
      'description',
      'monitor_id',
      'monitor_run_id',
      'auto_test_result_id',
      'interface_id',
    ].forEach(k => next.delete(k));
    setSearchParams(next, { replace: true });
  }, [projectId, searchParams, openCreate, modalVisible, editing, setSearchParams]);

  const openEdit = (row: any) => {
    setEditing(row);
    form.setFieldsValue({
      title: row.title,
      description: row.description,
      status: row.status,
      severity: row.severity,
      priority: row.priority,
      tags: (row.tags || []).join(', '),
      external_url: row.external_url,
      interface_id: row.interface_id?._id || row.interface_id,
      monitor_id: row.monitor_id?._id || row.monitor_id,
      auto_test_result_id: row.auto_test_result_id,
    });
    setModalVisible(true);
  };

  const openDetail = async (row: any) => {
    try {
      const res = await api.get(`/bugs/${row._id}`);
      setDetail(res.data?.data || row);
      setDetailVisible(true);
      setComment('');
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('bug.fetchFailed'));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        project_id: projectId,
        title: values.title,
        description: values.description || '',
        status: values.status,
        severity: values.severity,
        priority: values.priority,
        tags: values.tags || '',
        external_url: values.external_url || '',
        interface_id: values.interface_id || null,
        monitor_id: values.monitor_id || null,
        monitor_run_id: values.monitor_run_id || null,
        auto_test_result_id: values.auto_test_result_id || null,
        test_case_id: values.test_case_id || null,
      };
      if (editing) {
        await api.put(`/bugs/${editing._id}`, payload);
        messageApi.success(t('bug.updateSuccess'));
      } else {
        await api.post('/bugs', payload);
        messageApi.success(t('bug.createSuccess'));
      }
      setModalVisible(false);
      if (projectId) fetchBugs(projectId, page);
    } catch (error: any) {
      if (error?.errorFields) return;
      messageApi.error(error.response?.data?.message || t('bug.saveFailed'));
    }
  };

  const handleDelete = (row: any) => {
    Modal.confirm({
      title: t('bug.deleteConfirm'),
      content: t('bug.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete(`/bugs/${row._id}`);
          messageApi.success(t('bug.deleteSuccess'));
          if (projectId) fetchBugs(projectId, page);
        } catch (error: any) {
          messageApi.error(error.response?.data?.message || t('bug.deleteFailed'));
        }
      },
    });
  };

  const handleRestore = async (row: any) => {
    try {
      await api.post(`/bugs/${row._id}/restore`);
      messageApi.success(t('bug.restoreSuccess'));
      if (projectId) fetchBugs(projectId, page);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('bug.restoreFailed'));
    }
  };

  const handlePurge = (row: any) => {
    Modal.confirm({
      title: t('bug.purgeConfirm'),
      content: t('bug.purgeConfirmMessage'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/bugs/${row._id}/purge`);
          messageApi.success(t('bug.purgeSuccess'));
          if (projectId) fetchBugs(projectId, page);
        } catch (error: any) {
          messageApi.error(error.response?.data?.message || t('bug.purgeFailed'));
        }
      },
    });
  };

  const submitComment = async () => {
    if (!detail?._id || !comment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await api.post(`/bugs/${detail._id}/comments`, { content: comment.trim() });
      setDetail(res.data?.data);
      setComment('');
      messageApi.success(t('bug.commentSuccess'));
      if (projectId) fetchBugs(projectId, page);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('bug.commentFailed'));
    } finally {
      setCommentLoading(false);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'number',
      width: 90,
      render: (n: number) => <Text strong>{`BUG-${n}`}</Text>,
    },
    {
      title: t('bug.titleField'),
      dataIndex: 'title',
      ellipsis: true,
      render: (title: string, row: any) => (
        <Button type="link" style={{ padding: 0 }} onClick={() => openDetail(row)}>
          {title}
        </Button>
      ),
    },
    {
      title: t('bug.statusLabel'),
      dataIndex: 'status',
      width: 120,
      render: (s: string) => <Tag color={statusColor[s]}>{t(`bug.status.${s}`)}</Tag>,
    },
    {
      title: t('bug.severityLabel'),
      dataIndex: 'severity',
      width: 110,
      render: (s: string) => <Tag color={severityColor[s]}>{t(`bug.severity.${s}`)}</Tag>,
    },
    {
      title: t('bug.priorityLabel'),
      dataIndex: 'priority',
      width: 80,
      render: (p: string) => (p || '').toUpperCase(),
    },
    {
      title: t('bug.assignee'),
      dataIndex: 'assignee_id',
      width: 120,
      render: (a: any) => a?.username || '—',
    },
    {
      title: t('bug.updatedAt'),
      dataIndex: 'updatedAt',
      width: 170,
      render: (v: string) => (v ? new Date(v).toLocaleString() : '—'),
    },
    {
      title: t('common.actions') || '操作',
      key: 'actions',
      width: 200,
      render: (_: any, row: any) =>
        showDeleted ? (
          <Space>
            <Button size="small" icon={<UndoOutlined />} onClick={() => handleRestore(row)}>
              {t('bug.restore')}
            </Button>
            <Button size="small" danger icon={<DeleteFilled />} onClick={() => handlePurge(row)}>
              {t('bug.purge')}
            </Button>
          </Space>
        ) : (
          <Space>
            <Button size="small" icon={<CommentOutlined />} onClick={() => openDetail(row)} />
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(row)}
            />
          </Space>
        ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Card
        title={
          <Space>
            <BugOutlined />
            {t('bug.title')}
          </Space>
        }
        extra={
          <Space wrap>
            <Select
              style={{ minWidth: 220 }}
              placeholder={t('bug.selectProject')}
              value={projectId}
              onChange={setProjectId}
              options={projects.map(p => ({ value: p._id, label: p.project_name }))}
              allowClear
            />
            <Select
              allowClear
              style={{ minWidth: 120 }}
              placeholder={t('bug.statusLabel')}
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusOptions}
            />
            <Select
              allowClear
              style={{ minWidth: 120 }}
              placeholder={t('bug.severityLabel')}
              value={severityFilter}
              onChange={setSeverityFilter}
              options={severityOptions}
            />
            <Input.Search
              allowClear
              placeholder={t('bug.search')}
              style={{ width: 180 }}
              onSearch={v => setQ(v)}
            />
            <Space>
              <Text type="secondary">{t('bug.recycle')}</Text>
              <Switch checked={showDeleted} onChange={setShowDeleted} />
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate()}>
              {t('bug.create')}
            </Button>
          </Space>
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {t('bug.hint')}
        </Text>
        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={bugs}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: p => projectId && fetchBugs(projectId, p),
          }}
        />
      </Card>

      <Modal
        title={editing ? t('bug.edit') : t('bug.create')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label={t('bug.titleField')} rules={[{ required: true }]}>
            <Input maxLength={300} />
          </Form.Item>
          <Form.Item name="description" label={t('bug.description')}>
            <TextArea rows={5} />
          </Form.Item>
          <Space style={{ display: 'flex' }} wrap>
            <Form.Item name="status" label={t('bug.statusLabel')} style={{ minWidth: 160 }}>
              <Select options={statusOptions} />
            </Form.Item>
            <Form.Item name="severity" label={t('bug.severityLabel')} style={{ minWidth: 160 }}>
              <Select options={severityOptions} />
            </Form.Item>
            <Form.Item name="priority" label={t('bug.priorityLabel')} style={{ minWidth: 120 }}>
              <Select options={priorityOptions} />
            </Form.Item>
          </Space>
          <Form.Item name="tags" label={t('bug.tags')}>
            <Input placeholder={t('bug.tagsPlaceholder')} />
          </Form.Item>
          <Form.Item name="external_url" label={t('bug.externalUrl')}>
            <Input placeholder="https://jira.example.com/browse/..." />
          </Form.Item>
          <Form.Item name="interface_id" label={t('bug.interfaceId')} hidden>
            <Input />
          </Form.Item>
          <Form.Item name="monitor_id" label={t('bug.monitorId')} hidden>
            <Input />
          </Form.Item>
          <Form.Item name="monitor_run_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="auto_test_result_id" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="test_case_id" hidden>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={detail ? `BUG-${detail.number} ${detail.title}` : t('bug.detail')}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        width={560}
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label={t('bug.statusLabel')}>
                <Tag color={statusColor[detail.status]}>{t(`bug.status.${detail.status}`)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('bug.severityLabel')}>
                <Tag color={severityColor[detail.severity]}>
                  {t(`bug.severity.${detail.severity}`)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('bug.priorityLabel')}>
                {(detail.priority || '').toUpperCase()}
              </Descriptions.Item>
              <Descriptions.Item label={t('bug.reporter')}>
                {detail.reporter_id?.username || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('bug.assignee')}>
                {detail.assignee_id?.username || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('bug.description')}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{detail.description || '—'}</pre>
              </Descriptions.Item>
              {detail.external_url ? (
                <Descriptions.Item label={t('bug.externalUrl')}>
                  <Link href={detail.external_url} target="_blank" rel="noreferrer">
                    {detail.external_url}
                  </Link>
                </Descriptions.Item>
              ) : null}
              {detail.monitor_id ? (
                <Descriptions.Item label={t('bug.linkedMonitor')}>
                  {detail.monitor_id?.name || detail.monitor_id}
                </Descriptions.Item>
              ) : null}
              {detail.interface_id ? (
                <Descriptions.Item label={t('bug.linkedInterface')}>
                  {detail.interface_id?.title ||
                    `${detail.interface_id?.method || ''} ${detail.interface_id?.path || ''}` ||
                    detail.interface_id}
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            <Typography.Title level={5} style={{ marginTop: 24 }}>
              {t('bug.comments')}
            </Typography.Title>
            <List
              size="small"
              dataSource={detail.comments || []}
              locale={{ emptyText: t('bug.noComments') }}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong>{item.username || '—'}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                        </Text>
                      </Space>
                    }
                    description={
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.content}</pre>
                    }
                  />
                </List.Item>
              )}
            />
            <TextArea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={t('bug.commentPlaceholder')}
              style={{ marginTop: 12 }}
            />
            <Button
              type="primary"
              loading={commentLoading}
              onClick={submitComment}
              style={{ marginTop: 8 }}
              disabled={!comment.trim()}
            >
              {t('bug.addComment')}
            </Button>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default BugsPage;
