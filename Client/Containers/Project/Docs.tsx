import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Button,
  Space,
  Table,
  Tag,
  Typography,
  Descriptions,
  Collapse,
  Empty,
  Modal,
  App,
  Alert,
} from 'antd';
import { FileTextOutlined, CloudUploadOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

const { Paragraph, Text, Title } = Typography;

interface DocVersion {
  _id: string;
  version: string;
  version_number: number;
  title: string;
  description?: string;
  published: boolean;
  is_current: boolean;
  published_at?: string;
  createdAt?: string;
  content?: {
    project?: { name?: string; description?: string };
    interfaces?: Array<{
      id: string;
      title: string;
      path: string;
      method: string;
      description?: string;
    }>;
  };
  openapi_spec?: any;
  created_by?: { username?: string };
  published_by?: { username?: string };
}

const Docs: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { currentProject } = useSelector((state: RootState) => state.project);

  const projectId = useMemo(() => {
    if (params.projectId && params.projectId !== 'docs') return params.projectId;
    const pathMatch = location.pathname.match(/\/project\/([^/]+)/);
    if (pathMatch?.[1] && pathMatch[1] !== 'docs') return pathMatch[1];
    return currentProject?._id || '';
  }, [params.projectId, location.pathname, currentProject?._id]);

  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [published, setPublished] = useState<DocVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocVersion | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [versionsRes, publishedRes] = await Promise.all([
        api.get('/docs/versions', { params: { projectId } }),
        api.get('/docs/published', { params: { projectId } }).catch(() => null),
      ]);
      setVersions(versionsRes.data?.data || []);
      setPublished(publishedRes?.data?.data || null);
    } catch (error: any) {
      message.error(error.message || t('docs.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [projectId, message, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      await api.post('/docs/generate', { projectId });
      message.success(t('docs.generateSuccess'));
      await loadData();
    } catch (error: any) {
      message.error(error.message || t('docs.generateFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (documentId: string) => {
    try {
      await api.post('/docs/publish', { documentId, projectId });
      message.success(t('docs.publishSuccess'));
      await loadData();
    } catch (error: any) {
      message.error(error.message || t('docs.publishFailed'));
    }
  };

  const openPreview = (doc: DocVersion | null) => {
    if (!doc) {
      message.warning(t('docs.noPublished'));
      return;
    }
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const columns = [
    {
      title: t('docs.version'),
      dataIndex: 'version',
      key: 'version',
      render: (v: string, record: DocVersion) => (
        <Space>
          <Text>{v}</Text>
          {record.published && <Tag color="green">{t('docs.published')}</Tag>}
          {record.is_current && <Tag color="blue">{t('docs.current')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('docs.title'),
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: t('docs.createdBy'),
      key: 'created_by',
      render: (_: any, record: DocVersion) => record.created_by?.username || '-',
    },
    {
      title: t('common.operation'),
      key: 'action',
      render: (_: any, record: DocVersion) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            aria-label={t('docs.preview')}
            onClick={() => openPreview(record)}
          >
            {t('docs.preview')}
          </Button>
          {!record.published && (
            <Button
              type="link"
              icon={<CloudUploadOutlined />}
              onClick={() => handlePublish(record._id)}
            >
              {t('docs.publish')}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const previewInterfaces = previewDoc?.content?.interfaces || [];

  return (
    <div>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            {t('docs.title')}
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              {t('common.refresh')}
            </Button>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={handleGenerate}
              loading={generating}
              style={{ color: '#ffffff' }}
            >
              {t('docs.generate')}
            </Button>
            <Button
              icon={<EyeOutlined />}
              onClick={() => openPreview(published)}
              disabled={!published}
            >
              {t('docs.viewPortal')}
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={t('docs.hint')}
        />

        {published ? (
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label={t('docs.publishedVersion')}>
              {published.version}
            </Descriptions.Item>
            <Descriptions.Item label={t('docs.publishedAt')}>
              {published.published_at
                ? new Date(published.published_at).toLocaleString()
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('docs.title')} span={2}>
              {published.title}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty
            style={{ marginBottom: 16 }}
            description={t('docs.noPublished')}
          />
        )}

        <Table
          rowKey="_id"
          loading={loading}
          columns={columns}
          dataSource={versions}
          locale={{ emptyText: <Empty description={t('docs.emptyVersions')} /> }}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={previewDoc?.title || t('docs.preview')}
        open={previewOpen}
        onCancel={() => {
          setPreviewOpen(false);
          setPreviewDoc(null);
        }}
        footer={null}
        width={900}
      >
        {previewDoc && (
          <div>
            <Title level={4}>{previewDoc.title}</Title>
            <Paragraph type="secondary">{previewDoc.description}</Paragraph>
            <Tag>{previewDoc.version}</Tag>
            {previewDoc.published && <Tag color="green">{t('docs.published')}</Tag>}

            <Title level={5} style={{ marginTop: 16 }}>
              {t('docs.interfaces')}
            </Title>
            {previewInterfaces.length === 0 ? (
              <Empty description={t('docs.noInterfaces')} />
            ) : (
              <Collapse
                items={previewInterfaces.map((iface) => ({
                  key: iface.id,
                  label: (
                    <Space>
                      <Tag color="blue">{iface.method}</Tag>
                      <Text code>{iface.path}</Text>
                      <Text>{iface.title}</Text>
                    </Space>
                  ),
                  children: (
                    <Paragraph>{iface.description || t('docs.noDescription')}</Paragraph>
                  ),
                }))}
              />
            )}

            {previewDoc.openapi_spec && (
              <>
                <Title level={5} style={{ marginTop: 16 }}>
                  OpenAPI
                </Title>
                <Paragraph>
                  <pre
                    style={{
                      background: '#f5f5f5',
                      padding: 12,
                      borderRadius: 4,
                      maxHeight: 320,
                      overflow: 'auto',
                    }}
                  >
                    {JSON.stringify(previewDoc.openapi_spec, null, 2)}
                  </pre>
                </Paragraph>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Docs;
