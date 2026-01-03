import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  App,
  Descriptions,
  Typography,
  Collapse,
  Switch,
  InputNumber,
  Divider,
  Empty,
  Upload,
  Radio,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SettingOutlined,
  ImportOutlined,
  ExportOutlined,
  CopyOutlined,
  HolderOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { api } from '../../Utils/api';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../Reducer/Create';
import { setTestPipelineRunning } from '../../Reducer/Modules/UI';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 拖拽项类型
const DRAG_TYPE = 'TEST_CASE';

// 可拖拽的测试用例项组件
interface DraggableTestCaseItemProps {
  testCase: TestCase;
  index: number;
  interfaceData: any;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onOrderChange: (index: number, newOrder: number) => void;
  onRunSingle: (index: number) => void;
  isRunning?: boolean;
  totalCases: number;
  isFirst: boolean;
  isLast: boolean;
}

const DraggableTestCaseItem: React.FC<DraggableTestCaseItemProps> = ({
  testCase,
  index,
  interfaceData,
  onMove,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onOrderChange,
  onRunSingle,
  isRunning = false,
  totalCases,
  isFirst,
  isLast,
}) => {
  const { message: messageApi } = App.useApp();
  const ref = React.useRef<HTMLDivElement>(null);
  const lastHoverIndex = React.useRef<number>(-1);
  const [isEditingOrder, setIsEditingOrder] = React.useState(false);
  const [orderValue, setOrderValue] = React.useState(index + 1);
  const inputRef = React.useRef<any>(null);

  const [{ isDragging }, drag] = useDrag({
    type: DRAG_TYPE,
    item: () => ({ index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: DRAG_TYPE,
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // 避免重复调用
      if (dragIndex === hoverIndex || hoverIndex === lastHoverIndex.current) {
        return;
      }

      // 检查是否真的在悬停在这个元素上
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // 只有当鼠标在元素的上半部分或下半部分时才移动
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      lastHoverIndex.current = hoverIndex;
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  // 处理双击编辑编号
  const handleDoubleClick = () => {
    setIsEditingOrder(true);
    setOrderValue(index + 1);
    // 延迟聚焦，确保输入框已渲染
    setTimeout(() => {
      inputRef.current?.focus?.();
      inputRef.current?.select?.();
    }, 0);
  };

  // 处理编号变更
  const handleOrderChange = (newOrder: number) => {
    if (newOrder < 1 || newOrder > totalCases) {
      messageApi.warning(`编号必须在 1 到 ${totalCases} 之间`);
      setOrderValue(index + 1);
      setIsEditingOrder(false);
      return;
    }
    
    if (newOrder === index + 1) {
      setIsEditingOrder(false);
      return;
    }
    
    onOrderChange(index, newOrder - 1);
    setIsEditingOrder(false);
  };

  // 处理输入框失焦
  const handleBlur = () => {
    handleOrderChange(orderValue);
  };

  // 处理回车键
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleOrderChange(orderValue);
    } else if (e.key === 'Escape') {
      setOrderValue(index + 1);
      setIsEditingOrder(false);
    }
  };

  // 当 index 变化时更新 orderValue
  React.useEffect(() => {
    if (!isEditingOrder) {
      setOrderValue(index + 1);
    }
  }, [index, isEditingOrder]);

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        backgroundColor: isOver ? '#f0f0f0' : 'transparent',
        transition: 'background-color 0.2s',
      }}
    >
      <Card
        size="small"
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <HolderOutlined style={{ color: '#999', cursor: 'move' }} />
            {isEditingOrder ? (
              <InputNumber
                ref={inputRef}
                value={orderValue}
                min={1}
                max={totalCases}
                size="small"
                style={{ width: 60 }}
                onBlur={handleBlur}
                onPressEnter={handleKeyPress}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setOrderValue(index + 1);
                    setIsEditingOrder(false);
                  }
                }}
                onChange={(value) => {
                  if (value !== null && value !== undefined) {
                    setOrderValue(value);
                  }
                }}
                autoFocus
              />
            ) : (
              <Tag
                onDoubleClick={handleDoubleClick}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="双击编辑编号"
              >
                {index + 1}
              </Tag>
            )}
            <Tag color={testCase.enabled ? 'green' : 'default'}>
              {testCase.enabled ? '启用' : '禁用'}
            </Tag>
            <Text strong>
              {interfaceData ? `${interfaceData.method || ''} ${interfaceData.path || ''}`.trim() || t('admin.test.pipeline.unknownInterface') : t('admin.test.pipeline.unknownInterface')}
            </Text>
          </Space>
          <Space>
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => onRunSingle(index)}
              loading={isRunning}
              disabled={!testCase.enabled || isRunning}
              size="small"
              style={{ color: '#1890ff' }}
            >
              运行
            </Button>
            <Button
              type="link"
              icon={<ArrowUpOutlined />}
              onClick={() => onMoveUp(index)}
              disabled={isFirst}
              size="small"
            >
              上移
            </Button>
            <Button
              type="link"
              icon={<ArrowDownOutlined />}
              onClick={() => onMoveDown(index)}
              disabled={isLast}
              size="small"
            >
              下移
            </Button>
            <Button
              type="link"
              icon={<SettingOutlined />}
              onClick={() => onEdit(index)}
              size="small"
            >
              配置
            </Button>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(index)}
              size="small"
            >
              删除
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

interface TestCase {
  _id?: string;
  interface_id: string;
  order: number;
  enabled: boolean;
  custom_headers?: Record<string, any>;
  custom_data?: Record<string, any>;
  path_params?: Record<string, any>;
  query_params?: Record<string, any>;
  assertion_script?: string;
}

interface TestTask {
  _id: string;
  name: string;
  description?: string;
  project_id: string;
  test_cases: TestCase[];
  environment_id?: string;
  base_url?: string;
  code_repository_id?: string;
  ai_config_provider?: string;
  common_headers?: Record<string, any>;
  schedule?: {
    enabled: boolean;
    cron?: string;
    timezone?: string;
  };
  notification?: {
    enabled: boolean;
    on_success?: boolean;
    on_failure?: boolean;
    email_enabled?: boolean;
    email_addresses?: string[];
    webhook_url?: string;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface TestResult {
  _id: string;
  task_id: string;
  status: 'running' | 'passed' | 'failed' | 'error';
  summary: {
    total: number;
    passed: number;
    failed: number;
    error: number;
  };
  results: Array<{
    interface_id: string;
    interface_name: string;
    order: number;
    status: string;
    request: {
      method: string;
      url: string;
      headers: Record<string, any>;
      body: any;
      query: Record<string, any>;
    };
    response: {
      status_code: number;
      headers: Record<string, any>;
      body: any;
      duration: number;
    };
    error?: {
      message: string;
      stack: string;
      code: string;
    };
    assertion_result?: {
      passed: boolean;
      message: string;
      errors: string[];
    };
    duration: number;
    started_at: string;
    completed_at: string;
  }>;
  started_at: string;
  completed_at?: string;
  duration: number;
  ai_analysis?: {
    testCaseImprovement?: any;
    bugFixes?: any;
    optimizationSuggestions?: any;
    timestamp?: Date;
  };
}

// 移除拖拽相关代码，使用按钮调整顺序

// 默认的测试用例 headers
const DEFAULT_TEST_CASE_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer token',
  'User-Agent': 'ApiAdmin/1.0',
};

// 示例数据
const EXAMPLE_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': 'Bearer your_token_here',
  'X-Request-ID': '{{$randomUUID}}',
  'User-Agent': 'ApiAdmin/1.0',
};

const EXAMPLE_CUSTOM_DATA = {
  name: '测试用户',
  email: 'test@example.com',
  age: 25,
  status: 'active',
  tags: ['tag1', 'tag2'],
};

const EXAMPLE_QUERY_PARAMS = {
  page: 1,
  pageSize: 10,
  sort: 'created_at',
  order: 'desc',
  keyword: 'search_term',
};

// 生成 CURL 命令
const generateCurlCommand = (request: any): string => {
  const { method, url, headers = {}, body, query = {} } = request;
  
  if (!method || !url) {
    return '# 无法生成 CURL 命令：缺少必要信息';
  }
  
  // 构建完整 URL（包含查询参数）
  let fullUrl = url || '';
  
  // 处理查询参数
  const queryParams = Object.entries(query || {})
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  
  if (queryParams) {
    // 检查 URL 是否已包含查询参数
    const urlHasQuery = fullUrl.includes('?');
    const urlHasHash = fullUrl.includes('#');
    
    if (urlHasHash) {
      // 如果 URL 包含 #，需要在 # 之前插入查询参数
      const [baseUrl, hash] = fullUrl.split('#');
      fullUrl = `${baseUrl}${urlHasQuery ? '&' : '?'}${queryParams}#${hash}`;
    } else {
      fullUrl += (urlHasQuery ? '&' : '?') + queryParams;
    }
  }
  
  // 转义 URL 中的单引号（用于 shell 命令）
  const escapedUrl = fullUrl.replace(/'/g, "'\\''");
  
  // 构建 CURL 命令
  let curl = `curl -X ${method.toUpperCase()} '${escapedUrl}'`;
  
  // 添加请求头
  if (headers && typeof headers === 'object') {
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // 转义请求头值中的单引号
        const escapedValue = String(value).replace(/'/g, "'\\''");
        curl += ` \\\n  -H '${key}: ${escapedValue}'`;
      }
    });
  }
  
  // 添加请求体（仅对需要请求体的方法）
  const methodsWithBody = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (methodsWithBody.includes(method.toUpperCase()) && body !== undefined && body !== null) {
    let bodyStr = '';
    let contentType = 'application/json';
    
    // 检查是否已有 Content-Type 头
    if (headers && typeof headers === 'object') {
      const contentTypeHeader = headers['Content-Type'] || headers['content-type'];
      if (contentTypeHeader) {
        contentType = String(contentTypeHeader).split(';')[0].trim();
      }
    }
    
    // 根据 Content-Type 处理请求体
    if (typeof body === 'string') {
      bodyStr = body;
    } else if (typeof body === 'object') {
      if (contentType === 'application/json' || contentType.includes('json')) {
        bodyStr = JSON.stringify(body);
      } else if (contentType === 'application/x-www-form-urlencoded') {
        bodyStr = Object.entries(body)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&');
      } else if (contentType === 'multipart/form-data') {
        // multipart/form-data 在 curl 中需要使用 -F 参数
        // 这里简化为 JSON 格式，实际使用时需要根据具体情况调整
        bodyStr = JSON.stringify(body);
      } else {
        bodyStr = JSON.stringify(body);
      }
    } else {
      bodyStr = String(body);
    }
    
    if (bodyStr) {
      // 转义单引号（用于 shell 命令）
      const escapedBody = bodyStr.replace(/'/g, "'\\''");
      curl += ` \\\n  -d '${escapedBody}'`;
    }
  }
  
  return curl;
};

const EXAMPLE_ASSERTION_SCRIPT = `// 断言响应状态码为 200
assert.status(200);

// 断言响应体不为空
assert.ok(body !== null && body !== undefined, '响应体不应为空');

// 断言响应体是对象类型（对于 JSON 响应）
assert.ok(typeof body === 'object', '响应体应为对象类型');

// 示例：断言响应体包含特定字段（根据实际 API 响应调整）
// assert.ok(body.data, '响应应包含 data 字段');

// 示例：断言响应体字段值（根据实际 API 响应调整）
// assert.equal(body.code, 0, '响应 code 应为 0');

// 示例：断言数组长度（根据实际 API 响应调整）
// if (Array.isArray(body.data.list)) {
//   assert.ok(body.data.list.length > 0, '列表不应为空');
// }`;

const TestPipeline: React.FC = () => {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.user.user);
  const [tasks, setTasks] = useState<TestTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [interfaces, setInterfaces] = useState<any[]>([]);
  const [environments, setEnvironments] = useState<any[]>([]);
  const [codeRepositories, setCodeRepositories] = useState<any[]>([]);
  const [aiConfigs, setAiConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingTaskLoading, setViewingTaskLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [caseModalVisible, setCaseModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TestTask | null>(null);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [editingCaseIndex, setEditingCaseIndex] = useState<number>(-1);
  const [selectedTask, setSelectedTask] = useState<TestTask | null>(null);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [runningCaseIndex, setRunningCaseIndex] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // 同步运行状态到 Redux store
  React.useEffect(() => {
    dispatch(setTestPipelineRunning(running));
    // 组件卸载时重置状态
    return () => {
      dispatch(setTestPipelineRunning(false));
    };
  }, [running, dispatch]);
  const [form] = Form.useForm();
  const [caseForm] = Form.useForm();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const formProjectId = Form.useWatch('project_id', form);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<any>(null);
  const [importMode, setImportMode] = useState<string>('normal');
  const saveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // 格式状态：每个字段支持 JSON 和 key=value 两种格式
  const [headersFormat, setHeadersFormat] = useState<'json' | 'keyvalue'>('json');
  const [dataFormat, setDataFormat] = useState<'json' | 'keyvalue'>('json');
  const [pathParamsFormat, setPathParamsFormat] = useState<'json' | 'keyvalue'>('json');
  const [queryParamsFormat, setQueryParamsFormat] = useState<'json' | 'keyvalue'>('json');
  const [commonHeadersFormat, setCommonHeadersFormat] = useState<'json' | 'keyvalue'>('json');

  useEffect(() => {
    if (user) {
      fetchProjects();
      // 初始化时获取所有测试流水线
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // 无论是否选择项目，都获取测试流水线
    fetchTasks();
    
    if (selectedProjectId) {
      fetchInterfaces();
      fetchEnvironments(selectedProjectId, false); // 不显示警告，测试环境是可选的
      fetchCodeRepository(selectedProjectId);
    } else {
      // 清空接口和环境列表
      setInterfaces([]);
      setEnvironments([]);
      setCodeRepositories([]);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    // 获取AI配置列表
    fetchAIConfigs();
  }, [user]);

  const fetchProjects = async () => {
    try {
      // 如果是超级管理员，使用管理员 API 获取所有项目
      // 否则使用普通用户 API，只返回用户参与的项目
      const apiPath = user?.role === 'super_admin' ? '/admin/project/list' : '/project/list';
      const response = await api.get(apiPath);
      setProjects(response.data.data || []);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.pipeline.fetchProjectsFailed'));
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: any = {};
      // 只有当选择了项目时才传递 project_id 参数
      if (selectedProjectId) {
        params.project_id = selectedProjectId;
      }
      const response = await api.get('/auto-test/tasks', { params });
      setTasks(response.data.data || []);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.pipeline.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchInterfaces = async () => {
    try {
      const response = await api.get('/interface/list', {
        params: { project_id: selectedProjectId },
      });
      setInterfaces(response.data.data || []);
    } catch (error: any) {
      messageApi.error(t('admin.test.pipeline.fetchInterfacesFailed'));
    }
  };

  const fetchEnvironments = async (projectId?: string, showWarning = false) => {
    const targetProjectId = projectId || selectedProjectId;
    if (!targetProjectId) {
      setEnvironments([]);
      return;
    }
    
    try {
      const response = await api.get('/test/environments', {
        params: { project_id: targetProjectId },
      });
      const envList = response.data?.data || [];
      // 统一环境数据结构，确保与环境管理页面一致
      const normalizedEnvs = envList.map((env: any) => ({
        ...env,
        // 确保 base_url 字段存在（后端已统一使用 base_url）
        base_url: env.base_url || env.host || '',
      }));
      setEnvironments(normalizedEnvs);
      // 只在明确需要警告时才显示（例如创建测试流水线时）
      if (normalizedEnvs.length === 0 && showWarning) {
        messageApi.warning(t('admin.test.pipeline.noTestEnvironmentWarning'));
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('admin.test.pipeline.fetchEnvironmentsFailed');
      messageApi.error(errorMessage);
      setEnvironments([]);
    }
  };

  const fetchCodeRepository = async (projectId: string) => {
    try {
      const response = await api.get(`/projects/${projectId}/repository`);
      const repository = response.data.data;
      if (repository) {
        setCodeRepositories([repository]);
      } else {
        setCodeRepositories([]);
      }
    } catch (error: any) {
      // 404 表示没有配置代码仓库，这是正常的
      if (error.response?.status !== 404) {
        console.error('获取代码仓库失败:', error);
      }
      setCodeRepositories([]);
    }
  };

  const fetchAIConfigs = async () => {
    try {
      const response = await api.get('/admin/ai/configs');
      
      // 调试日志
      console.log('AI Configs API Response:', response.data);
      
      // 处理响应数据，兼容不同的响应格式
      const responseData = response.data?.data || response.data || [];
      const allConfigs = Array.isArray(responseData) ? responseData : [];
      
      // 过滤出已启用的配置
      // 注意：后端会隐藏敏感信息，api_key 会被截断为 "前8位..."（如果存在）
      // 如果 api_key 为空字符串，说明没有配置 API key
      // 所以我们可以通过检查 api_key 是否不为空来判断是否有配置
      const enabledConfigs = allConfigs.filter((config: any) => {
        // enabled 可能是 boolean、字符串或数字
        const isEnabled = config.enabled === true || config.enabled === 'true' || config.enabled === 1 || config.enabled === '1';
        // 检查是否有 api_key（后端返回的格式：如果存在则为 "前8位..."，如果不存在则为空字符串）
        const hasApiKey = config.api_key && config.api_key.trim() !== '';
        const result = isEnabled && hasApiKey;
        
        // 调试日志
        if (!result) {
          console.log(`Config ${config.provider} filtered out:`, {
            enabled: config.enabled,
            isEnabled,
            api_key: config.api_key,
            hasApiKey,
          });
        }
        
        return result;
      });
      
      console.log('All AI Configs:', allConfigs);
      console.log('Enabled AI Configs:', enabledConfigs);
      console.log('Config details:', enabledConfigs.map((c: any) => ({
        provider: c.provider,
        name: c.name,
        enabled: c.enabled,
        hasApiKey: !!(c.api_key && c.api_key.trim() !== ''),
        apiKeyPreview: c.api_key ? c.api_key.substring(0, 20) : 'none'
      })));
      
      setAiConfigs(enabledConfigs);
    } catch (error: any) {
      console.error('获取AI配置失败:', error);
      messageApi.error('获取AI配置失败: ' + (error.response?.data?.message || error.message));
      setAiConfigs([]);
    }
  };

  const handleCreate = async () => {
    setEditingTask(null);
    form.resetFields();
    // 获取当前用户的 token
    const currentToken = localStorage.getItem('token') || '';
    
    form.setFieldsValue({
      project_id: selectedProjectId || undefined, // 如果有选中的项目，使用它，否则让用户选择
      environment_id: undefined, // 明确设置为 undefined，让用户选择
      code_repository_id: undefined,
      ai_config_provider: undefined,
      enabled: true,
      test_cases: [],
      common_headers: JSON.stringify({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': currentToken ? `Bearer ${currentToken}` : 'Bearer token',
        'User-Agent': 'ApiAdmin/1.0',
      }, null, 2),
    });
    
    // 重置格式为 JSON
    setCommonHeadersFormat('json');
    
    // 如果有选中的项目，加载对应的环境和代码仓库
    if (selectedProjectId) {
      await fetchEnvironments(selectedProjectId, false);
      await fetchCodeRepository(selectedProjectId);
    } else {
      setEnvironments([]);
      setCodeRepositories([]);
    }
    
    setModalVisible(true);
  };

  const handleEdit = async (task: TestTask) => {
    setEditingTask(task);
    
    // 处理 environment_id：确保是字符串ID（处理populated对象的情况）
    let environmentId: string | undefined = undefined;
    if (task.environment_id) {
      if (typeof task.environment_id === 'string') {
        environmentId = task.environment_id;
      } else if (task.environment_id && typeof task.environment_id === 'object') {
        // 处理 populated 对象
        environmentId = (task.environment_id as any)?._id?.toString() || (task.environment_id as any)?.toString();
      }
    }
    
    // 处理 base_url
    const baseUrl = task.base_url || '';
    
    // 处理 common_headers：转换为 JSON 字符串格式
    let commonHeadersValue = '{}';
    if (task.common_headers) {
      if (typeof task.common_headers === 'string') {
        try {
          // 如果是字符串，尝试解析为 JSON
          const parsed = JSON.parse(task.common_headers);
          // 如果 Authorization 是占位符，尝试用当前 token 替换
          const currentToken = localStorage.getItem('token') || '';
          if (parsed.Authorization === 'Bearer token' || 
              parsed.Authorization === 'Bearer <token>' ||
              !parsed.Authorization ||
              (typeof parsed.Authorization === 'string' && parsed.Authorization.includes('token'))) {
            if (currentToken) {
              parsed.Authorization = `Bearer ${currentToken}`;
            }
          }
          commonHeadersValue = JSON.stringify(parsed, null, 2);
        } catch {
          // 如果解析失败，当作空对象
          commonHeadersValue = '{}';
        }
      } else if (typeof task.common_headers === 'object') {
        // 如果 Authorization 是占位符，尝试用当前 token 替换
        const headers = { ...task.common_headers };
        const currentToken = localStorage.getItem('token') || '';
        if (headers.Authorization === 'Bearer token' || 
            headers.Authorization === 'Bearer <token>' ||
            !headers.Authorization ||
            (typeof headers.Authorization === 'string' && headers.Authorization.includes('token'))) {
          if (currentToken) {
            headers.Authorization = `Bearer ${currentToken}`;
          }
        }
        commonHeadersValue = JSON.stringify(headers, null, 2);
      }
    } else {
      // 如果没有配置 common_headers，使用默认值并填充当前 token
      const currentToken = localStorage.getItem('token') || '';
      commonHeadersValue = JSON.stringify({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': currentToken ? `Bearer ${currentToken}` : 'Bearer token',
        'User-Agent': 'ApiAdmin/1.0',
      }, null, 2);
    }
    
    // 处理邮箱地址：将数组转换为逗号分隔的字符串
    let emailAddressesStr = '';
    if (task.notification?.email_addresses && Array.isArray(task.notification.email_addresses)) {
      emailAddressesStr = task.notification.email_addresses.join(', ');
    }
    
    // 处理 code_repository_id
    let codeRepositoryId: string | undefined = undefined;
    if (task.code_repository_id) {
      if (typeof task.code_repository_id === 'string') {
        codeRepositoryId = task.code_repository_id;
      } else if (task.code_repository_id && typeof task.code_repository_id === 'object') {
        codeRepositoryId = (task.code_repository_id as any)?._id?.toString();
      }
    }

    // 处理 project_id：确保是字符串ID（处理populated对象的情况）
    const projectId = typeof task.project_id === 'string' 
      ? task.project_id 
      : (task.project_id as any)?._id?.toString() || task.project_id;
    
    form.setFieldsValue({
      name: task.name,
      description: task.description || '',
      project_id: projectId,
      environment_id: environmentId,
      base_url: baseUrl,
      code_repository_id: codeRepositoryId,
      ai_config_provider: task.ai_config_provider || undefined,
      enabled: task.enabled !== undefined ? task.enabled : true,
      common_headers: commonHeadersValue,
      schedule: task.schedule || { enabled: false, cron: '', timezone: 'Asia/Shanghai' },
      notification: task.notification ? {
        ...task.notification,
        email_addresses: emailAddressesStr,
      } : { enabled: false, on_success: false, on_failure: true, email_enabled: false, email_addresses: '', webhook_url: '' },
    });
    
    // 重置格式为 JSON
    setCommonHeadersFormat('json');
    
    // 确保环境列表和代码仓库已加载，不显示警告（测试环境是可选的）
    if (projectId) {
      await fetchEnvironments(projectId, false);
      await fetchCodeRepository(projectId);
    } else {
      setEnvironments([]);
      setCodeRepositories([]);
    }
    
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: t('admin.test.pipeline.deleteConfirm'),
      content: t('admin.test.pipeline.deleteConfirmMessage'),
      onOk: async () => {
        try {
          await api.delete(`/auto-test/tasks/${id}`);
          messageApi.success(t('admin.test.pipeline.deleteSuccess'));
          fetchTasks();
        } catch (error: any) {
          messageApi.error(error.response?.data?.message || t('admin.test.pipeline.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理 environment_id：确保空字符串、undefined 或无效值转换为 null
      let environmentId: string | null = null;
      if (values.environment_id) {
        const envIdStr = String(values.environment_id).trim();
        if (envIdStr !== '' && envIdStr !== 'undefined' && envIdStr !== 'null') {
          environmentId = envIdStr;
        }
      }
      
      // 处理 base_url
      const baseUrl = values.base_url ? String(values.base_url).trim() : '';
      
      // 处理 code_repository_id
      const codeRepositoryId = values.code_repository_id ? String(values.code_repository_id).trim() : null;
      
      // 处理 ai_config_provider
      const aiConfigProvider = values.ai_config_provider ? String(values.ai_config_provider).trim() : null;
      
      // 处理邮箱地址：将逗号分隔的字符串转换为数组
      let emailAddresses: string[] = [];
      if (values.notification?.email_addresses) {
        const emailStr = String(values.notification.email_addresses).trim();
        if (emailStr) {
          emailAddresses = emailStr
            .split(',')
            .map(email => email.trim())
            .filter(email => email && email.includes('@'));
        }
      }
      
      // 处理通知配置
      const notification = values.notification ? {
        ...values.notification,
        email_addresses: emailAddresses,
      } : undefined;
      
      const submitData = {
        ...values,
        environment_id: environmentId,
        base_url: baseUrl,
        code_repository_id: codeRepositoryId,
        ai_config_provider: aiConfigProvider,
        notification: notification,
      };
      
      console.log('提交数据:', submitData); // 调试日志
      
      if (editingTask) {
        await api.put(`/auto-test/tasks/${editingTask._id}`, submitData);
        messageApi.success('更新成功');
      } else {
        await api.post('/auto-test/tasks', submitData);
        messageApi.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingTask(null);
      fetchTasks();
    } catch (error: any) {
      console.error('提交失败:', error); // 调试日志
      messageApi.error(error.response?.data?.message || t('admin.test.pipeline.operationFailed'));
    }
  };

  // 将对象转换为 key=value 格式字符串
  const objectToKeyValue = (obj: any): string => {
    if (!obj || typeof obj !== 'object') {
      return '';
    }
    return Object.entries(obj)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  };

  // 将 key=value 格式字符串转换为对象
  const keyValueToObject = (str: string): any => {
    if (!str || typeof str !== 'string') {
      return {};
    }
    const obj: any = {};
    const lines = str.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        const value = trimmedLine.substring(equalIndex + 1).trim();
        if (key) {
          obj[key] = value;
        }
      }
    }
    return obj;
  };

  const handleAddCase = () => {
    if (!selectedTask) return;
    setEditingCase(null);
    setEditingCaseIndex(-1);
    caseForm.resetFields();
    
    // 重置格式为 JSON
    setHeadersFormat('json');
    setDataFormat('json');
    setPathParamsFormat('json');
    setQueryParamsFormat('json');
    
    caseForm.setFieldsValue({
      enabled: true,
      order: selectedTask.test_cases.length,
      custom_headers: JSON.stringify(DEFAULT_TEST_CASE_HEADERS, null, 2),
      custom_data: '{}',
      path_params: '{}',
      query_params: '{}',
    });
    setCaseModalVisible(true);
  };

  const handleEditCase = (index: number) => {
    if (!selectedTask) return;
    const testCase = selectedTask.test_cases[index];
    setEditingCase(testCase);
    setEditingCaseIndex(index);
    
    // 处理interface_id：确保是字符串ID（处理populated对象的情况）
    const interfaceId = typeof testCase.interface_id === 'string' 
      ? testCase.interface_id 
      : (testCase.interface_id?._id || testCase.interface_id)?.toString();
    
    // 如果 custom_headers 为空，使用默认值
    let customHeaders = testCase.custom_headers;
    if (!customHeaders || (typeof customHeaders === 'object' && Object.keys(customHeaders).length === 0)) {
      customHeaders = DEFAULT_TEST_CASE_HEADERS;
    }
    
    // 重置格式为 JSON
    setHeadersFormat('json');
    setDataFormat('json');
    setPathParamsFormat('json');
    setQueryParamsFormat('json');
    
    caseForm.setFieldsValue({
      ...testCase,
      interface_id: interfaceId, // 确保使用字符串ID，而不是populated对象
      custom_headers: typeof customHeaders === 'object' ? JSON.stringify(customHeaders, null, 2) : customHeaders || JSON.stringify(DEFAULT_TEST_CASE_HEADERS, null, 2),
      custom_data: typeof testCase.custom_data === 'object' ? JSON.stringify(testCase.custom_data, null, 2) : testCase.custom_data || '{}',
      path_params: typeof testCase.path_params === 'object' ? JSON.stringify(testCase.path_params, null, 2) : testCase.path_params || '{}',
      query_params: typeof testCase.query_params === 'object' ? JSON.stringify(testCase.query_params, null, 2) : testCase.query_params || '{}',
    });
    setCaseModalVisible(true);
  };

  const handleDeleteCase = (index: number) => {
    if (!selectedTask) return;
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个测试用例吗？',
      onOk: async () => {
        try {
          const updatedCases = selectedTask.test_cases.filter((_, i) => i !== index);
          // 重新排序并清理数据
          const cleanedCases = updatedCases.map((tc, i) => ({
            interface_id: typeof tc.interface_id === 'string' ? tc.interface_id : (tc.interface_id?._id || tc.interface_id)?.toString() || tc.interface_id,
            order: i,
            enabled: tc.enabled !== undefined ? tc.enabled : true,
            custom_headers: tc.custom_headers || {},
            custom_data: tc.custom_data || {},
            path_params: tc.path_params || {},
            query_params: tc.query_params || {},
            assertion_script: tc.assertion_script || '',
          }));
          
          await api.put(`/auto-test/tasks/${selectedTask._id}`, {
            test_cases: cleanedCases,
          });
          messageApi.success('删除成功');
          fetchTasks();
          // 重新获取任务详情以更新 selectedTask
          const response = await api.get(`/auto-test/tasks/${selectedTask._id}`);
          setSelectedTask(response.data.data);
        } catch (error: any) {
          messageApi.error(error.response?.data?.message || t('admin.test.pipeline.deleteFailed'));
        }
      },
    });
  };

  const handleSubmitCase = async () => {
    try {
      const values = await caseForm.validateFields();
      if (!selectedTask) return;

      // 解析字段值，支持 JSON 和 key=value 两种格式
      const parseField = (value: string | object, format: 'json' | 'keyvalue'): any => {
        if (typeof value === 'object') return value;
        if (!value || typeof value !== 'string') return {};
        
        try {
          if (format === 'json') {
            return JSON.parse(value || '{}');
          } else {
            // key=value 格式
            return keyValueToObject(value);
          }
        } catch (error) {
          messageApi.error(`格式无效（${format === 'json' ? 'JSON' : 'key=value'}）`);
          throw error;
        }
      };

      const testCase: TestCase = {
        interface_id: values.interface_id,
        order: values.order,
        enabled: values.enabled,
        custom_headers: parseField(values.custom_headers, headersFormat),
        custom_data: parseField(values.custom_data, dataFormat),
        path_params: parseField(values.path_params, pathParamsFormat),
        query_params: parseField(values.query_params, queryParamsFormat),
        assertion_script: values.assertion_script || '',
      };

      let updatedCases: TestCase[];
      if (editingCaseIndex >= 0) {
        updatedCases = [...selectedTask.test_cases];
        updatedCases[editingCaseIndex] = testCase;
      } else {
        updatedCases = [...selectedTask.test_cases, testCase];
      }

      // 重新排序并清理数据
      const cleanedCases = updatedCases.map((tc: any, i: number) => {
        // 确保 interface_id 是字符串格式的 ObjectId
        let interfaceId: string;
        if (typeof tc.interface_id === 'string') {
          interfaceId = tc.interface_id;
        } else if (tc.interface_id?._id) {
          interfaceId = typeof tc.interface_id._id === 'string' ? tc.interface_id._id : tc.interface_id._id.toString();
        } else if (tc.interface_id) {
          interfaceId = typeof tc.interface_id === 'string' ? tc.interface_id : String(tc.interface_id);
        } else {
          messageApi.error(`测试用例 ${i + 1} 缺少接口ID`);
          throw new Error(`测试用例 ${i + 1} 缺少接口ID`);
        }

        // 确保所有字段都是正确的类型
        return {
          interface_id: interfaceId,
          order: typeof tc.order === 'number' ? tc.order : i,
          enabled: tc.enabled !== undefined ? Boolean(tc.enabled) : true,
          custom_headers: tc.custom_headers && typeof tc.custom_headers === 'object' && !Array.isArray(tc.custom_headers) ? tc.custom_headers : {},
          custom_data: tc.custom_data && typeof tc.custom_data === 'object' && !Array.isArray(tc.custom_data) ? tc.custom_data : {},
          path_params: tc.path_params && typeof tc.path_params === 'object' && !Array.isArray(tc.path_params) ? tc.path_params : {},
          query_params: tc.query_params && typeof tc.query_params === 'object' && !Array.isArray(tc.query_params) ? tc.query_params : {},
          assertion_script: typeof tc.assertion_script === 'string' ? tc.assertion_script : '',
        };
      });

      await api.put(`/auto-test/tasks/${selectedTask._id}`, {
        test_cases: cleanedCases,
      });

      messageApi.success(editingCaseIndex >= 0 ? '更新成功' : '添加成功');
      setCaseModalVisible(false);
      caseForm.resetFields();
      fetchTasks();
      const updatedTask = { ...selectedTask, test_cases: updatedCases };
      setSelectedTask(updatedTask);
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.pipeline.operationFailed'));
    }
  };

  const handleImportAllAPIs = async () => {
    if (!selectedTask || !selectedProjectId) {
      messageApi.warning(t('admin.test.pipeline.selectProjectAndPipeline'));
      return;
    }

    if (interfaces.length === 0) {
      messageApi.warning('当前项目没有可用的API接口');
      return;
    }

    // 获取已添加的接口ID列表
    const existingInterfaceIds = new Set(
      selectedTask.test_cases.map((tc) => {
        const id = typeof tc.interface_id === 'string' 
          ? tc.interface_id 
          : (tc.interface_id?._id || tc.interface_id)?.toString();
        return id;
      })
    );

    // 过滤出未添加的接口
    const newInterfaces = interfaces.filter(
      (inter) => !existingInterfaceIds.has(inter._id)
    );

    if (newInterfaces.length === 0) {
      messageApi.info('所有API接口已添加，无需重复导入');
      return;
    }

    Modal.confirm({
      title: '确认导入',
      content: `将导入 ${newInterfaces.length} 个API接口作为测试用例，是否继续？`,
      onOk: async () => {
        try {
          // 构建新的测试用例
          const currentMaxOrder = selectedTask.test_cases.length > 0
            ? Math.max(...selectedTask.test_cases.map((tc) => tc.order || 0))
            : -1;

          const newTestCases: TestCase[] = newInterfaces.map((inter, index) => ({
            interface_id: inter._id,
            order: currentMaxOrder + index + 1,
            enabled: true,
            custom_headers: DEFAULT_TEST_CASE_HEADERS,
            custom_data: {},
            path_params: {},
            query_params: {},
            assertion_script: '',
          }));

          // 合并现有测试用例和新测试用例
          const updatedCases = [...selectedTask.test_cases, ...newTestCases];

          // 重新排序并清理数据
          const cleanedCases = updatedCases.map((tc, i) => ({
            interface_id: typeof tc.interface_id === 'string' 
              ? tc.interface_id 
              : (tc.interface_id?._id || tc.interface_id)?.toString() || tc.interface_id,
            order: i,
            enabled: tc.enabled !== undefined ? tc.enabled : true,
            custom_headers: tc.custom_headers || {},
            custom_data: tc.custom_data || {},
            path_params: tc.path_params || {},
            query_params: tc.query_params || {},
            assertion_script: tc.assertion_script || '',
          }));

          await api.put(`/auto-test/tasks/${selectedTask._id}`, {
            test_cases: cleanedCases,
          });

          messageApi.success(`成功导入 ${newInterfaces.length} 个API接口`);
          setCaseModalVisible(false);
          caseForm.resetFields();
          fetchTasks();
          // 重新获取任务详情以更新 selectedTask，确保接口信息被正确populate
          try {
            const response = await api.get(`/auto-test/tasks/${selectedTask._id}`);
            const updatedTask = response.data.data;
            // 确保接口信息被正确保存（后端会返回populated的接口对象）
            setSelectedTask(updatedTask);
          } catch (error) {
            // 如果获取失败，至少更新本地状态
            console.error('获取更新后的任务详情失败:', error);
            // 使用本地更新的数据（但接口信息可能不完整）
            const updatedCases = [...selectedTask.test_cases, ...newTestCases];
            setSelectedTask({ ...selectedTask, test_cases: updatedCases });
          }
        } catch (error: any) {
          messageApi.error(error.response?.data?.message || t('admin.test.pipeline.importFailed'));
        }
      },
    });
  };

  const handleMoveCase = async (index: number, direction: 'up' | 'down') => {
    if (!selectedTask) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectedTask.test_cases.length) return;

    const updatedCases = [...selectedTask.test_cases];
    [updatedCases[index], updatedCases[newIndex]] = [updatedCases[newIndex], updatedCases[index]];
    
    await saveTestCasesOrder(updatedCases, true);
  };

  // 保存测试用例顺序
  const saveTestCasesOrder = async (updatedCases: TestCase[], showSuccessMessage = true) => {
    if (!selectedTask) return;
    
    // 重新排序并清理数据
    const cleanedCases = updatedCases.map((tc, i) => ({
      interface_id: typeof tc.interface_id === 'string' ? tc.interface_id : (tc.interface_id?._id || tc.interface_id)?.toString() || tc.interface_id,
      order: i,
      enabled: tc.enabled !== undefined ? tc.enabled : true,
      custom_headers: tc.custom_headers || {},
      custom_data: tc.custom_data || {},
      path_params: tc.path_params || {},
      query_params: tc.query_params || {},
      assertion_script: tc.assertion_script || '',
    }));

    try {
      await api.put(`/auto-test/tasks/${selectedTask._id}`, {
        test_cases: cleanedCases,
      });
      
      // 重新获取任务详情以确保数据同步
      const response = await api.get(`/auto-test/tasks/${selectedTask._id}`);
      const updatedTask = response.data.data || { ...selectedTask, test_cases: updatedCases };
      setSelectedTask(updatedTask);
      
      // 刷新任务列表
      fetchTasks();
      
      if (showSuccessMessage) {
        messageApi.success('测试用例顺序已保存');
      }
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.pipeline.saveOrderFailed'));
      // 保存失败时恢复原状态
      fetchTasks();
      if (selectedTask._id) {
        try {
          const response = await api.get(`/auto-test/tasks/${selectedTask._id}`);
          setSelectedTask(response.data.data);
        } catch (fetchError) {
          console.error('恢复任务状态失败:', fetchError);
        }
      }
    }
  };

  // 处理编号变更（通过双击编辑编号）
  const handleOrderChange = async (currentIndex: number, newOrder: number) => {
    if (!selectedTask) return;
    
    const totalCases = selectedTask.test_cases.length;
    
    // 如果 newOrder 等于 currentIndex，说明是无效值（验证失败）
    if (newOrder === currentIndex && newOrder < 0) {
      return; // 已经在子组件中处理了错误提示
    }
    
    if (newOrder < 0 || newOrder >= totalCases) {
      messageApi.warning(`编号必须在 1 到 ${totalCases} 之间`);
      return;
    }
    
    if (newOrder === currentIndex) {
      return; // 位置没有变化
    }
    
    const updatedCases = [...selectedTask.test_cases];
    const [movedCase] = updatedCases.splice(currentIndex, 1);
    updatedCases.splice(newOrder, 0, movedCase);
    
    await saveTestCasesOrder(updatedCases, true);
  };

  // 处理拖拽排序（仅更新本地状态，延迟保存）
  const handleDragCase = (dragIndex: number, hoverIndex: number) => {
    if (!selectedTask) return;
    if (dragIndex === hoverIndex) return;

    const updatedCases = [...selectedTask.test_cases];
    const [draggedItem] = updatedCases.splice(dragIndex, 1);
    updatedCases.splice(hoverIndex, 0, draggedItem);
    
    // 立即更新本地状态，提供即时反馈
    const updatedTask = { ...selectedTask, test_cases: updatedCases };
    setSelectedTask(updatedTask);
    
    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    // 延迟保存（防抖），避免频繁请求
    saveTimerRef.current = setTimeout(() => {
      saveTestCasesOrder(updatedCases, true);
    }, 800); // 800ms 防抖
  };

  const handleRunSingleCase = async (index: number) => {
    if (!selectedTask) return;
    
    const testCase = selectedTask.test_cases[index];
    if (!testCase || !testCase.enabled) {
      messageApi.warning('该测试用例已禁用，无法执行');
      return;
    }

    // 获取接口信息
    const interfaceId = typeof testCase.interface_id === 'string' 
      ? testCase.interface_id 
      : (testCase.interface_id?._id || testCase.interface_id)?.toString();
    
    let interfaceData = null;
    if (testCase.interface_id && typeof testCase.interface_id === 'object' && testCase.interface_id.path) {
      interfaceData = testCase.interface_id;
    } else {
      interfaceData = interfaces.find((i) => i._id === interfaceId);
    }

    setRunningCaseIndex(index);
    try {
      const response = await api.post(`/auto-test/tasks/${selectedTask._id}/run-single`, {
        test_case_index: index,
        environment_id: selectedTask.environment_id,
      });

      const result = response.data?.data;
      if (result) {
        // 构建单个测试用例的结果格式，与完整测试结果格式一致
        const singleResult = {
          _id: `single-${Date.now()}`,
          task_id: selectedTask._id,
          status: result.status,
          summary: {
            total: 1,
            passed: result.status === 'passed' ? 1 : 0,
            failed: result.status === 'failed' ? 1 : 0,
            error: result.status === 'error' ? 1 : 0,
            skipped: 0,
          },
          results: [{
            interface_id: interfaceId,
            interface_name: interfaceData?.title || interfaceData?.path || t('admin.test.pipeline.unknownInterface'),
            order: testCase.order,
            status: result.status,
            request: result.request,
            response: result.response,
            error: result.error,
            assertion_result: result.assertion_result,
            duration: result.duration,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          }],
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration: result.duration,
        };

        setSelectedResult(singleResult);
        setResultModalVisible(true);
        
        if (result.status === 'passed') {
          messageApi.success('测试用例执行成功');
        } else if (result.status === 'failed') {
          messageApi.warning('测试用例执行失败');
        } else {
          messageApi.error('测试用例执行出错');
        }
      } else {
        messageApi.error('获取测试结果失败：结果数据为空');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || t('admin.test.pipeline.runTestCaseFailed');
      messageApi.error(errorMsg);
      console.error('执行单个测试用例异常：', error);
    } finally {
      setRunningCaseIndex(null);
    }
  };

  const handleRunTest = async (task?: TestTask) => {
    const taskToRun = task || selectedTask;
    if (!taskToRun) return;
    
    // 检查是否有测试用例
    if (!taskToRun.test_cases || taskToRun.test_cases.length === 0) {
      messageApi.warning(t('admin.test.pipeline.noTestCases'));
      return;
    }

    // 如果已经在运行，不允许重复运行
    if (running && runningTaskId === taskToRun._id) {
      return;
    }

    setRunning(true);
    setRunningTaskId(taskToRun._id);
    dispatch(setTestPipelineRunning(true));
    try {
      const response = await api.post(`/auto-test/tasks/${taskToRun._id}/run`);
      // 兼容两种字段名格式
      const resultId = response.data?.data?.resultId || response.data?.data?.result_id;
      if (resultId) {
        // 轮询获取结果
        const pollResult = async () => {
          try {
            const resultResponse = await api.get(`/auto-test/results/${resultId}`);
            const result = resultResponse.data?.data;
            if (result && result.status === 'running') {
              setTimeout(pollResult, 1000);
            } else if (result) {
              setSelectedResult(result);
              setResultModalVisible(true);
              setRunning(false);
              setRunningTaskId(null);
              dispatch(setTestPipelineRunning(false));
            } else {
              setRunning(false);
              setRunningTaskId(null);
              dispatch(setTestPipelineRunning(false));
              messageApi.error('获取测试结果失败：结果数据为空');
            }
          } catch (error: any) {
            setRunning(false);
            setRunningTaskId(null);
            dispatch(setTestPipelineRunning(false));
            messageApi.error(error.response?.data?.message || t('admin.test.pipeline.fetchTestResultFailed'));
          }
        };
        pollResult();
      } else {
        setRunning(false);
        setRunningTaskId(null);
        dispatch(setTestPipelineRunning(false));
        // 提供更详细的错误信息
        const errorMsg = response.data?.message || t('admin.test.pipeline.startTestFailed');
        messageApi.error(errorMsg);
        console.error('启动测试失败，响应数据：', response.data);
      }
    } catch (error: any) {
      setRunning(false);
      setRunningTaskId(null);
      dispatch(setTestPipelineRunning(false));
      const errorMsg = error.response?.data?.message || error.message || t('admin.test.pipeline.runTestFailed');
      messageApi.error(errorMsg);
      console.error('运行测试异常：', error);
    }
  };

  // 生成 HTML 报告
  const generateHTMLReport = (result: TestResult): string => {
    const isAllPassed = result.summary.total > 0 && 
                        result.summary.passed === result.summary.total && 
                        result.summary.failed === 0 && 
                        result.summary.error === 0;
    const overallStatus = isAllPassed ? '成功' : '失败';
    const overallStatusColor = isAllPassed ? '#52c41a' : '#ff4d4f';
    const failedCount = result.summary.failed + result.summary.error;
    
    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    };

    const formatJSON = (obj: any) => {
      if (!obj) return 'N/A';
      try {
        return JSON.stringify(obj, null, 2);
      } catch {
        return String(obj);
      }
    };

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试报告 - ${result._id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #e8e8e8;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      color: #262626;
      margin-bottom: 10px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-item {
      padding: 20px;
      border-radius: 6px;
      border: 1px solid #e8e8e8;
      text-align: center;
    }
    .summary-item.result {
      background: ${overallStatusColor}15;
      border-color: ${overallStatusColor};
    }
    .summary-item.success {
      background: #52c41a15;
      border-color: #52c41a;
    }
    .summary-item.failed {
      background: ${failedCount > 0 ? '#ff4d4f15' : '#52c41a15'};
      border-color: ${failedCount > 0 ? '#ff4d4f' : '#52c41a'};
    }
    .summary-item .label {
      font-size: 14px;
      color: #8c8c8c;
      margin-bottom: 8px;
    }
    .summary-item .value {
      font-size: 28px;
      font-weight: bold;
      color: #262626;
    }
    .summary-item.result .value {
      color: ${overallStatusColor};
    }
    .summary-item.success .value {
      color: #52c41a;
    }
    .summary-item.failed .value {
      color: ${failedCount > 0 ? '#ff4d4f' : '#52c41a'};
    }
    .info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 30px;
      padding: 15px;
      background: #fafafa;
      border-radius: 6px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
    }
    .info-item .label {
      color: #8c8c8c;
    }
    .info-item .value {
      font-weight: 500;
    }
    .test-cases {
      margin-top: 30px;
    }
    .test-case {
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .test-case-header {
      padding: 15px 20px;
      background: #fafafa;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .test-case-header.passed {
      background: #f6ffed;
      border-bottom-color: #b7eb8f;
    }
    .test-case-header.failed {
      background: #fff2e8;
      border-bottom-color: #ffbb96;
    }
    .test-case-header.error {
      background: #fff1f0;
      border-bottom-color: #ffccc7;
    }
    .test-case-number {
      display: inline-block;
      width: 30px;
      height: 30px;
      line-height: 30px;
      text-align: center;
      background: #1890ff;
      color: white;
      border-radius: 4px;
      font-weight: bold;
    }
    .test-case-status {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .test-case-status.passed {
      background: #52c41a;
      color: white;
    }
    .test-case-status.failed {
      background: #ff4d4f;
      color: white;
    }
    .test-case-status.error {
      background: #ff7875;
      color: white;
    }
    .test-case-name {
      font-weight: 500;
      flex: 1;
    }
    .test-case-method {
      color: #8c8c8c;
      font-family: monospace;
    }
    .test-case-body {
      padding: 20px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }
    .section-content {
      background: #fafafa;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
    pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .error-message {
      color: #ff4d4f;
      font-weight: 500;
    }
    .assertion-passed {
      color: #52c41a;
      font-weight: 500;
    }
    .assertion-failed {
      color: #ff4d4f;
      font-weight: 500;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>测试报告</h1>
      <p style="color: #8c8c8c; margin-top: 5px;">报告ID: ${result._id}</p>
    </div>
    
    <div class="summary">
      <div class="summary-item result">
        <div class="label">结果</div>
        <div class="value">${overallStatus}</div>
      </div>
      <div class="summary-item success">
        <div class="label">成功用例</div>
        <div class="value">${result.summary.passed}</div>
      </div>
      <div class="summary-item failed">
        <div class="label">失败用例</div>
        <div class="value">${failedCount}</div>
      </div>
    </div>
    
    <div class="info">
      <div class="info-item">
        <span class="label">总用例数:</span>
        <span class="value">${result.summary.total}</span>
      </div>
      <div class="info-item">
        <span class="label">耗时:</span>
        <span class="value">${result.duration}ms</span>
      </div>
      <div class="info-item">
        <span class="label">开始时间:</span>
        <span class="value">${formatDate(result.started_at)}</span>
      </div>
      <div class="info-item">
        <span class="label">结束时间:</span>
        <span class="value">${formatDate(result.completed_at || '')}</span>
      </div>
    </div>
    
    <div class="test-cases">
      <h2 style="margin-bottom: 20px; font-size: 18px;">测试用例详情</h2>
      ${(result.results || []).map((testCase, index) => {
        const statusClass = testCase.status === 'passed' ? 'passed' : 
                           testCase.status === 'failed' ? 'failed' : 'error';
        const interfaceName = testCase.interface_name || 
                              (testCase.interface_id?.title || testCase.interface_id?.path || t('admin.test.pipeline.unknownInterface'));
        return `
        <div class="test-case">
          <div class="test-case-header ${statusClass}">
            <span class="test-case-number">${index + 1}</span>
            <span class="test-case-status ${statusClass}">${testCase.status === 'passed' ? '通过' : testCase.status === 'failed' ? '失败' : '错误'}</span>
            <span class="test-case-name">${interfaceName}</span>
            <span class="test-case-method">${testCase.request?.method || 'GET'} ${testCase.request?.url || ''}</span>
          </div>
          <div class="test-case-body">
            <div class="section">
              <div class="section-title">请求信息</div>
              <div class="section-content">
                <div style="margin-bottom: 10px;"><strong>URL:</strong> ${testCase.request?.url || 'N/A'}</div>
                <div style="margin-bottom: 10px;"><strong>方法:</strong> ${testCase.request?.method || 'N/A'}</div>
                ${testCase.request?.query && Object.keys(testCase.request.query).length > 0 ? `
                <div style="margin-bottom: 10px;"><strong>查询参数:</strong></div>
                <pre>${formatJSON(testCase.request.query)}</pre>
                ` : ''}
                ${testCase.request?.body ? `
                <div style="margin-bottom: 10px;"><strong>请求体:</strong></div>
                <pre>${formatJSON(testCase.request.body)}</pre>
                ` : ''}
                ${testCase.request?.headers && Object.keys(testCase.request.headers).length > 0 ? `
                <div style="margin-bottom: 10px;"><strong>请求头:</strong></div>
                <pre>${formatJSON(testCase.request.headers)}</pre>
                ` : ''}
              </div>
            </div>
            
            ${testCase.response ? `
            <div class="section">
              <div class="section-title">响应信息</div>
              <div class="section-content">
                <div style="margin-bottom: 10px;"><strong>状态码:</strong> ${testCase.response.status_code || 'N/A'}</div>
                <div style="margin-bottom: 10px;"><strong>耗时:</strong> ${testCase.response.duration || 0}ms</div>
                ${testCase.response.headers && Object.keys(testCase.response.headers).length > 0 ? `
                <div style="margin-bottom: 10px;"><strong>响应头:</strong></div>
                <pre>${formatJSON(testCase.response.headers)}</pre>
                ` : ''}
                ${testCase.response.body ? `
                <div style="margin-bottom: 10px;"><strong>响应体:</strong></div>
                <pre>${formatJSON(testCase.response.body)}</pre>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            ${testCase.error ? `
            <div class="section">
              <div class="section-title">${t('admin.test.pipeline.errorInfo')}</div>
              <div class="section-content">
                <div class="error-message" style="margin-bottom: 10px;"><strong>${t('common.error')}:</strong> ${testCase.error.message || t('admin.test.pipeline.unknownError')}</div>
                ${testCase.error.code ? `<div style="margin-bottom: 10px;"><strong>${t('admin.test.pipeline.errorCode')}:</strong> ${testCase.error.code}</div>` : ''}
                ${testCase.error.stack ? `
                <div style="margin-bottom: 10px;"><strong>${t('admin.test.pipeline.stackTrace')}:</strong></div>
                <pre>${testCase.error.stack}</pre>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            ${testCase.assertion_result ? `
            <div class="section">
              <div class="section-title">断言结果</div>
              <div class="section-content">
                <div class="${testCase.assertion_result.passed ? 'assertion-passed' : 'assertion-failed'}" style="margin-bottom: 10px;">
                  <strong>状态:</strong> ${testCase.assertion_result.passed ? '通过' : '失败'}
                </div>
                ${testCase.assertion_result.message ? `
                <div style="margin-bottom: 10px;"><strong>消息:</strong> ${testCase.assertion_result.message}</div>
                ` : ''}
                ${testCase.assertion_result.errors && testCase.assertion_result.errors.length > 0 ? `
                <div style="margin-bottom: 10px;"><strong>错误列表:</strong></div>
                <ul style="margin-left: 20px;">
                  ${testCase.assertion_result.errors.map((err: string) => `<li class="error-message">${String(err).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('')}
                </ul>
                ` : ''}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        `;
      }).join('')}
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; text-align: center; color: #8c8c8c; font-size: 12px;">
      <p>报告生成时间: ${formatDate(new Date().toISOString())}</p>
      <p>ApiAdmin Test Pipeline Report</p>
    </div>
  </div>
</body>
</html>
    `;
    return html;
  };

  // 下载 HTML 报告
  const handleDownloadHTMLReport = () => {
    if (!selectedResult) return;
    
    try {
      const html = generateHTMLReport(selectedResult);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-report-${selectedResult._id}-${new Date().getTime()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      messageApi.success('HTML 报告下载成功');
    } catch (error: any) {
      console.error('生成 HTML 报告失败:', error);
      messageApi.error('生成 HTML 报告失败');
    }
  };

  // 下载 PDF 报告（通过后端生成）
  const handleDownloadPDFReport = async () => {
    if (!selectedResult) {
      messageApi.warning('请先选择测试结果');
      return;
    }
    
    try {
      messageApi.loading({ content: '正在生成 PDF 报告，请稍候...', key: 'pdf-export', duration: 0 });
      
      const response = await api.post(`/auto-test/results/${selectedResult._id}/export`, {
        format: 'pdf'
      }, {
        responseType: 'blob',
        timeout: 60000, // 增加超时时间到60秒，因为PDF生成可能需要较长时间
      });
      
      // 检查响应类型
      const contentType = response.headers['content-type'] || '';
      
      // 如果返回的是 JSON 错误（通常是错误响应）
      if (contentType.includes('application/json') || response.data.size < 100) {
        try {
          const text = await response.data.text();
          const json = JSON.parse(text);
          messageApi.destroy('pdf-export');
          messageApi.error(json.message || json.error || t('admin.test.pipeline.generatePdfFailed'));
          return;
        } catch (parseError) {
          // 如果解析失败，继续尝试作为 PDF 处理
        }
      }
      
      // 检查是否是 PDF 格式
      if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
        // 可能是错误响应，尝试读取为文本
        try {
          const text = await response.data.text();
          const json = JSON.parse(text);
          messageApi.destroy('pdf-export');
          messageApi.error(json.message || json.error || t('admin.test.pipeline.generatePdfFailed'));
          return;
        } catch (parseError) {
          messageApi.destroy('pdf-export');
          messageApi.error('服务器返回了非 PDF 格式的响应');
          return;
        }
      }
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-report-${selectedResult._id}-${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      messageApi.destroy('pdf-export');
      messageApi.success('PDF 报告下载成功');
    } catch (error: any) {
      messageApi.destroy('pdf-export');
      console.error('生成 PDF 报告失败:', error);
      
      // 尝试从响应中获取错误信息
      let errorMessage = '生成 PDF 报告失败';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        // 如果是 blob 响应，尝试读取为文本
        if (data instanceof Blob) {
          try {
            const text = await data.text();
            try {
              const json = JSON.parse(text);
              errorMessage = json.message || json.error || errorMessage;
            } catch {
              // 如果不是 JSON，使用原始文本
              errorMessage = text || errorMessage;
            }
          } catch (readError) {
            errorMessage = `服务器错误 (${status})`;
          }
        } else if (typeof data === 'object' && data !== null) {
          errorMessage = data.message || data.error || errorMessage;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else {
          errorMessage = error.response.statusText || `服务器错误 (${status})`;
        }
      } else if (error.request) {
        errorMessage = '网络错误，请检查网络连接';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      messageApi.error(errorMessage);
    }
  };

  const handleViewTask = async (task: TestTask) => {
    setViewingTaskLoading(true);
    try {
      const response = await api.get(`/auto-test/tasks/${task._id}`);
      const taskData = response.data?.data;
      
      if (!taskData) {
        messageApi.error('获取任务详情失败：返回数据为空');
        return;
      }
      
      // 确保 test_cases 字段存在
      if (!taskData.test_cases) {
        taskData.test_cases = [];
      }
      
      setSelectedTask(taskData);
      
      // 获取项目ID（可能是字符串或对象）
      const taskProjectId = typeof taskData.project_id === 'string' 
        ? taskData.project_id 
        : taskData.project_id?._id || taskData.project_id;
      
      // 如果任务的项目ID与当前选择的项目ID不同，需要加载对应的接口数据
      if (taskProjectId && taskProjectId !== selectedProjectId) {
        // 加载该项目的接口数据
        try {
          const interfacesResponse = await api.get('/interface/list', {
            params: { project_id: taskProjectId },
          });
          setInterfaces(interfacesResponse.data?.data || []);
        } catch (error: any) {
          console.error('获取接口列表失败:', error);
          // 不显示错误消息，因为可能只是接口数据加载失败，不影响查看任务
        }
      } else if (taskProjectId && taskProjectId === selectedProjectId && interfaces.length === 0) {
        // 如果项目ID相同但接口数据未加载，则加载接口数据
        fetchInterfaces();
      }
      
      // 延迟滚动到测试用例列表，确保DOM已更新
      setTimeout(() => {
        const taskCard = document.querySelector('[data-test-task-card]');
        if (taskCard) {
          taskCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error: any) {
      console.error('获取任务详情失败:', error);
      messageApi.error(error.response?.data?.message || t('admin.test.pipeline.fetchTaskDetailsFailed'));
    } finally {
      setViewingTaskLoading(false);
    }
  };

  const handleExport = async (task: TestTask) => {
    try {
      const response = await api.get(`/auto-test/tasks/${task._id}/export`, {
        params: { format: 'json' },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${task.name}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      messageApi.success('导出成功');
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.pipeline.exportFailed'));
    }
  };

  const handleImport = async () => {
    if (!selectedProjectId) {
      messageApi.warning('请先选择项目');
      return;
    }

    if (!importFile) {
      messageApi.warning('请选择要导入的文件');
      return;
    }

    setImporting(true);
    try {
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(importFile.originFileObj as File);
      });

      let data;
      try {
        data = JSON.parse(fileContent);
      } catch (parseError) {
        messageApi.error('无效的JSON格式');
        setImporting(false);
        return;
      }

      await api.post('/auto-test/tasks/import', {
        project_id: selectedProjectId,
        mode: importMode,
        data,
      });
      messageApi.success('导入成功');
      setImportModalVisible(false);
      setImportFile(null);
      fetchTasks();
    } catch (error: any) {
      messageApi.error(error.response?.data?.message || t('admin.test.pipeline.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  const taskColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '测试用例数',
      dataIndex: 'test_cases',
      key: 'test_cases',
      render: (cases: TestCase[]) => cases?.length || 0,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 380,
      render: (_: any, record: TestTask) => (
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => handleRunTest(record)}
            loading={running && runningTaskId === record._id}
            disabled={!record.test_cases || record.test_cases.length === 0 || !record.enabled || (running && runningTaskId === record._id)}
            size="small"
            style={{ color: '#ffffff' }}
          >
            运行测试
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button 
            type="link" 
            onClick={() => handleViewTask(record)}
            loading={viewingTaskLoading && selectedTask?._id === record._id}
            icon={!viewingTaskLoading || selectedTask?._id !== record._id ? <EyeOutlined /> : undefined}
          >
            查看
          </Button>
          <Button type="link" icon={<ExportOutlined />} onClick={() => handleExport(record)}>
            导出
          </Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={t('admin.test.pipeline.title')}
        extra={
          <Space>
            <Select
              placeholder={t('admin.test.pipeline.selectProject')}
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              style={{ width: 200 }}
              notFoundContent={projects.length === 0 ? t('admin.test.pipeline.noProjects') : t('common.empty')}
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {projects.length === 0 ? (
                <Option value="" disabled>
                  {t('admin.test.pipeline.createProjectFirst')}
                </Option>
              ) : !selectedProjectId ? (
                <>
                  <Option value="" disabled style={{ color: '#999' }}>
                    {t('admin.test.pipeline.pleaseSelectProject')}
                  </Option>
                  {projects.map((project) => (
                    <Option key={project._id} value={project._id}>
                      {project.project_name}
                    </Option>
                  ))}
                </>
              ) : (
                projects.map((project) => (
                  <Option key={project._id} value={project._id}>
                    {project.project_name}
                  </Option>
                ))
              )}
            </Select>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportModalVisible(true)}
              disabled={!selectedProjectId}
            >
              导入
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              disabled={!selectedProjectId}
              style={{ color: '#ffffff' }}
            >
              创建测试流水线
            </Button>
          </Space>
        }
      >
        <Table
          columns={taskColumns}
          dataSource={tasks}
          rowKey="_id"
          loading={loading}
        />
      </Card>

      {selectedTask && (
        <Card
          data-test-task-card
          title={selectedTask.name}
          loading={viewingTaskLoading}
          extra={
            <Space>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleRunTest()}
                loading={running && runningTaskId === selectedTask._id}
                disabled={!selectedTask.test_cases || selectedTask.test_cases.length === 0 || !selectedTask.enabled || (running && runningTaskId === selectedTask._id)}
                style={{ color: '#ffffff' }}
              >
                一键测试
              </Button>
              <Button icon={<PlusOutlined />} onClick={handleAddCase}>
                添加API
              </Button>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          {selectedTask.test_cases.length === 0 ? (
            <Empty description="暂无测试用例，请添加API" />
          ) : (
            <DndProvider backend={HTML5Backend}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {selectedTask.test_cases.map((testCase, index) => {
                // 处理接口信息：优先使用populated的接口对象，如果没有则从interfaces数组查找
                let interfaceData = null;
                const interfaceId = typeof testCase.interface_id === 'string' 
                  ? testCase.interface_id 
                  : (testCase.interface_id?._id || testCase.interface_id)?.toString();
                
                // 如果interface_id是populated对象，直接使用
                if (testCase.interface_id && typeof testCase.interface_id === 'object' && testCase.interface_id.path) {
                  interfaceData = testCase.interface_id;
                } else {
                  // 否则从interfaces数组查找
                  interfaceData = interfaces.find((i) => i._id === interfaceId);
                }
                
                return (
                    <DraggableTestCaseItem
                      key={`${testCase.interface_id}-${index}`}
                      testCase={testCase}
                      index={index}
                      interfaceData={interfaceData}
                      onMove={handleDragCase}
                      onEdit={handleEditCase}
                      onDelete={handleDeleteCase}
                      onMoveUp={(idx) => handleMoveCase(idx, 'up')}
                      onMoveDown={(idx) => handleMoveCase(idx, 'down')}
                      onOrderChange={handleOrderChange}
                      onRunSingle={handleRunSingleCase}
                      isRunning={runningCaseIndex === index}
                      totalCases={selectedTask.test_cases.length}
                      isFirst={index === 0}
                      isLast={index === selectedTask.test_cases.length - 1}
                    />
                );
              })}
            </Space>
            </DndProvider>
          )}
        </Card>
      )}

      <Modal
        title={editingTask ? '编辑测试流水线' : '创建测试流水线'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={600}
        okButtonProps={{ style: { color: '#ffffff' } }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="project_id"
            label="所属项目"
            rules={[{ required: true, message: '请选择所属项目' }]}
          >
            <Select
              placeholder="请选择所属项目"
              onChange={(value) => {
                // 当选择项目时，更新环境、代码仓库等选项
                if (value) {
                  fetchEnvironments(value, false);
                  fetchCodeRepository(value);
                  // 清空环境和代码仓库的选择，因为项目已变更
                  form.setFieldsValue({
                    environment_id: undefined,
                    code_repository_id: undefined,
                  });
                } else {
                  setEnvironments([]);
                  setCodeRepositories([]);
                  form.setFieldsValue({
                    environment_id: undefined,
                    code_repository_id: undefined,
                  });
                }
              }}
            >
              {projects.map((project: any) => (
                <Option key={project._id} value={project._id}>
                  {project.project_name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入测试流水线名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="environment_id" label={t('project.environment.title')}>
            <Select 
              placeholder={formProjectId ? (environments.length === 0 ? t('admin.test.pipeline.noTestEnvironment') : t('admin.test.pipeline.selectTestEnvironment')) : "请先选择项目"} 
              allowClear
              disabled={!formProjectId}
              notFoundContent={formProjectId ? (environments.length === 0 ? t('admin.test.pipeline.noTestEnvironment') : undefined) : "请先选择项目"}
            >
              {environments.map((env: any) => (
                <Option key={env._id} value={env._id}>
                  {env.name} - {env.base_url}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item 
            name="base_url" 
            label={
              <Space>
                <span>Base URL</span>
                <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                  (当测试环境未配置base_url时使用，例如: http://localhost:3000)
                </span>
              </Space>
            }
          >
            <Input placeholder="http://localhost:3000" />
          </Form.Item>
          <Form.Item name="enabled" valuePropName="checked" label="启用">
            <Switch />
          </Form.Item>
          <Divider>代码仓库配置</Divider>
          <Form.Item 
            name="code_repository_id" 
            label="代码仓库"
            tooltip="选择项目的代码仓库，用于AI分析功能"
          >
            <Select 
              placeholder={formProjectId ? (codeRepositories.length === 0 ? "该项目未配置代码仓库" : "请选择代码仓库") : "请先选择项目"}
              allowClear
              disabled={!formProjectId}
              notFoundContent={formProjectId ? (codeRepositories.length === 0 ? "该项目未配置代码仓库" : undefined) : "请先选择项目"}
            >
              {codeRepositories.map((repo: any) => (
                <Option key={repo._id} value={repo._id}>
                  {repo.provider} - {repo.repository_url}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Divider>AI分析配置</Divider>
          <Form.Item 
            name="ai_config_provider" 
            label="AI配置"
            tooltip="选择AI配置，用于测试运行完毕后的AI分析（完善测试用例、修复问题、优化建议）"
          >
            <Select 
              placeholder={aiConfigs.length === 0 ? "未配置可用的AI" : "请选择AI配置（可选）"}
              allowClear
              notFoundContent={aiConfigs.length === 0 ? "未配置可用的AI" : undefined}
            >
              {aiConfigs.map((config: any) => (
                <Option key={config.provider} value={config.provider}>
                  {config.name} ({config.provider})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Divider>自动运行配置</Divider>
          <Form.Item 
            name={['schedule', 'enabled']} 
            valuePropName="checked" 
            label="启用定时任务"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues?.schedule?.enabled !== currentValues?.schedule?.enabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue(['schedule', 'enabled']) ? (
                <>
                  <Form.Item
                    name={['schedule', 'cron']}
                    label="Cron 表达式"
                    rules={[
                      { required: true, message: '请输入 Cron 表达式' },
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          // 简单的 cron 表达式验证
                          const cronPattern = /^(\*|([0-9]|[1-5][0-9])|\*\/([0-9]|[1-5][0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|[12][0-9]|3[01])|\*\/([1-9]|[12][0-9]|3[01])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
                          if (!cronPattern.test(value)) {
                            return Promise.reject(new Error('Cron 表达式格式不正确，格式: 秒 分 时 日 月 周'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                    tooltip="格式: 秒 分 时 日 月 周，例如: 0 0 2 * * * 表示每天凌晨2点执行"
                  >
                    <Input placeholder="0 0 2 * * * (每天凌晨2点)" />
                  </Form.Item>
                  <Form.Item
                    name={['schedule', 'timezone']}
                    label="时区"
                    initialValue="Asia/Shanghai"
                  >
                    <Select>
                      <Option value="Asia/Shanghai">Asia/Shanghai (中国标准时间)</Option>
                      <Option value="UTC">UTC (协调世界时)</Option>
                      <Option value="America/New_York">America/New_York (美国东部时间)</Option>
                      <Option value="Europe/London">Europe/London (英国时间)</Option>
                    </Select>
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>
          <Divider>通知配置</Divider>
          <Form.Item 
            name={['notification', 'enabled']} 
            valuePropName="checked" 
            label="启用通知"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues?.notification?.enabled !== currentValues?.notification?.enabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue(['notification', 'enabled']) ? (
                <>
                  <Form.Item
                    name={['notification', 'on_success']}
                    valuePropName="checked"
                    label="成功时通知"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name={['notification', 'on_failure']}
                    valuePropName="checked"
                    label="失败时通知"
                    initialValue={true}
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name={['notification', 'email_enabled']}
                    valuePropName="checked"
                    label="启用邮件通知"
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) =>
                      prevValues?.notification?.email_enabled !== currentValues?.notification?.email_enabled
                    }
                  >
                    {({ getFieldValue }) =>
                      getFieldValue(['notification', 'email_enabled']) ? (
                        <Form.Item
                          name={['notification', 'email_addresses']}
                          label="收件人邮箱"
                          tooltip="多个邮箱用逗号分隔，如果为空则发送到任务创建者邮箱"
                        >
                          <Input placeholder="user1@example.com,user2@example.com (留空则使用创建者邮箱)" />
                        </Form.Item>
                      ) : null
                    }
                  </Form.Item>
                  <Form.Item
                    name={['notification', 'webhook_url']}
                    label="Webhook URL"
                    tooltip="测试完成后会向此 URL 发送 POST 请求"
                  >
                    <Input placeholder="https://example.com/webhook" />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>
          <Divider>通用配置</Divider>
          <Form.Item 
            name="common_headers" 
            label={
              <Space>
                <span>通用Headers</span>
                <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
                  (将应用到所有测试用例，可被测试用例的自定义Headers覆盖)
                </span>
                <Radio.Group 
                  size="small" 
                  value={commonHeadersFormat} 
                  onChange={(e) => {
                    const newFormat = e.target.value;
                    const currentValue = form.getFieldValue('common_headers') || '';
                    
                    if (newFormat === 'keyvalue') {
                      // 从 JSON 转换为 key=value
                      try {
                        const obj = JSON.parse(currentValue || '{}');
                        form.setFieldValue('common_headers', objectToKeyValue(obj));
                      } catch {
                        // 如果解析失败，保持原值
                      }
                    } else {
                      // 从 key=value 转换为 JSON
                      try {
                        const obj = keyValueToObject(currentValue);
                        form.setFieldValue('common_headers', JSON.stringify(obj, null, 2));
                      } catch {
                        // 如果转换失败，保持原值
                      }
                    }
                    setCommonHeadersFormat(newFormat);
                  }}
                >
                  <Radio.Button value="json">JSON</Radio.Button>
                  <Radio.Button value="keyvalue">Key=Value</Radio.Button>
                </Radio.Group>
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => {
                    // 获取当前用户的 token
                    const currentToken = localStorage.getItem('token') || '';
                    const headersWithToken = {
                      ...EXAMPLE_HEADERS,
                      'Authorization': currentToken ? `Bearer ${currentToken}` : 'Bearer token',
                    };
                    const example = commonHeadersFormat === 'json' 
                      ? JSON.stringify(headersWithToken, null, 2)
                      : objectToKeyValue(headersWithToken);
                    form.setFieldsValue({
                      common_headers: example,
                    });
                    if (currentToken) {
                      messageApi.success('已自动填充当前登录用户的 Token');
                    } else {
                      messageApi.warning('未检测到登录 Token，请先登录');
                    }
                  }}
                >
                  使用当前Token
                </Button>
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => {
                    const example = commonHeadersFormat === 'json' 
                      ? JSON.stringify(EXAMPLE_HEADERS, null, 2)
                      : objectToKeyValue(EXAMPLE_HEADERS);
                    form.setFieldsValue({
                      common_headers: example,
                    });
                  }}
                >
                  示例
                </Button>
              </Space>
            }
            tooltip="这些Headers将应用到所有测试用例，如果测试用例有自己的Headers，会合并使用（测试用例的Headers优先级更高）"
          >
            <TextArea 
              rows={4} 
              placeholder={
                commonHeadersFormat === 'json' 
                  ? '{"Authorization": "Bearer token", "Content-Type": "application/json"}' 
                  : 'Authorization=Bearer token\nContent-Type=application/json'
              } 
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingCase ? '编辑测试用例' : '添加测试用例'}
        open={caseModalVisible}
        onOk={handleSubmitCase}
        onCancel={() => {
          setCaseModalVisible(false);
          caseForm.resetFields();
        }}
        width={800}
        okButtonProps={{ style: { color: '#ffffff' } }}
      >
        <Form form={caseForm} layout="vertical">
          <Form.Item
            name="interface_id"
            label={
              <Space>
                <span>API接口</span>
                {!editingCase && (
                  <Button
                    type="link"
                    size="small"
                    onClick={handleImportAllAPIs}
                    disabled={interfaces.length === 0}
                  >
                    一键导入所有API
                  </Button>
                )}
              </Space>
            }
            rules={[{ required: true, message: '请选择API接口' }]}
          >
            <Select placeholder="选择API接口">
              {interfaces.map((inter) => (
                <Option key={inter._id} value={inter._id}>
                  {inter.method} {inter.path}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="order" label="顺序">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="enabled" valuePropName="checked" label="启用">
            <Switch />
          </Form.Item>
          <Divider>请求配置</Divider>
          <Form.Item 
            name="custom_headers" 
            label={
              <Space>
                <span>自定义Headers</span>
                <Radio.Group 
                  size="small" 
                  value={headersFormat} 
                  onChange={(e) => {
                    const newFormat = e.target.value;
                    const currentValue = caseForm.getFieldValue('custom_headers') || '';
                    
                    if (newFormat === 'keyvalue') {
                      // 从 JSON 转换为 key=value
                      try {
                        const obj = JSON.parse(currentValue || '{}');
                        caseForm.setFieldValue('custom_headers', objectToKeyValue(obj));
                      } catch {
                        // 如果解析失败，保持原值
                      }
                    } else {
                      // 从 key=value 转换为 JSON
                      try {
                        const obj = keyValueToObject(currentValue);
                        caseForm.setFieldValue('custom_headers', JSON.stringify(obj, null, 2));
                      } catch {
                        // 如果转换失败，保持原值
                      }
                    }
                    setHeadersFormat(newFormat);
                  }}
                >
                  <Radio.Button value="json">JSON</Radio.Button>
                  <Radio.Button value="keyvalue">Key=Value</Radio.Button>
                </Radio.Group>
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => {
                    const example = headersFormat === 'json' 
                      ? JSON.stringify(EXAMPLE_HEADERS, null, 2)
                      : objectToKeyValue(EXAMPLE_HEADERS);
                    caseForm.setFieldsValue({
                      custom_headers: example,
                    });
                  }}
                >
                  示例
                </Button>
              </Space>
            }
          >
            <TextArea 
              rows={4} 
              placeholder={
                headersFormat === 'json' 
                  ? '{"Authorization": "Bearer token"}' 
                  : 'Authorization=Bearer token\nContent-Type=application/json'
              } 
            />
          </Form.Item>
          <Form.Item 
            name="custom_data" 
            label={
              <Space>
                <span>自定义数据</span>
                <Radio.Group 
                  size="small" 
                  value={dataFormat} 
                  onChange={(e) => {
                    const newFormat = e.target.value;
                    const currentValue = caseForm.getFieldValue('custom_data') || '';
                    
                    if (newFormat === 'keyvalue') {
                      // 从 JSON 转换为 key=value
                      try {
                        const obj = JSON.parse(currentValue || '{}');
                        caseForm.setFieldValue('custom_data', objectToKeyValue(obj));
                      } catch {
                        // 如果解析失败，保持原值
                      }
                    } else {
                      // 从 key=value 转换为 JSON
                      try {
                        const obj = keyValueToObject(currentValue);
                        caseForm.setFieldValue('custom_data', JSON.stringify(obj, null, 2));
                      } catch {
                        // 如果转换失败，保持原值
                      }
                    }
                    setDataFormat(newFormat);
                  }}
                >
                  <Radio.Button value="json">JSON</Radio.Button>
                  <Radio.Button value="keyvalue">Key=Value</Radio.Button>
                </Radio.Group>
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => {
                    const example = dataFormat === 'json' 
                      ? JSON.stringify(EXAMPLE_CUSTOM_DATA, null, 2)
                      : objectToKeyValue(EXAMPLE_CUSTOM_DATA);
                    caseForm.setFieldsValue({
                      custom_data: example,
                    });
                  }}
                >
                  示例
                </Button>
              </Space>
            }
          >
            <TextArea 
              rows={6} 
              placeholder={
                dataFormat === 'json' 
                  ? '{"key": "value"}' 
                  : 'key1=value1\nkey2=value2'
              } 
            />
          </Form.Item>
          <Form.Item 
            name="path_params" 
            label={
              <Space>
                <span>路径参数</span>
                <Radio.Group 
                  size="small" 
                  value={pathParamsFormat} 
                  onChange={(e) => {
                    const newFormat = e.target.value;
                    const currentValue = caseForm.getFieldValue('path_params') || '';
                    
                    if (newFormat === 'keyvalue') {
                      // 从 JSON 转换为 key=value
                      try {
                        const obj = JSON.parse(currentValue || '{}');
                        caseForm.setFieldValue('path_params', objectToKeyValue(obj));
                      } catch {
                        // 如果解析失败，保持原值
                      }
                    } else {
                      // 从 key=value 转换为 JSON
                      try {
                        const obj = keyValueToObject(currentValue);
                        caseForm.setFieldValue('path_params', JSON.stringify(obj, null, 2));
                      } catch {
                        // 如果转换失败，保持原值
                      }
                    }
                    setPathParamsFormat(newFormat);
                  }}
                >
                  <Radio.Button value="json">JSON</Radio.Button>
                  <Radio.Button value="keyvalue">Key=Value</Radio.Button>
                </Radio.Group>
              </Space>
            }
          >
            <TextArea 
              rows={4} 
              placeholder={
                pathParamsFormat === 'json' 
                  ? '{"id": "123"}' 
                  : 'id=123\nuserId=456'
              } 
            />
          </Form.Item>
          <Form.Item 
            name="query_params" 
            label={
              <Space>
                <span>查询参数</span>
                <Radio.Group 
                  size="small" 
                  value={queryParamsFormat} 
                  onChange={(e) => {
                    const newFormat = e.target.value;
                    const currentValue = caseForm.getFieldValue('query_params') || '';
                    
                    if (newFormat === 'keyvalue') {
                      // 从 JSON 转换为 key=value
                      try {
                        const obj = JSON.parse(currentValue || '{}');
                        caseForm.setFieldValue('query_params', objectToKeyValue(obj));
                      } catch {
                        // 如果解析失败，保持原值
                      }
                    } else {
                      // 从 key=value 转换为 JSON
                      try {
                        const obj = keyValueToObject(currentValue);
                        caseForm.setFieldValue('query_params', JSON.stringify(obj, null, 2));
                      } catch {
                        // 如果转换失败，保持原值
                      }
                    }
                    setQueryParamsFormat(newFormat);
                  }}
                >
                  <Radio.Button value="json">JSON</Radio.Button>
                  <Radio.Button value="keyvalue">Key=Value</Radio.Button>
                </Radio.Group>
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => {
                    const example = queryParamsFormat === 'json' 
                      ? JSON.stringify(EXAMPLE_QUERY_PARAMS, null, 2)
                      : objectToKeyValue(EXAMPLE_QUERY_PARAMS);
                    caseForm.setFieldsValue({
                      query_params: example,
                    });
                  }}
                >
                  示例
                </Button>
              </Space>
            }
          >
            <TextArea 
              rows={4} 
              placeholder={
                queryParamsFormat === 'json' 
                  ? '{"page": 1}' 
                  : 'page=1\npageSize=10'
              } 
            />
          </Form.Item>
          <Form.Item 
            name="assertion_script" 
            label={
              <Space>
                <span>断言脚本 (JavaScript)</span>
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => {
                    caseForm.setFieldsValue({
                      assertion_script: EXAMPLE_ASSERTION_SCRIPT,
                    });
                  }}
                >
                  示例
                </Button>
              </Space>
            }
          >
            <TextArea rows={6} placeholder="// 示例：assert.status(200);" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="测试结果"
        open={resultModalVisible}
        onCancel={() => {
          setResultModalVisible(false);
          setSelectedResult(null);
        }}
        footer={
          selectedResult ? (
            <Space>
              {selectedTask && selectedTask.code_repository_id && selectedTask.ai_config_provider && (
                <Button
                  icon={<SettingOutlined />}
                  onClick={async () => {
                    if (!selectedResult?._id) return;
                    setAnalyzing(true);
                    try {
                      const response = await api.post(`/auto-test/results/${selectedResult._id}/analyze`);
                      setAiAnalysis(response.data.data);
                      messageApi.success('AI分析完成');
                      // 重新获取结果以更新AI分析数据
                      const resultResponse = await api.get(`/auto-test/results/${selectedResult._id}`);
                      setSelectedResult(resultResponse.data.data);
                    } catch (error: any) {
                      messageApi.error(error.response?.data?.message || 'AI分析失败');
                    } finally {
                      setAnalyzing(false);
                    }
                  }}
                  loading={analyzing}
                >
                  AI分析
                </Button>
              )}
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadHTMLReport}
              >
                下载 HTML 报告
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadPDFReport}
                style={{ color: '#ffffff' }}
              >
                下载 PDF 报告
              </Button>
            </Space>
          ) : null
        }
        width={1200}
      >
        {selectedResult && (() => {
          // 计算总体结果：仅全部成功为成功
          const isAllPassed = selectedResult.summary.total > 0 && 
                              selectedResult.summary.passed === selectedResult.summary.total && 
                              selectedResult.summary.failed === 0 && 
                              selectedResult.summary.error === 0;
          const overallStatus = isAllPassed ? '成功' : '失败';
          const overallStatusColor = isAllPassed ? 'green' : 'red';
          
          // 计算失败用例数（包括 failed 和 error）
          const failedCount = selectedResult.summary.failed + selectedResult.summary.error;
          
          return (
            <div>
              <Descriptions bordered column={3} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="结果">
                  <Tag color={overallStatusColor} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {overallStatus}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="成功用例">
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#52c41a' }}>
                    {selectedResult.summary.passed} 个
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="失败用例">
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: failedCount > 0 ? '#ff4d4f' : '#52c41a' }}>
                    {failedCount} 个
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="总用例数" span={1}>
                  {selectedResult.summary.total}
                </Descriptions.Item>
                <Descriptions.Item label="耗时" span={2}>
                  {selectedResult.duration}ms
                </Descriptions.Item>
              </Descriptions>
              <Divider>测试用例结果</Divider>
              <Collapse
                items={selectedResult.results.map((result, index) => ({
                  key: index,
                  label: (
                    <Space>
                      <Tag>{index + 1}</Tag>
                      <Tag color={result.status === 'passed' ? 'green' : result.status === 'failed' ? 'red' : 'orange'}>
                        {result.status === 'passed' ? '通过' : result.status === 'failed' ? '失败' : '错误'}
                      </Tag>
                      <Text strong>{result.interface_name}</Text>
                      <Text type="secondary">{result.request.method} {result.request.url}</Text>
                    </Space>
                  ),
                  children: (
                    <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                    <Descriptions bordered size="small" column={1} style={{ width: '100%' }}>
                      <Descriptions.Item label="请求URL">
                        <Typography.Text 
                          style={{ 
                            wordBreak: 'break-all',
                            wordWrap: 'break-word',
                            maxWidth: '100%',
                            display: 'block'
                          }}
                        >
                          {result.request.url}
                        </Typography.Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="请求方法">{result.request.method}</Descriptions.Item>
                      <Descriptions.Item label="CURL 命令">
                        <div style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                          <pre style={{ 
                            maxHeight: 300, 
                            overflow: 'auto', 
                            margin: 0, 
                            padding: '8px', 
                            background: '#f0f7ff', 
                            borderRadius: '4px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            wordWrap: 'break-word',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            lineHeight: '1.5'
                          }}>
                            {generateCurlCommand(result.request)}
                          </pre>
                          <Button
                            type="default"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => {
                              const curlCommand = generateCurlCommand(result.request);
                              navigator.clipboard.writeText(curlCommand);
                              messageApi.success('CURL 命令已复制到剪贴板');
                            }}
                            style={{ position: 'absolute', bottom: 8, right: 8 }}
                          >
                            复制
                          </Button>
                        </div>
                      </Descriptions.Item>
                      <Descriptions.Item label="请求Headers">
                        <div style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                          <pre style={{ 
                            maxHeight: 200, 
                            overflow: 'auto', 
                            margin: 0, 
                            padding: '8px', 
                            background: '#f5f5f5', 
                            borderRadius: '4px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            wordWrap: 'break-word',
                            maxWidth: '100%',
                            boxSizing: 'border-box'
                          }}>
                            {result.request.headers && typeof result.request.headers === 'object'
                              ? JSON.stringify(result.request.headers, null, 2)
                              : result.request.headers || '{}'}
                          </pre>
                          <Button
                            type="default"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => {
                              const text = result.request.headers && typeof result.request.headers === 'object'
                                ? JSON.stringify(result.request.headers, null, 2)
                                : result.request.headers || '{}';
                              navigator.clipboard.writeText(text);
                              messageApi.success('已复制到剪贴板');
                            }}
                            style={{ position: 'absolute', bottom: 8, right: 8 }}
                          >
                            复制
                          </Button>
                        </div>
                      </Descriptions.Item>
                      {result.request.body !== undefined && result.request.body !== null && (
                        <Descriptions.Item label="请求Body">
                          <div style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                            <pre style={{ 
                              maxHeight: 200, 
                              overflow: 'auto', 
                              margin: 0, 
                              padding: '8px', 
                              background: '#f5f5f5', 
                              borderRadius: '4px', 
                              whiteSpace: 'pre-wrap', 
                              wordBreak: 'break-word',
                              wordWrap: 'break-word',
                              maxWidth: '100%',
                              boxSizing: 'border-box'
                            }}>
                              {typeof result.request.body === 'string'
                                ? result.request.body
                                : typeof result.request.body === 'object'
                                  ? JSON.stringify(result.request.body, null, 2)
                                  : String(result.request.body)}
                            </pre>
                            <Button
                              type="default"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => {
                                const text = typeof result.request.body === 'string'
                                  ? result.request.body
                                  : typeof result.request.body === 'object'
                                    ? JSON.stringify(result.request.body, null, 2)
                                    : String(result.request.body);
                                navigator.clipboard.writeText(text);
                                messageApi.success('已复制到剪贴板');
                              }}
                              style={{ position: 'absolute', bottom: 8, right: 8 }}
                            >
                              复制
                            </Button>
                          </div>
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="响应状态码">
                        {result.response && result.response.status_code !== undefined && result.response.status_code !== null ? (
                          <Tag color={result.response.status_code >= 200 && result.response.status_code < 300 ? 'green' : 'red'}>
                            {result.response.status_code}
                          </Tag>
                        ) : (
                          <Text type="secondary">未返回</Text>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="响应Headers">
                        <div style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                          <pre style={{ 
                            maxHeight: 200, 
                            overflow: 'auto', 
                            margin: 0, 
                            padding: '8px', 
                            background: '#f5f5f5', 
                            borderRadius: '4px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            wordWrap: 'break-word',
                            maxWidth: '100%',
                            boxSizing: 'border-box'
                          }}>
                            {result.response && result.response.headers
                              ? (result.response.headers && typeof result.response.headers === 'object'
                                  ? JSON.stringify(result.response.headers, null, 2)
                                  : result.response.headers || '{}')
                              : '{}'}
                          </pre>
                          <Button
                            type="default"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => {
                              const text = result.response && result.response.headers
                                ? (result.response.headers && typeof result.response.headers === 'object'
                                    ? JSON.stringify(result.response.headers, null, 2)
                                    : result.response.headers || '{}')
                                : '{}';
                              navigator.clipboard.writeText(text);
                              messageApi.success('已复制到剪贴板');
                            }}
                            style={{ position: 'absolute', bottom: 8, right: 8 }}
                          >
                            复制
                          </Button>
                        </div>
                      </Descriptions.Item>
                      <Descriptions.Item label="响应内容">
                        <div style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                          <pre style={{ 
                            maxHeight: 300, 
                            overflow: 'auto', 
                            margin: 0, 
                            padding: '8px', 
                            background: '#f5f5f5', 
                            borderRadius: '4px', 
                            whiteSpace: 'pre-wrap', 
                            wordBreak: 'break-word',
                            wordWrap: 'break-word',
                            maxWidth: '100%',
                            boxSizing: 'border-box'
                          }}>
                            {result.response && result.response.body !== undefined && result.response.body !== null
                              ? (typeof result.response.body === 'string'
                                  ? result.response.body
                                  : typeof result.response.body === 'object'
                                    ? JSON.stringify(result.response.body, null, 2)
                                    : String(result.response.body))
                              : '无响应内容'}
                          </pre>
                          <Button
                            type="default"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => {
                              const text = result.response && result.response.body !== undefined && result.response.body !== null
                                ? (typeof result.response.body === 'string'
                                    ? result.response.body
                                    : typeof result.response.body === 'object'
                                      ? JSON.stringify(result.response.body, null, 2)
                                      : String(result.response.body))
                                : '无响应内容';
                              navigator.clipboard.writeText(text);
                              messageApi.success('已复制到剪贴板');
                            }}
                            style={{ position: 'absolute', bottom: 8, right: 8 }}
                          >
                            复制
                          </Button>
                        </div>
                      </Descriptions.Item>
                      {result.error && (
                        <Descriptions.Item label={t('admin.test.pipeline.errorInfo')}>
                          <Typography.Text type="danger">
                            <div style={{ position: 'relative', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                              <pre style={{ 
                                maxHeight: 200, 
                                overflow: 'auto', 
                                margin: 0, 
                                padding: '8px', 
                                background: '#fff1f0', 
                                borderRadius: '4px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                wordWrap: 'break-word',
                                maxWidth: '100%',
                                boxSizing: 'border-box'
                              }}>
                              {result.error.message}
                              {result.error.stack && `\n${result.error.stack}`}
                            </pre>
                            </div>
                          </Typography.Text>
                        </Descriptions.Item>
                      )}
                      {result.assertion_result && (
                        <Descriptions.Item label="断言结果">
                          <div style={{ width: '100%', maxWidth: '100%' }}>
                          <Tag color={result.assertion_result.passed ? 'green' : 'red'}>
                            {result.assertion_result.passed ? '通过' : '失败'}
                          </Tag>
                          {result.assertion_result.message && (
                              <Text style={{ 
                                display: 'block', 
                                marginTop: 4,
                                wordBreak: 'break-word',
                                wordWrap: 'break-word',
                                maxWidth: '100%'
                              }}>
                                {result.assertion_result.message}
                              </Text>
                          )}
                          {result.assertion_result.errors && result.assertion_result.errors.length > 0 && (
                              <div style={{ marginTop: 8 }}>
                              {result.assertion_result.errors.map((err, i) => (
                                  <Text 
                                    key={i} 
                                    type="danger" 
                                    style={{
                                      display: 'block',
                                      wordBreak: 'break-word',
                                      wordWrap: 'break-word',
                                      maxWidth: '100%'
                                    }}
                                  >
                                  {err}
                                </Text>
                              ))}
                            </div>
                          )}
                          </div>
                        </Descriptions.Item>
                      )}
                      <Descriptions.Item label="耗时">{result.duration}ms</Descriptions.Item>
                    </Descriptions>
                  </div>
                  ),
                }))}
              />
              {selectedResult.ai_analysis && (
                <>
                  <Divider>AI分析结果</Divider>
                  <Collapse
                    items={[
                      selectedResult.ai_analysis.testCaseImprovement && {
                        key: 'testCaseImprovement',
                        label: '测试用例完善建议',
                        children: (
                          <div>
                            {selectedResult.ai_analysis.testCaseImprovement.coverageAnalysis && (
                              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                                <Descriptions.Item label="当前覆盖率">
                                  {selectedResult.ai_analysis.testCaseImprovement.coverageAnalysis.currentCoverage}
                                </Descriptions.Item>
                                <Descriptions.Item label="总测试数">
                                  {selectedResult.ai_analysis.testCaseImprovement.coverageAnalysis.totalTests}
                                </Descriptions.Item>
                                <Descriptions.Item label="通过测试">
                                  {selectedResult.ai_analysis.testCaseImprovement.coverageAnalysis.passedTests}
                                </Descriptions.Item>
                                <Descriptions.Item label="失败测试">
                                  {selectedResult.ai_analysis.testCaseImprovement.coverageAnalysis.failedTests}
                                </Descriptions.Item>
                              </Descriptions>
                            )}
                            {selectedResult.ai_analysis.testCaseImprovement.suggestions && (
                              <div>
                                <Text strong>建议：</Text>
                                <pre style={{ 
                                  background: '#f5f5f5', 
                                  padding: 12, 
                                  borderRadius: 4, 
                                  maxHeight: 400, 
                                  overflow: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word'
                                }}>
                                  {typeof selectedResult.ai_analysis.testCaseImprovement.suggestions === 'string'
                                    ? selectedResult.ai_analysis.testCaseImprovement.suggestions
                                    : JSON.stringify(selectedResult.ai_analysis.testCaseImprovement.suggestions, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ),
                      },
                      selectedResult.ai_analysis.bugFixes && {
                        key: 'bugFixes',
                        label: '问题修复建议',
                        children: (
                          <div>
                            {selectedResult.ai_analysis.bugFixes.summary && (
                              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                                {selectedResult.ai_analysis.bugFixes.summary}
                              </Text>
                            )}
                            {selectedResult.ai_analysis.bugFixes.fixes && Array.isArray(selectedResult.ai_analysis.bugFixes.fixes) && (
                              <div>
                                {selectedResult.ai_analysis.bugFixes.fixes.map((fix: any, index: number) => (
                                  <Card key={index} style={{ marginBottom: 12 }}>
                                    <Text strong>{fix.testCase || `问题 ${index + 1}`}</Text>
                                    {fix.rootCause && (
                                      <div style={{ marginTop: 8 }}>
                                        <Text type="secondary">根本原因：</Text>
                                        <Text>{fix.rootCause}</Text>
                                      </div>
                                    )}
                                    {fix.fixCode && (
                                      <div style={{ marginTop: 8 }}>
                                        <Text type="secondary">修复代码：</Text>
                                        <Collapse style={{ marginTop: 8 }}>
                                          <Panel header="修复前" key="before">
                                            <pre style={{ background: '#fff1f0', padding: 8, borderRadius: 4 }}>
                                              {fix.fixCode.before || 'N/A'}
                                            </pre>
                                          </Panel>
                                          <Panel header="修复后" key="after">
                                            <pre style={{ background: '#f6ffed', padding: 8, borderRadius: 4 }}>
                                              {fix.fixCode.after || 'N/A'}
                                            </pre>
                                          </Panel>
                                        </Collapse>
                                      </div>
                                    )}
                                    {fix.reason && (
                                      <div style={{ marginTop: 8 }}>
                                        <Text type="secondary">修复理由：</Text>
                                        <Text>{fix.reason}</Text>
                                      </div>
                                    )}
                                  </Card>
                                ))}
                              </div>
                            )}
                            {selectedResult.ai_analysis.bugFixes.fixes && typeof selectedResult.ai_analysis.bugFixes.fixes === 'object' && !Array.isArray(selectedResult.ai_analysis.bugFixes.fixes) && (
                              <pre style={{ 
                                background: '#f5f5f5', 
                                padding: 12, 
                                borderRadius: 4, 
                                maxHeight: 400, 
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                {JSON.stringify(selectedResult.ai_analysis.bugFixes.fixes, null, 2)}
                              </pre>
                            )}
                          </div>
                        ),
                      },
                      selectedResult.ai_analysis.optimizationSuggestions && {
                        key: 'optimizationSuggestions',
                        label: '优化建议',
                        children: (
                          <div>
                            {selectedResult.ai_analysis.optimizationSuggestions.performanceAnalysis && (
                              <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                                <Descriptions.Item label="平均响应时间">
                                  {selectedResult.ai_analysis.optimizationSuggestions.performanceAnalysis.averageDuration}
                                </Descriptions.Item>
                                <Descriptions.Item label="最大响应时间">
                                  {selectedResult.ai_analysis.optimizationSuggestions.performanceAnalysis.maxDuration}
                                </Descriptions.Item>
                                <Descriptions.Item label="最小响应时间">
                                  {selectedResult.ai_analysis.optimizationSuggestions.performanceAnalysis.minDuration}
                                </Descriptions.Item>
                                <Descriptions.Item label="总请求数">
                                  {selectedResult.ai_analysis.optimizationSuggestions.performanceAnalysis.totalRequests}
                                </Descriptions.Item>
                              </Descriptions>
                            )}
                            {selectedResult.ai_analysis.optimizationSuggestions.suggestions && (
                              <div>
                                <Text strong>建议：</Text>
                                <pre style={{ 
                                  background: '#f5f5f5', 
                                  padding: 12, 
                                  borderRadius: 4, 
                                  maxHeight: 400, 
                                  overflow: 'auto',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word'
                                }}>
                                  {typeof selectedResult.ai_analysis.optimizationSuggestions.suggestions === 'string'
                                    ? selectedResult.ai_analysis.optimizationSuggestions.suggestions
                                    : JSON.stringify(selectedResult.ai_analysis.optimizationSuggestions.suggestions, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ),
                      },
                    ].filter(Boolean)}
                  />
                </>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal
        title="导入测试流水线"
        open={importModalVisible}
        onOk={handleImport}
        onCancel={() => {
          setImportModalVisible(false);
          setImportFile(null);
        }}
        confirmLoading={importing}
        okButtonProps={{ style: { color: '#ffffff' } }}
      >
        <Form layout="vertical">
          <Form.Item label="导入模式">
            <Select value={importMode} onChange={setImportMode}>
              <Option value="normal">普通模式（跳过已存在的任务）</Option>
              <Option value="good">智能合并（合并测试用例，保留已有修改）</Option>
              <Option value="mergin">完全覆盖（完全使用新数据）</Option>
            </Select>
          </Form.Item>
          <Form.Item label="选择文件">
            <Upload
              beforeUpload={(file) => {
                setImportFile({ originFileObj: file });
                return false;
              }}
              accept=".json"
              maxCount={1}
              onRemove={() => setImportFile(null)}
            >
              <Button icon={<ImportOutlined />}>选择JSON文件</Button>
            </Upload>
            {importFile && (
              <div style={{ marginTop: 8, color: '#666' }}>
                已选择: {importFile.originFileObj?.name}
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TestPipeline;

