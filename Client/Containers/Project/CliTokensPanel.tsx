import React, { useCallback, useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, App, Typography, Alert, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';

const { Paragraph, Text } = Typography;

interface CliTokenRow {
  id: string;
  name: string;
  tokenPrefix?: string;
  projectId?: { _id?: string; project_name?: string } | string | null;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string;
}

interface CliTokensPanelProps {
  projectId: string;
}

const CliTokensPanel: React.FC<CliTokensPanelProps> = ({ projectId }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [tokens, setTokens] = useState<CliTokenRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [form] = Form.useForm();

  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/cicd/tokens');
      const list: CliTokenRow[] = res.data?.data || [];
      setTokens(
        list.filter((tok) => {
          if (!tok.projectId) return true;
          const id = typeof tok.projectId === 'string' ? tok.projectId : tok.projectId?._id;
          return !id || id === projectId;
        })
      );
    } catch (error: any) {
      message.error(error.message || t('cicd.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [projectId, message, t]);

  useEffect(() => {
    if (projectId) loadTokens();
  }, [projectId, loadTokens]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      const res = await api.post('/cicd/tokens', {
        name: values.name,
        projectId,
      });
      const token = res.data?.data?.token;
      setRawToken(token || null);
      message.success(t('cicd.createSuccess'));
      form.resetFields();
      await loadTokens();
    } catch (error: any) {
      message.error(error.message || t('cicd.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('cicd.deleteConfirm'),
      onOk: async () => {
        try {
          await api.delete(`/cicd/tokens/${id}`);
          message.success(t('cicd.deleteSuccess'));
          await loadTokens();
        } catch (error: any) {
          message.error(error.message || t('cicd.deleteFailed'));
        }
      },
    });
  };

  const columns = [
    {
      title: t('cicd.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('cicd.prefix'),
      dataIndex: 'tokenPrefix',
      key: 'tokenPrefix',
      render: (v: string) => (v ? <Text code>{v}…</Text> : '-'),
    },
    {
      title: t('cicd.scope'),
      key: 'scope',
      render: (_: any, record: CliTokenRow) => {
        if (!record.projectId) return <Tag>{t('cicd.global')}</Tag>;
        const name =
          typeof record.projectId === 'object'
            ? record.projectId.project_name
            : t('cicd.projectScoped');
        return <Tag color="blue">{name || t('cicd.projectScoped')}</Tag>;
      },
    },
    {
      title: t('common.operation'),
      key: 'action',
      render: (_: any, record: CliTokenRow) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          aria-label={t('common.delete')}
          onClick={() => handleDelete(record.id)}
        >
          {t('common.delete')}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={t('cicd.hint')}
        description={
          <Text code>
            apiadmin run-collection --url &lt;host&gt; --token $TOKEN --collection &lt;id&gt; --format junit
          </Text>
        }
      />
      <Card
        title={t('cicd.title')}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setRawToken(null);
              setModalVisible(true);
            }}
            style={{ color: '#ffffff' }}
          >
            {t('cicd.create')}
          </Button>
        }
      >
        <Table rowKey="id" loading={loading} columns={columns} dataSource={tokens} pagination={false} />
      </Card>

      <Modal
        title={t('cicd.create')}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setRawToken(null);
          form.resetFields();
        }}
        onOk={rawToken ? undefined : handleCreate}
        confirmLoading={creating}
        footer={
          rawToken
            ? [
                <Button
                  key="close"
                  type="primary"
                  onClick={() => {
                    setModalVisible(false);
                    setRawToken(null);
                  }}
                  style={{ color: '#ffffff' }}
                >
                  {t('common.close')}
                </Button>,
              ]
            : undefined
        }
      >
        {rawToken ? (
          <div>
            <Alert type="warning" showIcon message={t('cicd.tokenOnce')} style={{ marginBottom: 12 }} />
            <Paragraph copyable={{ text: rawToken, tooltips: [t('common.copy'), t('common.copied')] }}>
              <Text code>{rawToken}</Text>
            </Paragraph>
            <Button
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(rawToken);
                message.success(t('common.copied'));
              }}
            >
              {t('common.copy')}
            </Button>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label={t('cicd.name')}
              rules={[{ required: true, message: t('cicd.nameRequired') }]}
            >
              <Input placeholder={t('cicd.namePlaceholder')} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default CliTokensPanel;
