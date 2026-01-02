import { logger } from './logger.js';
import CodeRepository from '../Models/CodeRepository.js';
import AutoTestResult from '../Models/AutoTestResult.js';
import AutoTestTask from '../Models/AutoTestTask.js';
import { codeRepositoryService } from './codeRepositoryService.js';
import { aiService } from './aiService.js';

/**
 * 测试流水线AI分析服务
 * 结合代码仓库和AI服务，提供：
 * 1. 完善测试用例，无限接近覆盖率100%
 * 2. 修复已发现的问题/bug
 * 3. 给出优化建议以及所有变更的理由
 */
class TestPipelineAIService {
  /**
   * 分析测试结果
   */
  async analyzeTestResult(resultId, task) {
    try {
      // 获取测试结果
      const result = await AutoTestResult.findById(resultId)
        .populate('task_id', 'name project_id code_repository_id ai_config_provider')
        .lean();

      if (!result) {
        throw new Error('测试结果不存在');
      }

      // 获取代码仓库配置
      const repository = await CodeRepository.findById(task.code_repository_id).lean();
      if (!repository || !repository.enabled) {
        logger.warn({ resultId, taskId: task._id }, 'Code repository not found or disabled, skipping AI analysis');
        return null;
      }

      // 获取相关代码文件
      const codeContext = await this.getRelevantCode(result, repository);

      // 执行三项AI分析
      const analysis = {
        testCaseImprovement: null,
        bugFixes: null,
        optimizationSuggestions: null,
        timestamp: new Date(),
      };

      // 1. 完善测试用例
      try {
        analysis.testCaseImprovement = await this.improveTestCases(result, codeContext, task.ai_config_provider);
      } catch (error) {
        logger.error({ error, resultId }, 'Failed to improve test cases');
      }

      // 2. 修复问题/bug
      try {
        analysis.bugFixes = await this.fixBugs(result, codeContext, task.ai_config_provider);
      } catch (error) {
        logger.error({ error, resultId }, 'Failed to fix bugs');
      }

      // 3. 优化建议
      try {
        analysis.optimizationSuggestions = await this.getOptimizationSuggestions(result, codeContext, task.ai_config_provider);
      } catch (error) {
        logger.error({ error, resultId }, 'Failed to get optimization suggestions');
      }

      // 保存分析结果
      await AutoTestResult.findByIdAndUpdate(resultId, {
        $set: {
          ai_analysis: analysis,
        },
      });

      logger.info({ resultId, taskId: task._id }, 'AI analysis completed');

      return analysis;
    } catch (error) {
      logger.error({ error, resultId }, 'Failed to analyze test result');
      throw error;
    }
  }

  /**
   * 获取相关代码文件
   */
  async getRelevantCode(testResult, repository) {
    const codeFiles = [];
    
    try {
      // 从测试结果中提取接口路径，推断代码文件位置
      for (const testCaseResult of testResult.results || []) {
        if (testCaseResult.request?.url) {
          const interfacePath = testCaseResult.request.url;
          const possiblePaths = codeRepositoryService.inferFilePath(interfacePath);
          
          for (const filePath of possiblePaths) {
            try {
              const content = await codeRepositoryService.getFileContent(repository, filePath);
              if (content) {
                codeFiles.push({
                  path: filePath,
                  content: content,
                  language: this.detectLanguage(filePath),
                });
                break; // 找到第一个文件就停止
              }
            } catch (error) {
              // 文件不存在，继续尝试下一个
              continue;
            }
          }
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to get code context, continuing without code');
    }

    return codeFiles;
  }

  /**
   * 检测代码语言
   */
  detectLanguage(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
    };
    return languageMap[ext] || 'text';
  }

  /**
   * 完善测试用例
   */
  async improveTestCases(testResult, codeContext, aiProvider) {
    const prompt = this.buildTestCaseImprovementPrompt(testResult, codeContext);
    
    const response = await aiService.callAI(prompt, {
      provider: aiProvider,
      systemPrompt: '你是一个专业的测试工程师，擅长编写全面的测试用例，目标是达到100%的代码覆盖率。',
    });

    return {
      suggestions: this.parseAIResponse(response),
      coverageAnalysis: this.analyzeCoverage(testResult),
    };
  }

  /**
   * 修复问题/bug
   */
  async fixBugs(testResult, codeContext, aiProvider) {
    const failedTests = (testResult.results || []).filter(r => r.status === 'failed' || r.status === 'error');
    
    if (failedTests.length === 0) {
      return {
        fixes: [],
        message: '没有发现失败的测试用例',
      };
    }

    const prompt = this.buildBugFixPrompt(testResult, failedTests, codeContext);
    
    const response = await aiService.callAI(prompt, {
      provider: aiProvider,
      systemPrompt: '你是一个专业的软件工程师，擅长分析和修复代码中的bug。请提供详细的修复方案和代码变更。',
    });

    return {
      fixes: this.parseFixes(response, failedTests),
      summary: `发现 ${failedTests.length} 个失败的测试用例，已提供修复建议`,
    };
  }

  /**
   * 获取优化建议
   */
  async getOptimizationSuggestions(testResult, codeContext, aiProvider) {
    const prompt = this.buildOptimizationPrompt(testResult, codeContext);
    
    const response = await aiService.callAI(prompt, {
      provider: aiProvider,
      systemPrompt: '你是一个资深的软件架构师，擅长代码优化和性能提升。请提供详细的优化建议和变更理由。',
    });

    return {
      suggestions: this.parseOptimizationSuggestions(response),
      performanceAnalysis: this.analyzePerformance(testResult),
    };
  }

  /**
   * 构建测试用例完善提示
   */
  buildTestCaseImprovementPrompt(testResult, codeContext) {
    const codeSnippets = codeContext.map(f => `文件: ${f.path}\n\`\`\`${f.language}\n${f.content.substring(0, 2000)}\n\`\`\``).join('\n\n');
    
    const testSummary = `
测试结果摘要:
- 总测试数: ${testResult.summary.total}
- 通过: ${testResult.summary.passed}
- 失败: ${testResult.summary.failed}
- 错误: ${testResult.summary.error}
`;

    const failedTests = (testResult.results || []).filter(r => r.status === 'failed' || r.status === 'error');
    const failedDetails = failedTests.map((test, idx) => `
测试用例 ${idx + 1}:
- 接口: ${test.interface_name}
- 状态: ${test.status}
- 错误: ${test.error?.message || test.assertion_result?.errors?.join(', ') || 'N/A'}
`).join('\n');

    return `
请分析以下测试结果和代码，提供完善的测试用例建议，目标是达到100%的代码覆盖率。

${testSummary}

失败的测试用例:
${failedDetails}

相关代码文件:
${codeSnippets || '未找到相关代码文件'}

请提供：
1. 缺失的测试用例（针对未覆盖的代码路径）
2. 边界条件测试用例
3. 异常情况测试用例
4. 每个新测试用例的详细说明和预期结果
5. 如何提高测试覆盖率到接近100%的具体建议

请以JSON格式返回，包含以下字段：
{
  "missingTestCases": [
    {
      "description": "测试用例描述",
      "testCase": "具体的测试用例内容",
      "expectedResult": "预期结果",
      "coverage": "覆盖的代码路径"
    }
  ],
  "boundaryTestCases": [...],
  "exceptionTestCases": [...],
  "improvementSuggestions": "提高覆盖率的建议"
}
`;
  }

  /**
   * 构建bug修复提示
   */
  buildBugFixPrompt(testResult, failedTests, codeContext) {
    const codeSnippets = codeContext.map(f => `文件: ${f.path}\n\`\`\`${f.language}\n${f.content.substring(0, 2000)}\n\`\`\``).join('\n\n');
    
    const failedDetails = failedTests.map((test, idx) => `
测试用例 ${idx + 1}:
- 接口: ${test.interface_name}
- 请求: ${JSON.stringify(test.request, null, 2)}
- 响应: ${JSON.stringify(test.response, null, 2)}
- 错误信息: ${test.error?.message || test.assertion_result?.errors?.join(', ') || 'N/A'}
- 断言结果: ${JSON.stringify(test.assertion_result, null, 2)}
`).join('\n');

    return `
请分析以下失败的测试用例和相关代码，提供详细的bug修复方案。

失败的测试用例详情:
${failedDetails}

相关代码文件:
${codeSnippets || '未找到相关代码文件'}

请提供：
1. 每个bug的根本原因分析
2. 具体的修复代码（包含修复前后的对比）
3. 修复后的测试用例（验证修复是否有效）
4. 修复的理由和影响范围

请以JSON格式返回，包含以下字段：
{
  "bugs": [
    {
      "testCase": "测试用例名称",
      "rootCause": "根本原因",
      "fixCode": {
        "before": "修复前的代码",
        "after": "修复后的代码",
        "file": "文件路径"
      },
      "verificationTest": "验证修复的测试用例",
      "reason": "修复理由",
      "impact": "影响范围"
    }
  ],
  "summary": "修复总结"
}
`;
  }

  /**
   * 构建优化建议提示
   */
  buildOptimizationPrompt(testResult, codeContext) {
    const codeSnippets = codeContext.map(f => `文件: ${f.path}\n\`\`\`${f.language}\n${f.content.substring(0, 2000)}\n\`\`\``).join('\n\n');
    
    const performanceData = (testResult.results || []).map(r => ({
      interface: r.interface_name,
      duration: r.duration || 0,
      status: r.status,
    }));

    return `
请分析以下测试结果和代码，提供代码优化建议。

测试性能数据:
${JSON.stringify(performanceData, null, 2)}

相关代码文件:
${codeSnippets || '未找到相关代码文件'}

请提供：
1. 性能优化建议（响应时间、资源使用等）
2. 代码质量优化建议（可读性、可维护性、设计模式等）
3. 安全性优化建议
4. 每个优化建议的具体实现方案和变更理由
5. 优化前后的对比和预期效果

请以JSON格式返回，包含以下字段：
{
  "performanceOptimizations": [
    {
      "area": "优化领域",
      "currentState": "当前状态",
      "suggestion": "优化建议",
      "implementation": "具体实现方案",
      "expectedImprovement": "预期改进",
      "reason": "优化理由"
    }
  ],
  "codeQualityOptimizations": [...],
  "securityOptimizations": [...],
  "summary": "优化总结"
}
`;
  }

  /**
   * 解析AI响应
   */
  parseAIResponse(response) {
    try {
      // 尝试解析JSON
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      return { raw: response };
    } catch (error) {
      logger.warn({ error }, 'Failed to parse AI response as JSON');
      return { raw: response };
    }
  }

  /**
   * 解析修复建议
   */
  parseFixes(response, failedTests) {
    const parsed = this.parseAIResponse(response);
    if (parsed.bugs && Array.isArray(parsed.bugs)) {
      return parsed.bugs;
    }
    return [];
  }

  /**
   * 解析优化建议
   */
  parseOptimizationSuggestions(response) {
    const parsed = this.parseAIResponse(response);
    return parsed;
  }

  /**
   * 分析覆盖率
   */
  analyzeCoverage(testResult) {
    const total = testResult.summary.total || 0;
    const passed = testResult.summary.passed || 0;
    const coverage = total > 0 ? (passed / total) * 100 : 0;
    
    return {
      currentCoverage: coverage.toFixed(2) + '%',
      totalTests: total,
      passedTests: passed,
      failedTests: testResult.summary.failed || 0,
      errorTests: testResult.summary.error || 0,
    };
  }

  /**
   * 分析性能
   */
  analyzePerformance(testResult) {
    const results = testResult.results || [];
    const durations = results.map(r => r.duration || 0).filter(d => d > 0);
    
    if (durations.length === 0) {
      return {
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
      };
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    return {
      averageDuration: avg.toFixed(2) + 'ms',
      maxDuration: max + 'ms',
      minDuration: min + 'ms',
      totalRequests: durations.length,
    };
  }
}

export const testPipelineAIService = new TestPipelineAIService();
export default testPipelineAIService;

