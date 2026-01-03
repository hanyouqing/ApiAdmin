import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Switch, Button, Tabs, InputNumber, Space, App } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { api } from '../../Utils/api';
import type { RootState } from '../../Reducer/Create';

interface AIConfigData {
  _id?: string;
  provider: 'openai' | 'deepseek' | 'doubao' | 'gemini' | 'kimi' | 'aliyun' | 'custom';
  name: string;
  enabled: boolean;
  api_key: string;
  api_endpoint?: string;
  model: string;
  max_tokens: number;
  temperature: number;
  timeout: number;
  usage_count?: number;
  config?: Record<string, any>;
}

const AIConfig: React.FC = () => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<Record<string, AIConfigData>>({});
  
  const [openaiForm] = Form.useForm();
  const [geminiForm] = Form.useForm();
  const [deepseekForm] = Form.useForm();
  const [doubaoForm] = Form.useForm();
  const [kimiForm] = Form.useForm();
  const [aliyunForm] = Form.useForm();
  const [customForm] = Form.useForm();

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchConfigs();
    }
  }, [user]);

  // 当配置加载完成后，设置表单值
  useEffect(() => {
    if (Object.keys(configs).length > 0) {
      const setFormValues = (provider: string, form: any) => {
        const config = configs[provider];
        if (config) {
          form.setFieldsValue({
            name: config.name || '',
            enabled: config.enabled || false,
            api_key: config.api_key || '',
            api_endpoint: config.api_endpoint || '',
            model: config.model || getDefaultModel(provider),
            max_tokens: config.max_tokens || 2000,
            temperature: config.temperature || 0.7,
            timeout: config.timeout || 30000,
          });
        } else {
          form.setFieldsValue({
            name: '',
            enabled: false,
            api_key: '',
            api_endpoint: '',
            model: getDefaultModel(provider),
            max_tokens: 2000,
            temperature: 0.7,
            timeout: 30000,
          });
        }
      };
      
      // 使用 setTimeout 确保表单已经渲染
      const timer = setTimeout(() => {
        setFormValues('openai', openaiForm);
        setFormValues('gemini', geminiForm);
        setFormValues('deepseek', deepseekForm);
        setFormValues('doubao', doubaoForm);
        setFormValues('kimi', kimiForm);
        setFormValues('aliyun', aliyunForm);
        setFormValues('custom', customForm);
      }, 100);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/ai/configs');
      const configList = response.data.data || [];
      
      const configMap: Record<string, AIConfigData> = {};
      configList.forEach((config: AIConfigData) => {
        configMap[config.provider] = config;
      });
      setConfigs(configMap);
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.ai.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getDefaultModel = (provider: string): string => {
    const defaults: Record<string, string> = {
      openai: 'gpt-3.5-turbo',
      gemini: 'gemini-pro',
      deepseek: 'deepseek-chat',
      doubao: 'doubao-pro-32k',
      kimi: 'moonshot-v1-8k',
      aliyun: 'qwen-turbo',
      custom: '',
    };
    return defaults[provider] || '';
  };

  const getDefaultEndpoint = (provider: string): string => {
    const defaults: Record<string, string> = {
      openai: 'https://api.openai.com/v1/chat/completions',
      gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      doubao: 'https://ark.cn-beijing.volces.com/api/v3',
      kimi: 'https://api.moonshot.cn/v1/chat/completions',
      aliyun: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      custom: '',
    };
    return defaults[provider] || '';
  };

  const handleSave = async (provider: string, form: any) => {
    try {
      const values = await form.validateFields();
      
      const configData: any = {
        provider,
        name: values.name || provider,
        enabled: values.enabled || false,
        api_key: values.api_key || '',
        api_endpoint: values.api_endpoint || getDefaultEndpoint(provider),
        model: values.model || getDefaultModel(provider),
        max_tokens: values.max_tokens || 2000,
        temperature: values.temperature || 0.7,
        timeout: values.timeout || 30000,
      };

      await api.post('/admin/ai/configs', configData);
      message.success(t('admin.ai.updateSuccess'));
      fetchConfigs();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.ai.saveFailed'));
    }
  };

  const handleTest = async (provider: string) => {
    try {
      const config = configs[provider];
      if (!config || !config.enabled) {
        message.warning(t('admin.test.saveAndEnableFirst'));
        return;
      }
      await api.post(`/admin/ai/configs/${provider}/test`);
      message.success(t('admin.ai.testSuccess'));
    } catch (error: any) {
      message.error(error.response?.data?.message || t('admin.ai.testFailed'));
    }
  };

  const renderForm = (provider: string, form: any) => {
    const config = configs[provider];
    const isEnabled = config?.enabled || false;

    return (
      <Form form={form} layout="vertical">
        <Form.Item name="enabled" label={t('admin.ai.enabled')} valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item
          name="name"
          label={t('admin.ai.name')}
          rules={[{ required: true, message: t('admin.ai.nameRequired') }]}
        >
          <Input placeholder={t('admin.ai.namePlaceholder')} />
        </Form.Item>

        <Form.Item
          name="api_key"
          label={t('admin.ai.apiKey')}
          rules={[{ required: true, message: t('admin.ai.apiKeyRequired') }]}
          tooltip={t('admin.ai.apiKeyTooltip')}
        >
          <Input.Password placeholder={t('admin.ai.apiKeyPlaceholder')} />
        </Form.Item>

        <Form.Item
          name="api_endpoint"
          label={t('admin.ai.apiEndpoint')}
          tooltip={t('admin.ai.apiEndpointTooltip')}
        >
          <Input placeholder={getDefaultEndpoint(provider)} />
        </Form.Item>

        <Form.Item
          name="model"
          label={t('admin.ai.model')}
          tooltip={t('admin.ai.modelTooltip')}
        >
          <Input placeholder={getDefaultModel(provider)} />
        </Form.Item>

        <Form.Item
          name="max_tokens"
          label={t('admin.ai.maxTokens')}
          tooltip={t('admin.ai.maxTokensTooltip')}
        >
          <InputNumber min={1} max={100000} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="temperature"
          label={t('admin.ai.temperature')}
          tooltip={t('admin.ai.temperatureTooltip')}
        >
          <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="timeout"
          label={t('admin.ai.timeout')}
          tooltip={t('admin.ai.timeoutTooltip')}
        >
          <InputNumber min={1000} max={300000} style={{ width: '100%' }} />
        </Form.Item>

        {config && (
          <Form.Item label={t('admin.ai.usageCount')}>
            <Input value={config.usage_count || 0} disabled />
          </Form.Item>
        )}

        <Form.Item>
          <Space>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave(provider, form)}>
              {t('common.save')}
            </Button>
            {isEnabled && (
              <Button onClick={() => handleTest(provider)}>
                {t('admin.ai.test')}
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    );
  };

  if (user?.role !== 'super_admin') {
    return <div>{t('admin.noPermission')}</div>;
  }

  const tabItems = [
    {
      key: 'openai',
      label: t('admin.ai.openai'),
      children: renderForm('openai', openaiForm),
    },
    {
      key: 'gemini',
      label: t('admin.ai.gemini'),
      children: renderForm('gemini', geminiForm),
    },
    {
      key: 'deepseek',
      label: t('admin.ai.deepseek'),
      children: renderForm('deepseek', deepseekForm),
    },
    {
      key: 'doubao',
      label: t('admin.ai.doubao'),
      children: renderForm('doubao', doubaoForm),
    },
    {
      key: 'kimi',
      label: t('admin.ai.kimi'),
      children: renderForm('kimi', kimiForm),
    },
    {
      key: 'aliyun',
      label: t('admin.ai.aliyun'),
      children: renderForm('aliyun', aliyunForm),
    },
    {
      key: 'custom',
      label: t('admin.ai.custom'),
      children: renderForm('custom', customForm),
    },
  ];

  return (
    <Card title={t('admin.ai.title')} loading={loading}>
      <Tabs items={tabItems} />
    </Card>
  );
};

export default AIConfig;
