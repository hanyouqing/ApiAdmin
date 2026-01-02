import React, { useEffect, useState } from 'react';
import { Card, Form, Switch, Input, Button, Tabs, Space, App, Typography } from 'antd';
import { MailOutlined, AppstoreOutlined, LinkOutlined, MessageOutlined, DingtalkOutlined, SlackOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';

const { Text } = Typography;

interface NotificationSettingsData {
  email: {
    interfaceChange: boolean;
    testFailed: boolean;
    projectUpdate: boolean;
    system: boolean;
  };
  inApp: {
    interfaceChange: boolean;
    testFailed: boolean;
    projectUpdate: boolean;
    system: boolean;
  };
  webhook: {
    enabled: boolean;
    url: string;
  };
  feishu: {
    enabled: boolean;
    webhookUrl: string;
    secret: string;
    interfaceChange: boolean;
    testFailed: boolean;
    projectUpdate: boolean;
    system: boolean;
  };
  dingtalk: {
    enabled: boolean;
    webhookUrl: string;
    secret: string;
    interfaceChange: boolean;
    testFailed: boolean;
    projectUpdate: boolean;
    system: boolean;
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    interfaceChange: boolean;
    testFailed: boolean;
    projectUpdate: boolean;
    system: boolean;
  };
}

const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setFetching(true);
    try {
      const response = await api.get('/notifications/settings');
      const data = response.data.data;
      form.setFieldsValue({
        'email.interfaceChange': data.email?.interfaceChange ?? true,
        'email.testFailed': data.email?.testFailed ?? true,
        'email.projectUpdate': data.email?.projectUpdate ?? false,
        'email.system': data.email?.system ?? true,
        'inApp.interfaceChange': data.inApp?.interfaceChange ?? true,
        'inApp.testFailed': data.inApp?.testFailed ?? true,
        'inApp.projectUpdate': data.inApp?.projectUpdate ?? true,
        'inApp.system': data.inApp?.system ?? true,
        'webhook.enabled': data.webhook?.enabled ?? false,
        'webhook.url': data.webhook?.url ?? '',
        'feishu.enabled': data.feishu?.enabled ?? false,
        'feishu.webhookUrl': data.feishu?.webhookUrl ?? '',
        'feishu.secret': data.feishu?.secret ?? '',
        'feishu.interfaceChange': data.feishu?.interfaceChange ?? true,
        'feishu.testFailed': data.feishu?.testFailed ?? true,
        'feishu.projectUpdate': data.feishu?.projectUpdate ?? false,
        'feishu.system': data.feishu?.system ?? true,
        'dingtalk.enabled': data.dingtalk?.enabled ?? false,
        'dingtalk.webhookUrl': data.dingtalk?.webhookUrl ?? '',
        'dingtalk.secret': data.dingtalk?.secret ?? '',
        'dingtalk.interfaceChange': data.dingtalk?.interfaceChange ?? true,
        'dingtalk.testFailed': data.dingtalk?.testFailed ?? true,
        'dingtalk.projectUpdate': data.dingtalk?.projectUpdate ?? false,
        'dingtalk.system': data.dingtalk?.system ?? true,
        'slack.enabled': data.slack?.enabled ?? false,
        'slack.webhookUrl': data.slack?.webhookUrl ?? '',
        'slack.channel': data.slack?.channel ?? '',
        'slack.interfaceChange': data.slack?.interfaceChange ?? true,
        'slack.testFailed': data.slack?.testFailed ?? true,
        'slack.projectUpdate': data.slack?.projectUpdate ?? false,
        'slack.system': data.slack?.system ?? true,
      });
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('user.notificationSettings.fetchFailed'));
    } finally {
      setFetching(false);
    }
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const settings: NotificationSettingsData = {
        email: {
          interfaceChange: values['email.interfaceChange'] ?? true,
          testFailed: values['email.testFailed'] ?? true,
          projectUpdate: values['email.projectUpdate'] ?? false,
          system: values['email.system'] ?? true,
        },
        inApp: {
          interfaceChange: values['inApp.interfaceChange'] ?? true,
          testFailed: values['inApp.testFailed'] ?? true,
          projectUpdate: values['inApp.projectUpdate'] ?? true,
          system: values['inApp.system'] ?? true,
        },
        webhook: {
          enabled: values['webhook.enabled'] ?? false,
          url: values['webhook.url'] ?? '',
        },
        feishu: {
          enabled: values['feishu.enabled'] ?? false,
          webhookUrl: values['feishu.webhookUrl'] ?? '',
          secret: values['feishu.secret'] ?? '',
          interfaceChange: values['feishu.interfaceChange'] ?? true,
          testFailed: values['feishu.testFailed'] ?? true,
          projectUpdate: values['feishu.projectUpdate'] ?? false,
          system: values['feishu.system'] ?? true,
        },
        dingtalk: {
          enabled: values['dingtalk.enabled'] ?? false,
          webhookUrl: values['dingtalk.webhookUrl'] ?? '',
          secret: values['dingtalk.secret'] ?? '',
          interfaceChange: values['dingtalk.interfaceChange'] ?? true,
          testFailed: values['dingtalk.testFailed'] ?? true,
          projectUpdate: values['dingtalk.projectUpdate'] ?? false,
          system: values['dingtalk.system'] ?? true,
        },
        slack: {
          enabled: values['slack.enabled'] ?? false,
          webhookUrl: values['slack.webhookUrl'] ?? '',
          channel: values['slack.channel'] ?? '',
          interfaceChange: values['slack.interfaceChange'] ?? true,
          testFailed: values['slack.testFailed'] ?? true,
          projectUpdate: values['slack.projectUpdate'] ?? false,
          system: values['slack.system'] ?? true,
        },
      };

      await api.put('/notifications/settings', settings);
      messageApi.success(t('user.notificationSettings.updateSuccess'));
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('user.notificationSettings.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const webhookEnabled = Form.useWatch('webhook.enabled', form);
  const feishuEnabled = Form.useWatch('feishu.enabled', form);
  const dingtalkEnabled = Form.useWatch('dingtalk.enabled', form);
  const slackEnabled = Form.useWatch('slack.enabled', form);

  const renderEmailTab = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Text type="secondary">{t('user.notificationSettings.email.description')}</Text>
      <Form.Item
        name="email.interfaceChange"
        label={t('user.notificationSettings.email.interfaceChange')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="email.testFailed"
        label={t('user.notificationSettings.email.testFailed')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="email.projectUpdate"
        label={t('user.notificationSettings.email.projectUpdate')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="email.system"
        label={t('user.notificationSettings.email.system')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
    </Space>
  );

  const renderInAppTab = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Text type="secondary">{t('user.notificationSettings.inApp.description')}</Text>
      <Form.Item
        name="inApp.interfaceChange"
        label={t('user.notificationSettings.inApp.interfaceChange')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="inApp.testFailed"
        label={t('user.notificationSettings.inApp.testFailed')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="inApp.projectUpdate"
        label={t('user.notificationSettings.inApp.projectUpdate')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item
        name="inApp.system"
        label={t('user.notificationSettings.inApp.system')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
    </Space>
  );

  const renderWebhookTab = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Text type="secondary">{t('user.notificationSettings.webhook.description')}</Text>
      <Form.Item
        name="webhook.enabled"
        label={t('user.notificationSettings.webhook.enabled')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      {webhookEnabled && (
        <Form.Item
          name="webhook.url"
          label={t('user.notificationSettings.webhook.url')}
          rules={[
            { required: true, message: t('user.notificationSettings.webhook.urlRequired') },
            { type: 'url', message: t('user.notificationSettings.webhook.urlInvalid') },
          ]}
        >
          <Input placeholder="https://example.com/webhook" />
        </Form.Item>
      )}
    </Space>
  );

  const renderFeishuTab = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Text type="secondary">{t('user.notificationSettings.feishu.description')}</Text>
      <Form.Item
        name="feishu.enabled"
        label={t('user.notificationSettings.feishu.enabled')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      {feishuEnabled && (
        <>
          <Form.Item
            name="feishu.webhookUrl"
            label={t('user.notificationSettings.feishu.webhookUrl')}
            rules={[
              { required: true, message: t('user.notificationSettings.feishu.webhookUrlRequired') },
              { type: 'url', message: t('user.notificationSettings.feishu.webhookUrlInvalid') },
            ]}
          >
            <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
          </Form.Item>
          <Form.Item
            name="feishu.secret"
            label={t('user.notificationSettings.feishu.secret')}
            tooltip={t('user.notificationSettings.feishu.secretTooltip')}
          >
            <Input.Password placeholder={t('user.notificationSettings.feishu.secretPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="feishu.interfaceChange"
            label={t('user.notificationSettings.feishu.interfaceChange')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="feishu.testFailed"
            label={t('user.notificationSettings.feishu.testFailed')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="feishu.projectUpdate"
            label={t('user.notificationSettings.feishu.projectUpdate')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="feishu.system"
            label={t('user.notificationSettings.feishu.system')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </>
      )}
    </Space>
  );

  const renderDingtalkTab = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Text type="secondary">{t('user.notificationSettings.dingtalk.description')}</Text>
      <Form.Item
        name="dingtalk.enabled"
        label={t('user.notificationSettings.dingtalk.enabled')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      {dingtalkEnabled && (
        <>
          <Form.Item
            name="dingtalk.webhookUrl"
            label={t('user.notificationSettings.dingtalk.webhookUrl')}
            rules={[
              { required: true, message: t('user.notificationSettings.dingtalk.webhookUrlRequired') },
              { type: 'url', message: t('user.notificationSettings.dingtalk.webhookUrlInvalid') },
            ]}
          >
            <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
          </Form.Item>
          <Form.Item
            name="dingtalk.secret"
            label={t('user.notificationSettings.dingtalk.secret')}
            tooltip={t('user.notificationSettings.dingtalk.secretTooltip')}
          >
            <Input.Password placeholder={t('user.notificationSettings.dingtalk.secretPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="dingtalk.interfaceChange"
            label={t('user.notificationSettings.dingtalk.interfaceChange')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="dingtalk.testFailed"
            label={t('user.notificationSettings.dingtalk.testFailed')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="dingtalk.projectUpdate"
            label={t('user.notificationSettings.dingtalk.projectUpdate')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="dingtalk.system"
            label={t('user.notificationSettings.dingtalk.system')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </>
      )}
    </Space>
  );

  const renderSlackTab = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Text type="secondary">{t('user.notificationSettings.slack.description')}</Text>
      <Form.Item
        name="slack.enabled"
        label={t('user.notificationSettings.slack.enabled')}
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      {slackEnabled && (
        <>
          <Form.Item
            name="slack.webhookUrl"
            label={t('user.notificationSettings.slack.webhookUrl')}
            rules={[
              { required: true, message: t('user.notificationSettings.slack.webhookUrlRequired') },
              { type: 'url', message: t('user.notificationSettings.slack.webhookUrlInvalid') },
            ]}
          >
            <Input placeholder="https://hooks.slack.com/services/..." />
          </Form.Item>
          <Form.Item
            name="slack.channel"
            label={t('user.notificationSettings.slack.channel')}
            tooltip={t('user.notificationSettings.slack.channelTooltip')}
          >
            <Input placeholder="#general" />
          </Form.Item>
          <Form.Item
            name="slack.interfaceChange"
            label={t('user.notificationSettings.slack.interfaceChange')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="slack.testFailed"
            label={t('user.notificationSettings.slack.testFailed')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="slack.projectUpdate"
            label={t('user.notificationSettings.slack.projectUpdate')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="slack.system"
            label={t('user.notificationSettings.slack.system')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </>
      )}
    </Space>
  );

  const tabItems = [
    {
      key: 'email',
      label: (
        <span>
          <MailOutlined /> {t('user.notificationSettings.email.title')}
        </span>
      ),
      children: renderEmailTab(),
    },
    {
      key: 'inApp',
      label: (
        <span>
          <AppstoreOutlined /> {t('user.notificationSettings.inApp.title')}
        </span>
      ),
      children: renderInAppTab(),
    },
    {
      key: 'webhook',
      label: (
        <span>
          <LinkOutlined /> {t('user.notificationSettings.webhook.title')}
        </span>
      ),
      children: renderWebhookTab(),
    },
    {
      key: 'feishu',
      label: (
        <span>
          <MessageOutlined /> {t('user.notificationSettings.feishu.title')}
        </span>
      ),
      children: renderFeishuTab(),
    },
    {
      key: 'dingtalk',
      label: (
        <span>
          <DingtalkOutlined /> {t('user.notificationSettings.dingtalk.title')}
        </span>
      ),
      children: renderDingtalkTab(),
    },
    {
      key: 'slack',
      label: (
        <span>
          <SlackOutlined /> {t('user.notificationSettings.slack.title')}
        </span>
      ),
      children: renderSlackTab(),
    },
  ];

  return (
    <Card title={t('user.notificationSettings.title')} loading={fetching}>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 1000 }}>
        <Tabs items={tabItems} />
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Button type="primary" htmlType="submit" loading={loading} style={{ color: '#ffffff' }}>
            {t('common.save')}
          </Button>
        </div>
      </Form>
    </Card>
  );
};

export default NotificationSettings;

