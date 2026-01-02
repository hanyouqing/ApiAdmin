import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, message, Switch, InputNumber, Collapse, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { api } from '../../Utils/api';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../Reducer/Create';

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { Text } = Typography;

interface TestRule {
  _id: string;
  name: string;
  type: 'assertion' | 'request' | 'response';
  enabled: boolean;
  assertion_rules?: any;
  request_config?: any;
  response_config?: any;
  description?: string;
}

const TestRules: React.FC = () => {
  const params = useParams<{ projectId?: string }>();
  const location = useLocation();
  const { currentProject } = useSelector((state: RootState) => state.project);
  const { t } = useTranslation();

  const projectId = useMemo(() => {
    if (params.projectId) {
      return params.projectId;
    }
    const pathMatch = location.pathname.match(/\/project\/([^/]+)/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    return currentProject?._id || '';
  }, [params.projectId, location.pathname, currentProject?._id]);

  const [rules, setRules] = useState<TestRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<TestRule | null>(null);
  const [form] = Form.useForm();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (projectId && projectId !== 'test' && projectId !== 'interface' && projectId !== 'setting' && projectId !== 'activity') {
      fetchRules();
    }
  }, [projectId, typeFilter]);

  const fetchRules = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const params: any = { projectId };
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }
      const response = await api.get('/test/rules', { params });
      setRules(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('test.rules.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      type: 'assertion',
      assertion_rules: {
        status_code_check: true,
        response_time_check: false,
        max_response_time: 5000,
        response_format_check: true,
        custom_assertions: [],
      },
      request_config: {
        timeout: 30000,
        retry_count: 0,
        retry_delay: 1000,
        follow_redirects: true,
        verify_ssl: true,
        default_headers: {},
      },
      response_config: {
        validate_schema: false,
        extract_variables: [],
      },
    });
    setModalVisible(true);
  };

  const handleEdit = (record: TestRule) => {
    setEditingRule(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('test.rules.deleteConfirm'),
      content: t('test.rules.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete(`/test/rules/${id}`);
          message.success(t('test.rules.deleteSuccess'));
          fetchRules();
        } catch (error: any) {
          message.error(error.response?.data?.message || t('test.rules.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRule) {
        await api.put(`/test/rules/${editingRule._id}`, values);
        message.success(t('test.rules.updateSuccess'));
      } else {
        await api.post('/test/rules', {
          ...values,
          projectId,
        });
        message.success(t('test.rules.createSuccess'));
      }
      setModalVisible(false);
      fetchRules();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('test.rules.operationFailed'));
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      assertion: 'blue',
      request: 'green',
      response: 'orange',
    };
    return colors[type] || 'default';
  };

  const columns = [
    {
      title: t('test.rules.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('test.rules.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{t(`test.rules.type.${type}`)}</Tag>
      ),
    },
    {
      title: t('test.rules.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? t('common.enabled') : t('common.disabled')}
        </Tag>
      ),
    },
    {
      title: t('test.rules.description'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: any, record: TestRule) => (
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

  const renderRuleForm = () => {
    const ruleType = Form.useWatch('type', form);

    return (
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={t('test.rules.name')}
          rules={[{ required: true, message: t('test.rules.nameRequired') }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="type"
          label={t('test.rules.type')}
          rules={[{ required: true, message: t('test.rules.typeRequired') }]}
        >
          <Select disabled={!!editingRule}>
            <Option value="assertion">{t('test.rules.type.assertion')}</Option>
            <Option value="request">{t('test.rules.type.request')}</Option>
            <Option value="response">{t('test.rules.type.response')}</Option>
          </Select>
        </Form.Item>
        <Form.Item name="enabled" label={t('test.rules.enabled')} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="description" label={t('test.rules.description')}>
          <TextArea rows={3} />
        </Form.Item>

        {ruleType === 'assertion' && (
          <Collapse>
            <Panel header={t('test.rules.assertionRules')} key="assertion">
              <Form.Item
                name={['assertion_rules', 'status_code_check']}
                label={t('test.rules.statusCodeCheck')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name={['assertion_rules', 'response_time_check']}
                label={t('test.rules.responseTimeCheck')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name={['assertion_rules', 'max_response_time']}
                label={t('test.rules.maxResponseTime')}
              >
                <InputNumber min={0} addonAfter="ms" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={['assertion_rules', 'response_format_check']}
                label={t('test.rules.responseFormatCheck')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Panel>
          </Collapse>
        )}

        {ruleType === 'request' && (
          <Collapse>
            <Panel header={t('test.rules.requestConfig')} key="request">
              <Form.Item
                name={['request_config', 'timeout']}
                label={t('test.rules.timeout')}
              >
                <InputNumber min={0} addonAfter="ms" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={['request_config', 'retry_count']}
                label={t('test.rules.retryCount')}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={['request_config', 'retry_delay']}
                label={t('test.rules.retryDelay')}
              >
                <InputNumber min={0} addonAfter="ms" style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name={['request_config', 'follow_redirects']}
                label={t('test.rules.followRedirects')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                name={['request_config', 'verify_ssl']}
                label={t('test.rules.verifySsl')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Panel>
          </Collapse>
        )}

        {ruleType === 'response' && (
          <Collapse>
            <Panel header={t('test.rules.responseConfig')} key="response">
              <Form.Item
                name={['response_config', 'validate_schema']}
                label={t('test.rules.validateSchema')}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Panel>
          </Collapse>
        )}
      </Form>
    );
  };

  const filteredRules = typeFilter === 'all' ? rules : rules.filter((r) => r.type === typeFilter);

  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <span>{t('test.rules.title')}</span>
        </Space>
      }
      extra={
        <Space>
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 150 }}
          >
            <Option value="all">{t('test.rules.filter.all')}</Option>
            <Option value="assertion">{t('test.rules.type.assertion')}</Option>
            <Option value="request">{t('test.rules.type.request')}</Option>
            <Option value="response">{t('test.rules.type.response')}</Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('test.rules.create')}
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={filteredRules}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingRule ? t('test.rules.edit') : t('test.rules.create')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={800}
        destroyOnClose
      >
        {renderRuleForm()}
      </Modal>
    </Card>
  );
};

export default TestRules;

