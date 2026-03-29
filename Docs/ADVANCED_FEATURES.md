# ApiAdmin - 高级功能设计文档

**文档版本**: 1.0  
**创建日期**: 2025-01-27  
**目标**: 详细说明性能监控、CI/CD集成、高级文档功能的实现方案

---

## 1. 性能监控与分析系统

### 1.1 系统架构

```
┌─────────────┐
│   API调用   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ 日志收集器  │────▶│ 时间序列DB  │────▶│ 分析引擎    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │ 监控看板    │
                                         └─────────────┘
```

### 1.2 数据模型

```typescript
// Server/Models/APICallLog.ts
import mongoose from 'mongoose';

const APICallLogSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  interfaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number, required: true },
  responseTime: { type: Number, required: true }, // 毫秒
  requestSize: { type: Number },
  responseSize: { type: Number },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  ip: { type: String },
  userAgent: { type: String },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// 复合索引优化查询
APICallLogSchema.index({ interfaceId: 1, timestamp: -1 });
APICallLogSchema.index({ projectId: 1, timestamp: -1 });
APICallLogSchema.index({ userId: 1, timestamp: -1 });

export const APICallLog = mongoose.model('APICallLog', APICallLogSchema);
```

### 1.3 API 调用统计

```typescript
// Server/Services/AnalyticsService.ts
export class AnalyticsService {
  // 获取接口统计
  async getInterfaceStatistics(
    interfaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InterfaceStatistics> {
    const logs = await APICallLog.find({
      interfaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const total = logs.length;
    const success = logs.filter(log => log.statusCode < 400).length;
    const errors = total - success;

    return {
      totalCalls: total,
      successCalls: success,
      errorCalls: errors,
      avgResponseTime: this.average(logs.map(log => log.responseTime)),
      p50ResponseTime: this.percentile(
        logs.map(log => log.responseTime).sort((a, b) => a - b),
        50
      ),
      p95ResponseTime: this.percentile(
        logs.map(log => log.responseTime).sort((a, b) => a - b),
        95
      ),
      p99ResponseTime: this.percentile(
        logs.map(log => log.responseTime).sort((a, b) => a - b),
        99
      ),
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      callsByHour: this.groupByHour(logs),
      callsByDay: this.groupByDay(logs),
      topErrors: this.getTopErrors(logs),
    };
  }

  // 响应时间分析
  async getResponseTimeAnalysis(
    interfaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ResponseTimeAnalysis> {
    const logs = await APICallLog.find({
      interfaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const responseTimes = logs.map(log => log.responseTime);
    const sorted = responseTimes.sort((a, b) => a - b);

    return {
      avg: this.average(responseTimes),
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      distribution: this.getDistribution(responseTimes, 10),
      trend: this.getResponseTimeTrend(logs),
    };
  }

  // 错误率统计
  async getErrorRate(
    interfaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ErrorRateStats> {
    const logs = await APICallLog.find({
      interfaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const total = logs.length;
    const errors = logs.filter(log => log.statusCode >= 400);

    return {
      total,
      errors: errors.length,
      errorRate: total > 0 ? (errors.length / total) * 100 : 0,
      errorsByStatus: this.groupBy(errors, 'statusCode'),
      errorTrend: this.getErrorTrend(logs),
    };
  }

  // 使用趋势分析
  async getUsageTrend(
    projectId: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<UsageTrend> {
    const startDate = this.getStartDate(period);
    const groupFormat = this.getGroupByFormat(period);

    const trend = await APICallLog.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$timestamp' } },
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          errorCount: {
            $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      period,
      data: trend.map(item => ({
        time: item._id,
        calls: item.count,
        avgResponseTime: item.avgResponseTime,
        errors: item.errorCount,
      })),
    };
  }
}
```

### 1.4 监控看板 API

```typescript
// Server/Controllers/AnalyticsController.ts
export class AnalyticsController {
  // 获取接口统计
  async getInterfaceStats(ctx: Context) {
    const { interfaceId, startDate, endDate } = ctx.query;
    const stats = await analyticsService.getInterfaceStatistics(
      interfaceId,
      new Date(startDate),
      new Date(endDate)
    );
    ctx.body = stats;
  }

  // 获取响应时间分析
  async getResponseTimeAnalysis(ctx: Context) {
    const { interfaceId, startDate, endDate } = ctx.query;
    const analysis = await analyticsService.getResponseTimeAnalysis(
      interfaceId,
      new Date(startDate),
      new Date(endDate)
    );
    ctx.body = analysis;
  }

  // 获取使用趋势
  async getUsageTrend(ctx: Context) {
    const { projectId, period = 'day' } = ctx.query;
    const trend = await analyticsService.getUsageTrend(projectId, period);
    ctx.body = trend;
  }

  // 获取错误率统计
  async getErrorRate(ctx: Context) {
    const { interfaceId, startDate, endDate } = ctx.query;
    const errorRate = await analyticsService.getErrorRate(
      interfaceId,
      new Date(startDate),
      new Date(endDate)
    );
    ctx.body = errorRate;
  }
}
```

---

## 2. CI/CD 深度集成

### 2.1 CLI 命令行工具

#### 2.1.1 项目结构

```
CLI/
├── bin/
│   └── apiadmin.js          # 入口文件
├── src/
│   ├── index.ts             # 主程序
│   ├── commands/
│   │   ├── test.ts          # 测试命令
│   │   ├── sync.ts          # 同步命令
│   │   ├── export.ts        # 导出命令
│   │   └── import.ts        # 导入命令
│   ├── utils/
│   │   ├── api.ts           # API 客户端
│   │   ├── config.ts        # 配置管理
│   │   └── report.ts        # 报告生成
│   └── types.ts             # 类型定义
├── package.json
└── README.md
```

#### 2.1.2 核心实现

```typescript
// CLI/src/index.ts
import { Command } from 'commander';
import { runTests } from './commands/test';
import { syncSwagger } from './commands/sync';
import { exportData } from './commands/export';
import { importData } from './commands/import';

const program = new Command();

program
  .name('apiadmin')
  .description('ApiAdmin CLI Tool - API Management and Testing')
  .version('1.0.0');

// 测试命令
program
  .command('test')
  .description('Run API test collection')
  .option('-c, --collection <id>', 'Test collection ID')
  .option('-e, --env <env>', 'Environment name', 'default')
  .option('-o, --output <format>', 'Output format (json, junit, allure)', 'json')
  .option('-f, --file <file>', 'Output file path')
  .action(async (options) => {
    await runTests(options);
  });

// Swagger 同步
program
  .command('sync')
  .description('Sync Swagger/OpenAPI specification')
  .requiredOption('-u, --url <url>', 'Swagger/OpenAPI URL')
  .requiredOption('-p, --project <id>', 'Project ID')
  .option('-t, --token <token>', 'Project token')
  .option('--mode <mode>', 'Sync mode (normal, merge, overwrite)', 'normal')
  .action(async (options) => {
    await syncSwagger(options);
  });

// 数据导出
program
  .command('export')
  .description('Export project data')
  .requiredOption('-p, --project <id>', 'Project ID')
  .option('-f, --format <format>', 'Export format (json, swagger, markdown)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    await exportData(options);
  });

// 数据导入
program
  .command('import')
  .description('Import project data')
  .requiredOption('-f, --file <file>', 'Import file path')
  .requiredOption('-p, --project <id>', 'Project ID')
  .option('-m, --mode <mode>', 'Import mode (normal, merge, overwrite)', 'normal')
  .action(async (options) => {
    await importData(options);
  });

program.parse();
```

#### 2.1.3 测试执行实现

```typescript
// CLI/src/commands/test.ts
import axios from 'axios';
import ora from 'ora';
import { writeFileSync } from 'fs';
import { generateJUnitReport, generateAllureReport } from '../utils/report';

export async function runTests(options: {
  collection: string;
  env?: string;
  output?: string;
  file?: string;
}) {
  const spinner = ora('Running tests...').start();

  try {
    const apiUrl = process.env.APIADMIN_URL || 'http://localhost:3000';
    const token = process.env.APIADMIN_TOKEN;

    if (!token) {
      throw new Error('APIADMIN_TOKEN environment variable is required');
    }

    const response = await axios.post(
      `${apiUrl}/api/test/run`,
      {
        collectionId: options.collection,
        environment: options.env || 'default',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    spinner.succeed('Tests completed');

    const report = response.data;
    
    // 输出结果
    console.log(`\nTest Results:`);
    console.log(`  Total: ${report.total}`);
    console.log(`  Passed: ${report.passed}`);
    console.log(`  Failed: ${report.failed}`);
    console.log(`  Duration: ${report.duration}ms\n`);

    // 生成报告文件
    if (options.output && options.file) {
      let reportContent: string;
      
      switch (options.output) {
        case 'junit':
          reportContent = generateJUnitReport(report);
          break;
        case 'allure':
          generateAllureReport(report, options.file);
          return;
        default:
          reportContent = JSON.stringify(report, null, 2);
      }

      writeFileSync(options.file, reportContent);
      console.log(`Report saved to: ${options.file}`);
    }

    // 退出码
    process.exit(report.failed > 0 ? 1 : 0);
  } catch (error: any) {
    spinner.fail('Tests failed');
    console.error(error.message);
    process.exit(1);
  }
}
```

### 2.2 GitHub Actions 集成

```yaml
# .github/workflows/api-test.yml
name: API Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * *' # 每天运行

jobs:
  api-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install ApiAdmin CLI
        run: npm install -g @apiadmin/cli
      
      - name: Run API Tests
        env:
          APIADMIN_URL: ${{ secrets.APIADMIN_URL }}
          APIADMIN_TOKEN: ${{ secrets.APIADMIN_TOKEN }}
        run: |
          apiadmin test \
            --collection ${{ secrets.TEST_COLLECTION_ID }} \
            --env production \
            --output junit \
            --file test-results.xml
      
      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: test-results.xml
      
      - name: Upload Allure Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: allure-report
          path: allure-results
```

### 2.3 Jenkins 集成

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        APIADMIN_URL = credentials('apiadmin-url')
        APIADMIN_TOKEN = credentials('apiadmin-token')
        TEST_COLLECTION_ID = 'your-collection-id'
    }
    
    stages {
        stage('API Tests') {
            steps {
                sh '''
                    npm install -g @apiadmin/cli
                    apiadmin test \
                        --collection ${TEST_COLLECTION_ID} \
                        --env ${ENVIRONMENT} \
                        --output junit \
                        --file test-results.xml
                '''
            }
        }
        
        stage('Publish Results') {
            steps {
                junit 'test-results.xml'
                publishHTML([
                    reportDir: 'allure-results',
                    reportFiles: 'index.html',
                    reportName: 'API Test Report'
                ])
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'test-results.xml', fingerprint: true
        }
        failure {
            emailext (
                subject: "API Tests Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "API tests failed. Check the build for details.",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}
```

### 2.4 GitLab CI 集成

```yaml
# .gitlab-ci.yml
stages:
  - test

api-tests:
  stage: test
  image: node:18
  variables:
    APIADMIN_URL: $APIADMIN_URL
    APIADMIN_TOKEN: $APIADMIN_TOKEN
  before_script:
    - npm install -g @apiadmin/cli
  script:
    - apiadmin test
        --collection $TEST_COLLECTION_ID
        --env $ENVIRONMENT
        --output junit
        --file test-results.xml
  artifacts:
    reports:
      junit: test-results.xml
    paths:
      - allure-results/
    expire_in: 30 days
  only:
    - main
    - develop
    - merge_requests
```

---

## 3. 高级文档功能

### 3.1 多版本文档对比

```typescript
// Server/Models/InterfaceVersion.ts
const InterfaceVersionSchema = new mongoose.Schema({
  interfaceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  version: { type: String, required: true },
  path: { type: String, required: true },
  method: { type: String, required: true },
  req_query: [mongoose.Schema.Types.Mixed],
  req_body: { type: String },
  res_body: { type: String },
  desc: { type: String },
  markdown: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// 版本对比服务
export class VersionCompareService {
  async compareVersions(
    interfaceId: string,
    version1: string,
    version2: string
  ): Promise<VersionDiff> {
    const v1 = await InterfaceVersion.findOne({ interfaceId, version: version1 });
    const v2 = await InterfaceVersion.findOne({ interfaceId, version: version2 });

    if (!v1 || !v2) {
      throw new Error('Version not found');
    }

    return {
      path: this.diffString(v1.path, v2.path),
      method: this.diffString(v1.method, v2.method),
      requestParams: this.diffArray(v1.req_query, v2.req_query),
      requestBody: this.diffJSON(v1.req_body, v2.req_body),
      responseBody: this.diffJSON(v1.res_body, v2.res_body),
      description: this.diffString(v1.desc, v2.desc),
    };
  }

  private diffString(old: string, new_: string): DiffResult {
    if (old === new_) {
      return { type: 'unchanged', value: old };
    }
    return {
      type: 'modified',
      oldValue: old,
      newValue: new_,
    };
  }

  private diffJSON(old: string, new_: string): DiffResult {
    try {
      const oldObj = JSON.parse(old);
      const newObj = JSON.parse(new_);
      return this.diffObject(oldObj, newObj);
    } catch {
      return this.diffString(old, new_);
    }
  }
}
```

### 3.2 交互式文档（Try it out）

```typescript
// Client/Components/Document/TryItOut.tsx
import React, { useState } from 'react';
import { Button, Form, Input, Select, Space, Tabs } from 'antd';
import axios, { AxiosResponse } from 'axios';

interface TryItOutProps {
  interface: Interface;
  environment?: Environment;
}

export const TryItOut: React.FC<TryItOutProps> = ({ interface: api, environment }) => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AxiosResponse | null>(null);
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      // 构建 URL
      let url = `${environment?.baseUrl || ''}${api.path}`;
      
      // 替换路径参数
      if (values.pathParams) {
        Object.keys(values.pathParams).forEach(key => {
          url = url.replace(`{${key}}`, values.pathParams[key]);
        });
      }

      // 发送请求
      const result = await axios({
        method: api.method,
        url,
        params: values.query,
        data: values.body ? JSON.parse(values.body) : undefined,
        headers: {
          'Content-Type': 'application/json',
          ...environment?.headers,
          ...values.headers,
        },
      });

      setResponse(result);
    } catch (error: any) {
      setResponse({
        status: error.response?.status || 500,
        statusText: error.response?.statusText || 'Error',
        data: error.response?.data || { error: error.message },
        headers: error.response?.headers || {},
      } as AxiosResponse);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="try-it-out">
      <Tabs defaultActiveKey="request">
        <Tabs.TabPane tab="Request" key="request">
          <Form form={form} onFinish={handleSubmit} layout="vertical">
            {/* Path 参数 */}
            {api.path.match(/\{(\w+)\}/g)?.map(param => {
              const key = param.slice(1, -1);
              return (
                <Form.Item key={key} label={key} name={['pathParams', key]}>
                  <Input placeholder={`Enter ${key}`} />
                </Form.Item>
              );
            })}

            {/* Query 参数 */}
            {api.req_query?.map(param => (
              <Form.Item
                key={param.name}
                label={param.name}
                name={['query', param.name]}
                rules={param.required ? [{ required: true }] : []}
              >
                <Input placeholder={param.desc} />
              </Form.Item>
            ))}

            {/* Body 参数 */}
            {api.req_body_type === 'json' && (
              <Form.Item label="Body" name="body">
                <Input.TextArea
                  rows={10}
                  placeholder="Enter JSON body"
                />
              </Form.Item>
            )}

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Send Request
              </Button>
            </Form.Item>
          </Form>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Response" key="response">
          {response && (
            <div className="response">
              <div className="response-status">
                Status: {response.status} {response.statusText}
              </div>
              <pre>{JSON.stringify(response.data, null, 2)}</pre>
            </div>
          )}
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};
```

### 3.3 文档主题定制

```typescript
// Server/Models/DocumentTheme.ts
const DocumentThemeSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
  },
  name: { type: String, required: true },
  config: {
    primaryColor: { type: String, default: '#1890ff' },
    backgroundColor: { type: String, default: '#ffffff' },
    textColor: { type: String, default: '#333333' },
    fontFamily: { type: String, default: 'Arial, sans-serif' },
    logo: { type: String },
    favicon: { type: String },
    customCSS: { type: String },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 文档生成服务
export class DocumentGenerator {
  async generateHTML(
    project: Project,
    interfaces: Interface[],
    theme?: DocumentTheme
  ): Promise<string> {
    const config = theme?.config || this.getDefaultTheme();
    
    const template = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${project.name} - API Documentation</title>
          <style>
            :root {
              --primary-color: ${config.primaryColor};
              --bg-color: ${config.backgroundColor};
              --text-color: ${config.textColor};
              --font-family: ${config.fontFamily};
            }
            body {
              font-family: var(--font-family);
              background-color: var(--bg-color);
              color: var(--text-color);
            }
            ${config.customCSS || ''}
          </style>
        </head>
        <body>
          ${this.renderInterfaces(interfaces)}
        </body>
      </html>
    `;

    return template;
  }
}
```

### 3.4 文档导出（PDF/Word）

```typescript
// Server/Services/DocumentExportService.ts
import puppeteer from 'puppeteer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export class DocumentExportService {
  // 导出 PDF
  async exportToPDF(
    project: Project,
    interfaces: Interface[]
  ): Promise<Buffer> {
    const html = await this.generateHTML(project, interfaces);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });
    
    await browser.close();
    return pdf;
  }

  // 导出 Word
  async exportToWord(
    project: Project,
    interfaces: Interface[]
  ): Promise<Buffer> {
    const children: Paragraph[] = [
      new Paragraph({
        text: project.name,
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({
        text: project.desc || '',
      }),
    ];

    interfaces.forEach(api => {
      children.push(
        new Paragraph({
          text: `${api.method} ${api.path}`,
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: api.desc || '',
        }),
        new Paragraph({
          text: 'Request Parameters:',
          heading: HeadingLevel.HEADING_2,
        }),
        ...this.renderParameters(api.req_query),
        new Paragraph({
          text: 'Response:',
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: JSON.stringify(JSON.parse(api.res_body || '{}'), null, 2),
              font: 'Courier New',
            }),
          ],
        })
      );
    });

    const doc = new Document({
      sections: [{
        children,
      }],
    });

    return await Packer.toBuffer(doc);
  }
}
```

---

## 4. API 路由设计

### 4.1 性能监控 API

```
GET    /api/analytics/interface/:id/stats      # 获取接口统计
GET    /api/analytics/interface/:id/response-time  # 响应时间分析
GET    /api/analytics/interface/:id/error-rate     # 错误率统计
GET    /api/analytics/project/:id/trend            # 使用趋势
GET    /api/analytics/project/:id/top-interfaces   # 热门接口排行
```

### 4.2 CI/CD API

```
POST   /api/test/run                            # 运行测试（CLI调用）
GET    /api/test/report/:id                     # 获取测试报告
POST   /api/sync/swagger                        # 同步 Swagger
POST   /api/export                              # 导出数据
POST   /api/import                              # 导入数据
```

### 4.3 文档 API

```
GET    /api/document/interface/:id/versions     # 获取版本列表
GET    /api/document/interface/:id/compare      # 对比版本
GET    /api/document/project/:id/html           # 生成 HTML 文档
GET    /api/document/project/:id/pdf            # 导出 PDF
GET    /api/document/project/:id/word           # 导出 Word
GET    /api/document/theme/:projectId           # 获取主题配置
PUT    /api/document/theme/:projectId           # 更新主题配置
```

---

## 5. 总结

### 5.1 功能清单

✅ **性能监控与分析**
- API 调用统计
- 响应时间分析（P50/P95/P99）
- 错误率统计
- 使用趋势分析

✅ **CI/CD 深度集成**
- CLI 命令行工具
- GitHub Actions 集成
- Jenkins 插件
- GitLab CI 集成

✅ **高级文档功能**
- 多版本文档对比
- 交互式文档（Try it out）
- 文档主题定制
- 文档导出（PDF/Word）

### 5.2 技术栈

- **监控**: MongoDB + 聚合查询 / InfluxDB（可选）
- **CLI**: Commander.js + Axios
- **文档导出**: Puppeteer (PDF) + docx (Word)
- **版本对比**: 自定义 diff 算法

---

**文档版本**：v0.0.1
**创建日期**：2025-01-27  
**最后更新**：2025-01-27

