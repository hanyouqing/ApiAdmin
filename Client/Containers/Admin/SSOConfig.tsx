import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, Select, Tag, Switch, App } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

const { Option } = Select;
const { TextArea } = Input;

interface SSOProvider {
  _id?: string;
  name: string;
  type: 'saml' | 'oauth2' | 'oidc' | 'ldap' | 'cas';
  enabled: boolean;
  description?: string;
  config?: {
    // SAML
    issuer?: string;
    entryPoint?: string;
    cert?: string;
    callbackUrl?: string;
    // OAuth2/OIDC
    clientId?: string;
    clientSecret?: string;
    authorizationUrl?: string;
    tokenUrl?: string;
    userInfoUrl?: string;
    // LDAP
    host?: string;
    port?: number;
    baseDN?: string;
    // CAS
    serverUrl?: string;
    [key: string]: any;
  };
  roleMapping?: Record<string, string> | string;
  autoCreateUser?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const SSOConfig: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SSOProvider | null>(null);
  const [ssoType, setSsoType] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchProviders();
    }
  }, [user]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sso/providers');
      setProviders(response.data.data || []);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.sso.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProvider(null);
    setSsoType('');
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: SSOProvider) => {
    setEditingProvider(record);
    setSsoType(record.type);
    
    // 将后端数据格式转换为表单格式
    const formValues: any = {
      name: record.name,
      type: record.type,
      enabled: record.enabled,
      autoCreateUser: record.autoCreateUser,
      description: record.description || '',
      roleMapping: record.roleMapping 
        ? (typeof record.roleMapping === 'string' 
            ? record.roleMapping 
            : JSON.stringify(record.roleMapping, null, 2))
        : '',
    };

    // 根据类型展开 config 字段
    if (record.type === 'saml') {
      formValues.issuer = (record as any).config?.issuer || '';
      formValues.entryPoint = (record as any).config?.entryPoint || '';
      formValues.cert = (record as any).config?.cert || '';
      formValues.callbackUrl = (record as any).config?.callbackUrl || record.callbackUrl || '';
    } else if (record.type === 'oauth2' || record.type === 'oidc') {
      formValues.clientId = (record as any).config?.clientId || '';
      formValues.clientSecret = (record as any).config?.clientSecret || '';
      formValues.authorizationUrl = (record as any).config?.authorizationUrl || '';
      formValues.tokenUrl = (record as any).config?.tokenUrl || '';
      formValues.userInfoUrl = (record as any).config?.userInfoUrl || '';
      formValues.callbackUrl = (record as any).config?.callbackUrl || record.callbackUrl || '';
    } else if (record.type === 'ldap') {
      formValues.host = (record as any).config?.host || '';
      formValues.port = (record as any).config?.port || 389;
      formValues.baseDN = (record as any).config?.baseDN || '';
      formValues.callbackUrl = (record as any).config?.callbackUrl || record.callbackUrl || '';
    } else if (record.type === 'cas') {
      formValues.serverUrl = (record as any).config?.serverUrl || '';
      formValues.callbackUrl = (record as any).config?.callbackUrl || record.callbackUrl || '';
    }

    form.setFieldsValue(formValues);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('admin.sso.deleteConfirm'),
      content: t('admin.sso.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete(`/sso/providers/${id}`);
          message.success(t('admin.sso.deleteSuccess'));
          fetchProviders();
        } catch (error: any) {
          message.error(error.response?.data?.message || t('admin.sso.operationFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // 将表单字段映射到后端需要的格式
      let roleMapping = {};
      if (values.roleMapping) {
        try {
          roleMapping = typeof values.roleMapping === 'string' 
            ? (values.roleMapping.trim() ? JSON.parse(values.roleMapping) : {})
            : values.roleMapping;
        } catch (e) {
          message.error(t('admin.sso.invalidRoleMapping'));
          return;
        }
      }

      const providerData: any = {
        name: values.name,
        type: values.type,
        enabled: values.enabled !== undefined ? values.enabled : true,
        description: values.description || '',
        autoCreateUser: values.autoCreateUser !== undefined ? values.autoCreateUser : true,
        config: {},
        roleMapping,
      };

      // 根据类型设置配置
      if (values.type === 'saml') {
        providerData.config = {
          issuer: values.issuer || '',
          entryPoint: values.entryPoint || '',
          cert: values.cert || '',
          callbackUrl: values.callbackUrl || '',
        };
      } else if (values.type === 'oauth2' || values.type === 'oidc') {
        providerData.config = {
          clientId: values.clientId || '',
          clientSecret: values.clientSecret || '',
          authorizationUrl: values.authorizationUrl || '',
          tokenUrl: values.tokenUrl || '',
          userInfoUrl: values.userInfoUrl || '',
          callbackUrl: values.callbackUrl || '',
        };
      } else if (values.type === 'ldap') {
        providerData.config = {
          host: values.host || '',
          port: values.port || 389,
          baseDN: values.baseDN || '',
          callbackUrl: values.callbackUrl || '',
        };
      } else if (values.type === 'cas') {
        providerData.config = {
          serverUrl: values.serverUrl || '',
          callbackUrl: values.callbackUrl || '',
        };
      }

      if (editingProvider?._id) {
        await api.put(`/sso/providers/${editingProvider._id}`, providerData);
        message.success(t('admin.sso.updateSuccess'));
      } else {
        await api.post('/sso/providers', providerData);
        message.success(t('admin.sso.createSuccess'));
      }
      setModalVisible(false);
      form.resetFields();
      fetchProviders();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.sso.operationFailed'));
    }
  };

  const renderFormFields = () => {
    const type = ssoType || form.getFieldValue('type') || '';
    
    const commonFields = (
      <>
        <Form.Item name="name" label={t('admin.sso.name')} rules={[{ required: true, message: t('admin.sso.nameRequired') }]}>
          <Input placeholder={t('admin.sso.namePlaceholder')} />
        </Form.Item>
        <Form.Item name="type" label={t('admin.sso.type')} rules={[{ required: true, message: t('admin.sso.providerRequired') }]}>
          <Select 
            placeholder={t('admin.sso.providerRequired')}
            onChange={(value) => setSsoType(value)}
          >
            <Option value="saml">{t('admin.sso.type.saml')}</Option>
            <Option value="oauth2">{t('admin.sso.type.oauth2')}</Option>
            <Option value="oidc">{t('admin.sso.type.oidc')}</Option>
            <Option value="ldap">{t('admin.sso.type.ldap')}</Option>
            <Option value="cas">{t('admin.sso.type.cas')}</Option>
          </Select>
        </Form.Item>
        <Form.Item name="enabled" label={t('admin.sso.enabled')} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="autoCreateUser" label={t('admin.sso.autoCreateUser')} valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="description" label={t('admin.sso.description')}>
          <TextArea rows={2} placeholder={t('admin.sso.descriptionPlaceholder')} />
        </Form.Item>
        <Form.Item name="callbackUrl" label={t('admin.sso.callbackUrl')}>
          <Input placeholder="https://your-domain.com/api/sso/auth/{providerId}/callback" />
        </Form.Item>
      </>
    );

    if (type === 'saml') {
      return (
        <>
          {commonFields}
          <Form.Item name="issuer" label={t('admin.sso.issuer')}>
            <Input />
          </Form.Item>
          <Form.Item name="entryPoint" label={t('admin.sso.entryPoint')}>
            <Input />
          </Form.Item>
          <Form.Item name="cert" label={t('admin.sso.cert')}>
            <TextArea rows={4} placeholder="PEM format certificate" />
          </Form.Item>
        </>
      );
    }

    if (type === 'oauth2' || type === 'oidc') {
      return (
        <>
          {commonFields}
          <Form.Item name="clientId" label={t('admin.sso.clientId')}>
            <Input />
          </Form.Item>
          <Form.Item name="clientSecret" label={t('admin.sso.clientSecret')}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="authorizationUrl" label={t('admin.sso.authorizationUrl')}>
            <Input />
          </Form.Item>
          <Form.Item name="tokenUrl" label={t('admin.sso.tokenUrl')}>
            <Input />
          </Form.Item>
          {type === 'oidc' && (
            <Form.Item name="userInfoUrl" label={t('admin.sso.userInfoUrl')}>
              <Input />
            </Form.Item>
          )}
        </>
      );
    }

    if (type === 'ldap') {
      return (
        <>
          {commonFields}
          <Form.Item name="host" label="LDAP Host">
            <Input />
          </Form.Item>
          <Form.Item name="port" label="LDAP Port">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="baseDN" label="Base DN">
            <Input />
          </Form.Item>
        </>
      );
    }

    if (type === 'cas') {
      return (
        <>
          {commonFields}
          <Form.Item name="serverUrl" label="CAS Server URL">
            <Input />
          </Form.Item>
        </>
      );
    }

    return commonFields;
  };

  const columns = [
    {
      title: t('admin.sso.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('admin.sso.type'),
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          saml: t('admin.sso.type.saml'),
          oauth2: t('admin.sso.type.oauth2'),
          oidc: t('admin.sso.type.oidc'),
          ldap: t('admin.sso.type.ldap'),
          cas: t('admin.sso.type.cas'),
        };
        return <Tag>{typeMap[type] || type}</Tag>;
      },
    },
    {
      title: t('admin.sso.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        enabled ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      ),
    },
    {
      title: t('common.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => text ? new Date(text).toLocaleString() : '-',
    },
    {
      title: t('common.operation'),
      key: 'action',
      width: 200,
      render: (_: any, record: SSOProvider) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {t('common.edit')}
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record._id!)}>
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  return (
    <div>
      <Card
        title={t('admin.sso.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ color: '#ffffff' }}>
            {t('admin.sso.create')}
          </Button>
        }
      >
        <Table columns={columns} dataSource={providers} rowKey="_id" loading={loading} />
      </Card>

      <Modal
        title={editingProvider ? t('admin.sso.edit') : t('admin.sso.create')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          setSsoType('');
          form.resetFields();
        }}
        width={800}
      >
        <Form form={form} layout="vertical">
          {renderFormFields()}
          <Form.Item name="roleMapping" label={t('admin.sso.roleMapping')}>
            <TextArea rows={4} placeholder='{"sso_role": "system_role"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SSOConfig;

