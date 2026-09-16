import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Form,
  Input,
  Switch,
  Select,
  Tag,
  App,
  Modal,
  Divider,
  Typography,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';

const { Text } = Typography;

interface VariableEntry {
  key: string;
  value: string;
  enabled: boolean;
  type: 'default' | 'secret';
}

interface Props {
  projectId: string;
}

const VariablesPanel: React.FC<Props> = ({ projectId }) => {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globals, setGlobals] = useState<VariableEntry[]>([]);
  const [environments, setEnvironments] = useState<any[]>([]);
  const [legacyEnv, setLegacyEnv] = useState<any[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | undefined>();
  const [envVariables, setEnvVariables] = useState<VariableEntry[]>([]);
  const [envBaseUrl, setEnvBaseUrl] = useState('');
  const [envForm] = Form.useForm();

  const mapToEntries = (map: Record<string, any> = {}): VariableEntry[] =>
    Object.entries(map).map(([key, value]) => ({
      key,
      value: value == null ? '' : String(value),
      enabled: true,
      type: 'default' as const,
    }));

  const entriesToMap = (entries: VariableEntry[]) => {
    const out: Record<string, string> = {};
    entries.forEach((e) => {
      if (e.enabled !== false && e.key?.trim()) out[e.key.trim()] = e.value ?? '';
    });
    return out;
  };

  const fetchAll = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.get(`/projects/${projectId}/variables`);
      const data = res.data?.data || {};
      setGlobals(Array.isArray(data.globals) ? data.globals : []);
      setEnvironments(data.environments || []);
      setLegacyEnv(data.legacy_project_env || []);
      if (data.environments?.length) {
        const first = data.environments[0];
        setSelectedEnvId(first._id);
        setEnvBaseUrl(first.base_url || '');
        setEnvVariables(mapToEntries(first.variables || {}));
      } else {
        setSelectedEnvId(undefined);
        setEnvVariables([]);
        setEnvBaseUrl('');
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.variables.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [projectId, messageApi, t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSelectEnv = (id: string) => {
    setSelectedEnvId(id);
    const env = environments.find((e) => e._id === id);
    setEnvBaseUrl(env?.base_url || '');
    setEnvVariables(mapToEntries(env?.variables || {}));
  };

  const saveGlobals = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/variables/globals`, { globals });
      messageApi.success(t('project.variables.globalsSaved'));
      fetchAll();
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.variables.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const saveEnvVariables = async () => {
    if (!selectedEnvId) {
      messageApi.warning(t('project.variables.selectEnvironment'));
      return;
    }
    setSaving(true);
    try {
      await api.put(`/test/environments/${selectedEnvId}`, {
        base_url: envBaseUrl,
        variables: entriesToMap(envVariables),
      });
      messageApi.success(t('project.variables.envSaved'));
      fetchAll();
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.variables.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const createEnvironment = async () => {
    try {
      const values = await envForm.validateFields();
      await api.post('/test/environments', {
        project_id: projectId,
        name: values.name,
        base_url: values.base_url,
        is_default: !!values.is_default,
        variables: {},
      });
      messageApi.success(t('project.environment.createSuccess'));
      envForm.resetFields();
      Modal.destroyAll();
      fetchAll();
    } catch (error: any) {
      if (error?.errorFields) return;
      messageApi.error(error.response?.data?.message || t('project.environment.operationFailed'));
    }
  };

  const showCreateEnv = () => {
    envForm.resetFields();
    Modal.confirm({
      title: t('project.environment.create'),
      icon: null,
      width: 480,
      content: (
        <Form form={envForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label={t('project.environment.name')}
            rules={[{ required: true, message: t('project.environment.nameRequired') }]}
          >
            <Input placeholder={t('project.environment.namePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="base_url"
            label={t('project.environment.host')}
            rules={[{ required: true, message: t('project.environment.hostRequired') }]}
          >
            <Input placeholder={t('project.environment.hostPlaceholder')} />
          </Form.Item>
          <Form.Item name="is_default" label={t('project.environment.setAsDefault')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      ),
      onOk: createEnvironment,
      okText: t('common.save') || '保存',
    });
  };

  const syncLegacy = async () => {
    try {
      await api.post(`/projects/${projectId}/variables/sync-legacy`, { merge_globals: false });
      messageApi.success(t('project.variables.syncSuccess'));
      fetchAll();
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('project.variables.syncFailed'));
    }
  };

  const entryColumns = (rows: VariableEntry[], setRows: (v: VariableEntry[]) => void) => [
    {
      title: t('project.variables.key'),
      dataIndex: 'key',
      render: (_: any, __: any, index: number) => (
        <Input
          value={rows[index]?.key}
          onChange={(e) => {
            const next = [...rows];
            next[index] = { ...next[index], key: e.target.value };
            setRows(next);
          }}
        />
      ),
    },
    {
      title: t('project.variables.value'),
      dataIndex: 'value',
      render: (_: any, record: VariableEntry, index: number) => (
        <Input.Password
          visibilityToggle
          value={record.value}
          onChange={(e) => {
            const next = [...rows];
            next[index] = { ...next[index], value: e.target.value };
            setRows(next);
          }}
        />
      ),
    },
    {
      title: t('project.variables.enabled'),
      dataIndex: 'enabled',
      width: 80,
      render: (enabled: boolean, _: any, index: number) => (
        <Switch
          checked={enabled !== false}
          onChange={(checked) => {
            const next = [...rows];
            next[index] = { ...next[index], enabled: checked };
            setRows(next);
          }}
        />
      ),
    },
    {
      title: t('common.actions') || '操作',
      width: 80,
      render: (_: any, __: any, index: number) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setRows(rows.filter((_, i) => i !== index))}
        />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 960 }}>
      <Card
        loading={loading}
        title={t('project.variables.globalsTitle')}
        extra={
          <Space>
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                setGlobals([...globals, { key: '', value: '', enabled: true, type: 'default' }])
              }
            >
              {t('project.variables.addRow')}
            </Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveGlobals}>
              {t('project.variables.saveGlobals')}
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {t('project.variables.globalsHint')}
        </Text>
        <Table
          size="small"
          pagination={false}
          rowKey={(_, i) => `g-${i}`}
          dataSource={globals}
          columns={entryColumns(globals, setGlobals)}
          locale={{ emptyText: t('project.variables.empty') }}
        />
      </Card>

      <Card
        loading={loading}
        title={t('project.variables.envTitle')}
        extra={
          <Space>
            <Select
              style={{ minWidth: 200 }}
              placeholder={t('project.variables.selectEnvironment')}
              value={selectedEnvId}
              onChange={handleSelectEnv}
              options={environments.map((e) => ({
                value: e._id,
                label: `${e.name}${e.is_default ? ' (default)' : ''}`,
              }))}
            />
            <Button icon={<PlusOutlined />} onClick={showCreateEnv}>
              {t('project.environment.create')}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!selectedEnvId}
              onClick={saveEnvVariables}
            >
              {t('project.variables.saveEnv')}
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Form layout="vertical">
          <Form.Item label={t('project.environment.host')}>
            <Input
              value={envBaseUrl}
              onChange={(e) => setEnvBaseUrl(e.target.value)}
              disabled={!selectedEnvId}
              placeholder={t('project.environment.hostPlaceholder')}
            />
          </Form.Item>
        </Form>
        <Space style={{ marginBottom: 12 }}>
          <Button
            icon={<PlusOutlined />}
            disabled={!selectedEnvId}
            onClick={() =>
              setEnvVariables([
                ...envVariables,
                { key: '', value: '', enabled: true, type: 'default' },
              ])
            }
          >
            {t('project.variables.addRow')}
          </Button>
        </Space>
        <Table
          size="small"
          pagination={false}
          rowKey={(_, i) => `e-${i}`}
          dataSource={envVariables}
          columns={entryColumns(envVariables, setEnvVariables)}
          locale={{ emptyText: t('project.variables.empty') }}
        />
      </Card>

      <Card title={t('project.variables.legacyTitle')}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {t('project.variables.legacyHint')}
        </Text>
        <Space style={{ marginBottom: 12 }}>
          <Tag>{legacyEnv.length} {t('project.variables.legacyCount')}</Tag>
          <Button icon={<SyncOutlined />} onClick={syncLegacy} disabled={!legacyEnv.length}>
            {t('project.variables.syncLegacy')}
          </Button>
        </Space>
        <Divider style={{ margin: '12px 0' }} />
        <Table
          size="small"
          pagination={false}
          rowKey="name"
          dataSource={legacyEnv}
          columns={[
            { title: t('project.environment.name'), dataIndex: 'name' },
            {
              title: t('project.environment.host'),
              dataIndex: 'host',
              render: (v: string, row: any) => v || row.base_url || '-',
            },
            {
              title: t('project.environment.variables'),
              dataIndex: 'variables',
              render: (variables: any) => (
                <Tag>{Object.keys(variables || {}).length} {t('project.environment.variablesCount')}</Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default VariablesPanel;
