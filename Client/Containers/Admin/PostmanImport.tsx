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
        messageApi.error('无效的JSON格式，请确保上传的是有效的Postman Collection JSON文件');
        setUploadedFile(null);
        return;
      }

      // 验证是否为Postman Collection格式
      if (!data.info || !data.item) {
        messageApi.error('无效的Postman Collection格式，请确保上传的是Postman导出的Collection文件');
        setUploadedFile(null);
        return;
      }

      const interfaces = parsePostmanCollection(data);
      setPreviewData(interfaces);
      
      if (interfaces.length === 0) {
        messageApi.warning('未找到可导入的接口，请检查Postman Collection文件');
      }
    } catch (error: any) {
      messageApi.error(error.message || '解析文件失败');
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
        messageApi.warning('请先选择Postman Collection文件');
        return;
      }

      if (previewData.length === 0) {
        messageApi.warning('没有可导入的接口数据');
        return;
      }

      setLoading(true);

      // 读取文件内容
      const fileContent = await uploadedFile.text();
      let postmanData;
      try {
        postmanData = JSON.parse(fileContent);
      } catch {
        messageApi.error('文件格式错误，无法解析JSON');
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
        `导入完成：成功导入 ${importResult.imported} 个接口，跳过 ${importResult.skipped} 个已存在的接口`
      );
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || '导入失败');
    } finally {
      setLoading(false);
    }
  };

  const previewColumns = [
    {
      title: '请求方法',
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
      title: '接口路径',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: '接口名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => text || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => (text ? (typeof text === 'string' ? text : text.content || '-') : '-'),
    },
  ];

  return (
    <div>
      <Card title="Postman Collection 导入">
        <Form form={form} layout="vertical">
          <Form.Item
            name="project_id"
            label="目标项目"
            rules={[{ required: true, message: '请选择目标项目' }]}
          >
            <Select placeholder="请选择要导入到的项目">
              {projects.map((project: any) => (
                <Option key={project._id} value={project._id}>
                  {project.project_name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="上传文件">
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
              <Button icon={<UploadOutlined />}>选择Postman Collection文件</Button>
            </Upload>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              支持Postman导出的Collection JSON格式文件
            </Text>
            {uploadedFile && (
              <div style={{ marginTop: 8, color: '#666' }}>
                已选择: {uploadedFile.name}
              </div>
            )}
          </Form.Item>

          <Form.Item name="import_mode" label="导入模式" initialValue="normal">
            <Select>
              <Option value="normal">普通模式（跳过已存在的接口）</Option>
              <Option value="good">智能合并（合并响应数据，保留已有修改）</Option>
              <Option value="mergin">完全覆盖（完全使用新数据）</Option>
            </Select>
          </Form.Item>

          {previewData.length > 0 && (
            <Form.Item label="预览">
              <Alert
                message={`找到 ${previewData.length} 个接口，请确认后导入`}
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
                message="导入完成"
                description={
                  <div>
                    <div>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      成功导入 {importResult.imported} 个接口
                    </div>
                    {importResult.skipped > 0 && (
                      <div style={{ marginTop: 8 }}>
                        跳过 {importResult.skipped} 个已存在的接口
                      </div>
                    )}
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="danger">{importResult.errors.length} 个接口导入失败</Text>
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
                开始导入
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
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PostmanImport;

