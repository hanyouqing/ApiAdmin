import { logger } from './logger.js';
import CodeRepository from '../Models/CodeRepository.js';
import AutoTestResult from '../Models/AutoTestResult.js';
import AutoTestTask from '../Models/AutoTestTask.js';
import { codeRepositoryService } from './codeRepositoryService.js';
import { aiService } from './aiService.js';

/**
 * 测试分析服务
 * 结合代码仓库和AI服务，分析测试失败并提供修复建议
 */
class TestAnalysisService {
  /**
   * 分析测试结果
   */
  async analyzeTestResult(resultId, options = {}) {
    try {
      // 获取测试结果
      const result = await AutoTestResult.findById(resultId)
        .populate('task_id', 'name project_id')
        .lean();

      if (!result) {
        throw new Error('测试结果不存在');
      }

      // 获取代码仓库配置
      const repository = await CodeRepository.findOne({
        project_id: result.task_id.project_id,
        enabled: true,
      });

      let codeContext = [];
      
      // 如果配置了代码仓库，获取相关代码
      if (repository && options.includeCode !== false) {
        try {
          codeContext = await this.getRelevantCode(result, repository);
        } catch (error) {
          logger.warn({ error, resultId }, 'Failed to get code from repository, continuing without code context');
        }
      }

      // 使用AI分析测试失败
      const analysis = await aiService.analyzeTestFailure(result, codeContext);

      return {
        resultId,
        analysis: analysis.analysis,
        suggestions: analysis.suggestions,
        confidence: analysis.confidence,
        codeContext: codeContext.map(f => ({ path: f.path, language: f.language })),
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error({ error, resultId }, 'Failed to analyze test result');
      throw error;
    }
  }

  /**
   * 获取相关代码
   */
  async getRelevantCode(testResult, repository) {
    const codeFiles = [];
    
    try {
      // 从测试结果中提取接口信息
      if (testResult.results && Array.isArray(testResult.results)) {
        for (const testCaseResult of testResult.results) {
          // 只处理失败的测试用例
          if (testCaseResult.status !== 'failed' && testCaseResult.status !== 'error') {
            continue;
          }

          // 获取接口路径
          const interfacePath = testCaseResult.interface_id?.path || testCaseResult.path;
          if (!interfacePath) {
            continue;
          }

          // 推断可能的代码文件路径
          const possiblePaths = codeRepositoryService.inferFilePath(interfacePath, '');
          
          // 尝试获取代码文件
          for (const filePath of possiblePaths) {
            try {
              const content = await codeRepositoryService.getFileContent(repository, filePath);
              codeFiles.push({
                path: filePath,
                content,
                language: this.detectLanguage(filePath),
              });
              break; // 找到第一个文件就停止
            } catch (error) {
              // 文件不存在，继续尝试下一个
              continue;
            }
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error getting relevant code');
    }

    return codeFiles;
  }

  /**
   * 检测代码语言
   */
  detectLanguage(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
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
   * 自动分析失败的测试（在测试完成后调用）
   */
  async autoAnalyzeFailedTest(resultId) {
    try {
      const result = await AutoTestResult.findById(resultId).lean();
      
      // 只分析失败的测试
      if (result.status !== 'failed' && result.status !== 'error') {
        return null;
      }

      // 检查是否启用了自动分析
      const task = await AutoTestTask.findById(result.task_id).lean();
      if (!task || !task.ai_analysis_enabled) {
        return null;
      }

      // 执行分析
      const analysis = await this.analyzeTestResult(resultId, {
        includeCode: true,
      });

      // 保存分析结果（可以存储在测试结果中或单独的集合中）
      await AutoTestResult.findByIdAndUpdate(resultId, {
        $set: {
          ai_analysis: analysis,
        },
      });

      logger.info({ resultId }, 'Auto AI analysis completed');

      return analysis;
    } catch (error) {
      logger.error({ error, resultId }, 'Failed to auto analyze test');
      // 不抛出错误，避免影响测试流程
      return null;
    }
  }
}

export const testAnalysisService = new TestAnalysisService();
export default testAnalysisService;

