import React, { useState } from 'react';
import { Card, Button, Form, Select, Upload, Space, Typography, Alert, Table, Tag, App } from 'antd';
import { UploadOutlined, ImportOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { api } from '../../Utils/api';
import { fetchProjects } from '../../Reducer/Modules/Project';
import type { AppDispatch, RootState } from '../../Reducer/Create';

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
  name?: string;
  description?: string;
}

const PostmanImport: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { message: messageApi } = App.useApp();
  const user = useSelector((state: RootState) => state.user.user);
  const { projects } = useSelector((state: RootState) => state.project);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewInterface[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  React.useEffect(() => {
    if (user) {
      // @ts-ignore - fetchProjects accepts optional groupId parameter
      dispatch(fetchProjects());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const parsePostmanCollection = (collection: any): PreviewInterface[] => {
    const interfaces: PreviewInterface[] = [];

    const processItem = (item: any) => {
      if (item.request) {
        // 这是一个请求项
        const url = item.request.url;
        let path = '';
        let method = 'GET';

        // 处理Postman URL格式
        if (typeof url === 'string') {
          path = url;
        } else if (url) {
          // Postman URL对象格式
          if (url.raw) {
            // 使用raw URL，但需要移除协议和域名部分
            try {
              const urlObj = new URL(url.raw);
              path = urlObj.pathname + urlObj.search;
            } catch {
              // 如果不是完整URL，直接使用raw
              path = url.raw;
            }
          } else if (url.path) {
            // 使用path数组
            if (Array.isArray(url.path)) {
              path = '/' + url.path.filter((p: string) => p).join('/');
            } else {
              path = url.path;
            }
            // 添加查询参数
            if (url.query && Array.isArray(url.query) && url.query.length > 0) {
              const queryString = url.query
                .filter((q: any) => q.key && !q.disabled)
                .map((q: any) => `${q.key}=${q.value || ''}`)
                .join('&');
              if (queryString) {
                path += '?' + queryString;
              }
            }
          }
        }

        if (item.request.method) {
          method = item.request.method.toUpperCase();
        }

        interfaces.push({
          path: path || '/',
          method: method,
          name: item.name || '',
          description: item.request.description 
            ? (typeof item.request.description === 'string' 
                ? item.request.description 
                : item.request.description.content || '')
            : '',
        });
      }

      // 处理子项（文件夹）
      if (item.item && Array.isArray(item.item)) {
        item.item.forEach((subItem: any) => processItem(subItem));
      }
    };

    if (collection.item && Array.isArray(collection.item)) {
      collection.item.forEach((item: any) => processItem(item));
    }

    return interfaces;
  };

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      setUploadedFile(file);
      const text = await file.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (error) {
        messageApi.error(t('admin.postmanImport.invalidJson'));
        setUploadedFile(null);
        return;
      }

      // 验证是否为Postman Collection格式
      if (!data.info || !data.item) {
        messageApi.error(t('admin.postmanImport.invalidFormat'));
        setUploadedFile(null);
        return;
      }

      const interfaces = parsePostmanCollection(data);
      setPreviewData(interfaces);
      
      if (interfaces.length === 0) {
        messageApi.warning(t('admin.postmanImport.noInterfaces'));
      }
    } catch (error: any) {
      messageApi.error(error.message || t('admin.postmanImport.parseFailed'));
      setPreviewData([]);
      setUploadedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const values = await form.validateFields();
      const { project_id, import_mode } = values;

      if (!uploadedFile) {
        messageApi.warning(t('admin.postmanImport.selectFileFirst'));
        return;
      }

      if (previewData.length === 0) {
        messageApi.warning(t('admin.postmanImport.noData'));
        return;
      }

      setLoading(true);

      // 读取文件内容
      const fileContent = await uploadedFile.text();
      let postmanData;
      try {
        postmanData = JSON.parse(fileContent);
      } catch {
        messageApi.error(t('admin.postmanImport.fileFormatError'));
        return;
      }

      const result = await api.post('/import', {
        project_id,
        format: 'postman',
        mode: import_mode || 'normal',
        data: postmanData,
      });

      const importResult: ImportResult = result.data.data || {
        imported: 0,
        skipped: 0,
        errors: [],
      };

      setImportResult(importResult);
      messageApi.success(
        t('admin.postmanImport.importSuccess', {
          imported: importResult.imported,
          skipped: importResult.skipped,
        })
      );
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.postmanImport.importFailed'));
    } finally {
      setLoading(false);
    }
  };

  const previewColumns = [
    {
      title: t('admin.postmanImport.requestMethod'),
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
          HEAD: 'cyan',
          OPTIONS: 'geekblue',
        };
        return <Tag color={colorMap[method] || 'default'}>{method}</Tag>;
      },
    },
    {
      title: t('admin.postmanImport.interfacePath'),
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: t('admin.postmanImport.interfaceName'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => text || '-',
    },
    {
      title: t('admin.postmanImport.description'),
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (text ? (typeof text === 'string' ? text : text.content || '-') : '-'),
    },
  ];

  return (
    <div>
      <Card title={t('admin.postmanImport.title')}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="project_id"
            label={t('admin.postmanImport.targetProject')}
            rules={[{ required: true, message: t('admin.postmanImport.targetProjectRequired') }]}
          >
            <Select placeholder={t('admin.postmanImport.selectProject')}>
              {projects.map((project: any) => (
                <Option key={project._id} value={project._id}>
                  {project.project_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label={t('admin.postmanImport.uploadFile')}>
            <Upload
              accept=".json"
              beforeUpload={(file) => {
                handleFileUpload(file);
                return false;
              }}
              maxCount={1}
              showUploadList={true}
              onRemove={() => {
                setUploadedFile(null);
                setPreviewData([]);
                setImportResult(null);
              }}
            >
              <Button icon={<UploadOutlined />}>{t('admin.postmanImport.selectFile')}</Button>
            </Upload>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              {t('admin.postmanImport.fileFormatHint')}
            </Text>
            {uploadedFile && (
              <div style={{ marginTop: 8, color: '#666' }}>
                {t('admin.postmanImport.fileSelected')}: {uploadedFile.name}
              </div>
            )}
          </Form.Item>

          <Form.Item name="import_mode" label={t('admin.postmanImport.importMode')} initialValue="normal">
            <Select>
              <Option value="normal">{t('admin.postmanImport.modeNormal')}</Option>
              <Option value="good">{t('admin.postmanImport.modeGood')}</Option>
              <Option value="mergin">{t('admin.postmanImport.modeMergin')}</Option>
            </Select>
          </Form.Item>

          {previewData.length > 0 && (
            <Form.Item label={t('admin.postmanImport.preview')}>
              <Alert
                message={t('admin.postmanImport.previewMessage', { count: previewData.length })}
                type="info"
                style={{ marginBottom: 16 }}
              />
              <Table
                columns={previewColumns}
                dataSource={previewData}
                rowKey={(record, index) => `${record.method}-${record.path}-${index}`}
                pagination={{ pageSize: 10 }}
                size="small"
              />
            </Form.Item>
          )}

          {importResult && (
            <Form.Item>
              <Alert
                message={t('admin.postmanImport.importComplete')}
                description={
                  <div>
                    <div>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      {t('admin.postmanImport.imported', { count: importResult.imported })}
                    </div>
                    {importResult.skipped > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {t('admin.postmanImport.skipped', { count: importResult.skipped })}
                      </div>
                    )}
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="danger">{t('admin.postmanImport.errors', { count: importResult.errors.length })}</Text>
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
                disabled={!previewData.length || !uploadedFile}
                style={{ color: '#ffffff' }}
                htmlType="button"
              >
                {t('admin.postmanImport.import')}
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  setPreviewData([]);
                  setImportResult(null);
                  setUploadedFile(null);
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

export default PostmanImport;

