import React, { useState } from 'react';
import { Card, Button, Form, Input, Select, Upload, Space, Typography, Alert, Table, Tag, App } from 'antd';
import { UploadOutlined, LinkOutlined, ImportOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { api } from '../../Utils/api';
import { fetchProjects } from '../../Reducer/Modules/Project';
import type { AppDispatch, RootState } from '../../Reducer/Create';

const { useWatch } = Form;

const { Option } = Select;
const { Text } = Typography;

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface PreviewInterface {
  path: string;
  method: string;
  summary?: string;
  description?: string;
}

const SwaggerImport: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { message: messageApi } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const { projects } = useSelector((state: RootState) => state.project);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewInterface[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  
  // 使用 useWatch 监听 swagger_url 字段值，避免在 disabled 中直接调用 form.getFieldValue
  const swaggerUrl = useWatch('swagger_url', form);

  React.useEffect(() => {
    if (user) {
      // @ts-ignore - fetchProjects accepts optional groupId parameter
      dispatch(fetchProjects());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSwaggerUrlChange = async (url: string) => {
    if (!url || !url.trim()) {
      setPreviewData([]);
      return;
    }

    try {
      setLoading(true);
      // 验证URL格式
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        messageApi.warning(t('admin.swaggerImport.invalidUrl'));
        return;
      }

      // 尝试获取Swagger文档
      // 如果 URL 不包含 .json，尝试自动添加
      let fetchUrl = url;
      if (!url.endsWith('.json') && !url.includes('/swagger.json') && !url.includes('/openapi.json')) {
        // 如果 URL 以 /swagger 或 /swagger-ui 结尾，尝试添加 .json
        if (url.endsWith('/swagger') || url.endsWith('/swagger-ui')) {
          fetchUrl = url.replace(/\/swagger(-ui)?$/, '/swagger.json');
        } else if (url.endsWith('/')) {
          fetchUrl = url + 'swagger.json';
        } else {
          fetchUrl = url + '/swagger.json';
        }
      }

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // 如果第一次请求失败，且 URL 被修改过，尝试原始 URL
        if (fetchUrl !== url) {
          const originalResponse = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });
          if (originalResponse.ok) {
            const contentType = originalResponse.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const data = await originalResponse.json();
              const interfaces = parseSwaggerDoc(data);
              setPreviewData(interfaces);
              return;
            }
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let data;

      // 先获取文本内容，检查是否是 HTML
      const text = await response.text();
      
      // 检查是否是 HTML 页面
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('服务器返回了 HTML 页面而不是 JSON。请确保 URL 指向 Swagger JSON 文件（例如：/swagger.json）');
      }

      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`JSON 解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
        }
      } else if (contentType.includes('application/yaml') || contentType.includes('text/yaml')) {
        // 如果是YAML，需要解析（这里简化处理，实际可能需要yaml解析库）
        messageApi.warning(t('admin.swaggerImport.yamlNotSupported'));
        return;
      } else {
        // 尝试作为JSON解析
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error(`无法解析响应内容。请确保 URL 指向有效的 Swagger JSON 文件。错误: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
        }
      }

      // 解析Swagger文档，提取接口信息
      const interfaces = parseSwaggerDoc(data);
      setPreviewData(interfaces);
      // 重置分页到第一页
      setPagination({ current: 1, pageSize: pagination.pageSize });
    } catch (error: any) {
      messageApi.error(error.message || t('admin.swaggerImport.fetchFailed'));
      setPreviewData([]);
    } finally {
      setLoading(false);
    }
  };

  const parseSwaggerDoc = (doc: any): PreviewInterface[] => {
    const interfaces: PreviewInterface[] = [];
    const paths = doc.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      if (typeof pathItem !== 'object' || pathItem === null) continue;

      for (const [method, operation] of Object.entries(pathItem)) {
        if (!['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
          continue;
        }

        if (typeof operation !== 'object' || operation === null) continue;

        interfaces.push({
          path,
          method: method.toUpperCase(),
          summary: (operation as any).summary || '',
          description: (operation as any).description || '',
        });
      }
    }

    return interfaces;
  };

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      const text = await file.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        // 可能是YAML格式
        messageApi.warning(t('admin.swaggerImport.yamlNotSupported'));
        return;
      }

      const interfaces = parseSwaggerDoc(data);
      setPreviewData(interfaces);
      // 重置分页到第一页
      setPagination({ current: 1, pageSize: pagination.pageSize });
    } catch (error: any) {
      messageApi.error(error.message || t('admin.swaggerImport.parseFailed'));
      setPreviewData([]);
      setPagination({ current: 1, pageSize: 10 });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const values = await form.validateFields();
      const { project_id, swagger_url, import_mode } = values;

      if (!previewData.length && !swagger_url) {
        messageApi.warning(t('admin.swaggerImport.noDataToImport'));
        return;
      }

      setLoading(true);

      let swaggerData;
      if (swagger_url) {
        // 从URL获取
        // 如果 URL 不包含 .json，尝试自动添加
        let fetchUrl = swagger_url;
        if (!swagger_url.endsWith('.json') && !swagger_url.includes('/swagger.json') && !swagger_url.includes('/openapi.json')) {
          // 如果 URL 以 /swagger 或 /swagger-ui 结尾，尝试添加 .json
          if (swagger_url.endsWith('/swagger') || swagger_url.endsWith('/swagger-ui')) {
            fetchUrl = swagger_url.replace(/\/swagger(-ui)?$/, '/swagger.json');
          } else if (swagger_url.endsWith('/')) {
            fetchUrl = swagger_url + 'swagger.json';
          } else {
            fetchUrl = swagger_url + '/swagger.json';
          }
        }

        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          // 如果第一次请求失败，且 URL 被修改过，尝试原始 URL
          if (fetchUrl !== swagger_url) {
            const originalResponse = await fetch(swagger_url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            });
            if (originalResponse.ok) {
              const contentType = originalResponse.headers.get('content-type') || '';
              if (contentType.includes('application/json')) {
                const text = await originalResponse.text();
                if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                  throw new Error('服务器返回了 HTML 页面而不是 JSON。请使用 /swagger.json 端点');
                }
                swaggerData = JSON.parse(text);
              } else {
                throw new Error(`HTTP ${originalResponse.status}: ${originalResponse.statusText}`);
              }
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } else {
          const text = await response.text();
          
          // 检查是否是 HTML 页面
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error('服务器返回了 HTML 页面而不是 JSON。请确保 URL 指向 Swagger JSON 文件（例如：/swagger.json）');
          }

          try {
            swaggerData = JSON.parse(text);
          } catch (parseError) {
            throw new Error(`JSON 解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
          }
        }
      } else {
        // 从预览数据重新构建（这里简化处理）
        messageApi.warning(t('admin.swaggerImport.pleaseProvideUrl'));
        return;
      }

      const result = await api.post('/import', {
        project_id,
        format: 'swagger',
        mode: import_mode || 'normal',
        data: swaggerData,
      });

      const importResult: ImportResult = result.data.data || {
        imported: 0,
        skipped: 0,
        errors: [],
      };

      setImportResult(importResult);
      messageApi.success(
        t('admin.swaggerImport.importSuccess', {
          imported: importResult.imported,
          skipped: importResult.skipped,
        })
      );
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.swaggerImport.importFailed'));
    } finally {
      setLoading(false);
    }
  };

  const previewColumns = [
    {
      title: t('admin.swaggerImport.method'),
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (method: string) => {
        const colorMap: Record<string, string> = {
          GET: 'green',
          POST: 'blue',
          PUT: 'orange',
          DELETE: 'red',
          PATCH: 'purple',
        };
        return <Tag color={colorMap[method]}>{method}</Tag>;
      },
    },
    {
      title: t('admin.swaggerImport.path'),
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: t('admin.swaggerImport.summary'),
      dataIndex: 'summary',
      key: 'summary',
      render: (text: string) => text || '-',
    },
  ];

  return (
    <div>
      <Card title={t('admin.swaggerImport.title')}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="project_id"
            label={t('admin.swaggerImport.project')}
            rules={[{ required: true, message: t('admin.swaggerImport.projectRequired') }]}
          >
            <Select placeholder={t('admin.swaggerImport.selectProject')}>
              {projects.map((project: any) => (
                <Option key={project._id} value={project._id}>
                  {project.project_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="swagger_url"
            label={t('admin.swaggerImport.swaggerUrl')}
            rules={[{ type: 'url', message: t('admin.swaggerImport.invalidUrl') }]}
          >
            <Input
              placeholder={t('admin.swaggerImport.swaggerUrlPlaceholder')}
              prefix={<LinkOutlined />}
              onChange={(e) => {
                form.setFieldsValue({ swagger_url: e.target.value });
                handleSwaggerUrlChange(e.target.value);
              }}
            />
          </Form.Item>

          <Form.Item label={t('admin.swaggerImport.uploadFile')}>
            <Upload
              accept=".json,.yaml,.yml"
              beforeUpload={(file) => {
                handleFileUpload(file);
                return false;
              }}
              maxCount={1}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />}>{t('admin.swaggerImport.selectFile')}</Button>
            </Upload>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {t('admin.swaggerImport.fileFormatHint')}
            </Text>
          </Form.Item>

          <Form.Item name="import_mode" label={t('admin.swaggerImport.importMode')} initialValue="normal">
            <Select>
              <Option value="normal">{t('admin.swaggerImport.mode.normal')}</Option>
              <Option value="good">{t('admin.swaggerImport.mode.good')}</Option>
              <Option value="mergin">{t('admin.swaggerImport.mode.mergin')}</Option>
            </Select>
          </Form.Item>

          {previewData.length > 0 && (
            <Form.Item label={t('admin.swaggerImport.preview')}>
              <Alert
                message={t('admin.swaggerImport.previewMessage').replace('{count}', String(previewData.length))}
                type="info"
                style={{ marginBottom: 16 }}
              />
              <Table
                columns={previewColumns}
                dataSource={previewData}
                rowKey={(record) => `${record.method}-${record.path}`}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: previewData.length,
                  showSizeChanger: true,
                  showTotal: (total) => t('admin.swaggerImport.total', { total }),
                  pageSizeOptions: ['10', '20', '50', '100'],
                  onChange: (page, pageSize) => {
                    setPagination({
                      current: page,
                      pageSize: pageSize || 10,
                    });
                  },
                  onShowSizeChange: (_current, size) => {
                    setPagination({
                      current: 1,
                      pageSize: size,
                    });
                  },
                }}
                size="small"
              />
            </Form.Item>
          )}

          {importResult && (
            <Form.Item>
              <Alert
                message={t('admin.swaggerImport.importComplete')}
                description={
                  <div>
                    <div>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      {t('admin.swaggerImport.imported').replace('{count}', String(importResult.imported))}
                    </div>
                    {importResult.skipped > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {t('admin.swaggerImport.skipped').replace('{count}', String(importResult.skipped))}
                      </div>
                    )}
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="danger">{t('admin.swaggerImport.errors').replace('{count}', String(importResult.errors.length))}</Text>
                        <ul style={{ marginTop: 8, marginBottom: 0 }}>
                          {importResult.errors.map((error: any, index: number) => (
                            <li key={index}>
                              {typeof error === 'string' ? error : `${error.path} ${error.method}: ${error.error || error}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                }
                type={importResult.errors && importResult.errors.length > 0 ? 'warning' : 'success'}
                style={{ marginBottom: 16 }}
              />
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<ImportOutlined />}
                onClick={handleImport}
                loading={loading}
                disabled={!previewData.length && !swaggerUrl}
                style={{ 
                  color: '#ffffff',
                  backgroundColor: '#096dd9',
                  borderColor: '#096dd9',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0050b3';
                  e.currentTarget.style.borderColor = '#0050b3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#096dd9';
                  e.currentTarget.style.borderColor = '#096dd9';
                }}
                htmlType="button"
              >
                {t('admin.swaggerImport.import')}
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  setPreviewData([]);
                  setImportResult(null);
                  setPagination({ current: 1, pageSize: 10 });
                }}
                htmlType="button"
              >
                {t('common.reset')}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SwaggerImport;

