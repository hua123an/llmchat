import { IAIService } from '../types/services';
import { Provider, StatsEntry } from '../types';
import { injectable, SERVICE_TOKENS } from './container';

@injectable(SERVICE_TOKENS.AI_SERVICE)
export class AIService implements IAIService {

  async routeModel(userInput: string, providers: Provider[]): Promise<{ provider: string; model: string }> {
    try {
      // 如果没有可用的提供商，返回错误
      if (providers.length === 0) {
        throw new Error('No providers available');
      }

      // 简单的路由策略：选择第一个可用的提供商和模型
      const provider = providers[0];
      const model = provider.models?.[0] || '';

      if (!model) {
        throw new Error(`No models available for provider ${provider.name}`);
      }

      return {
        provider: provider.name,
        model: model,
      };

    } catch (error) {
      console.error('Model routing failed:', error);
      throw new Error(`Failed to route model: ${error}`);
    }
  }

  async estimateCost(tokens: number, model: string): Promise<number> {
    try {
      // 基础的成本估算逻辑
      const costPerToken = this.getCostPerToken(model);
      return tokens * costPerToken;
    } catch (error) {
      console.error('Cost estimation failed:', error);
      return 0;
    }
  }

  // 智能模型路由（基于统计数据）
  async intelligentRouteModel(
    userInput: string, 
    providers: Provider[], 
    statsHistory: StatsEntry[]
  ): Promise<{ provider: string; model: string; confidence: number }> {
    try {
      if (providers.length === 0) {
        throw new Error('No providers available');
      }

      // 分析用户输入类型
      const inputAnalysis = this.analyzeUserInput(userInput);
      
      // 获取提供商性能统计
      const providerStats = this.calculateProviderStats(statsHistory);
      
      // 根据输入类型和性能选择最佳模型
      const bestMatch = this.selectBestModel(providers, inputAnalysis, providerStats);
      
      return bestMatch;

    } catch (error) {
      console.error('Intelligent routing failed:', error);
      // 降级到简单路由
      const fallback = await this.routeModel(userInput, providers);
      return { ...fallback, confidence: 0.5 };
    }
  }

  // 分析用户输入
  private analyzeUserInput(input: string): {
    type: 'code' | 'creative' | 'analysis' | 'chat' | 'technical';
    complexity: 'low' | 'medium' | 'high';
    length: 'short' | 'medium' | 'long';
    language: 'zh' | 'en' | 'mixed';
  } {
    const text = input.toLowerCase();
    
    // 判断输入类型
    let type: 'code' | 'creative' | 'analysis' | 'chat' | 'technical' = 'chat';
    
    if (this.containsCode(text)) {
      type = 'code';
    } else if (this.isCreativeRequest(text)) {
      type = 'creative';
    } else if (this.isAnalysisRequest(text)) {
      type = 'analysis';
    } else if (this.isTechnicalRequest(text)) {
      type = 'technical';
    }

    // 判断复杂度
    const complexity = input.length > 500 ? 'high' : 
                      input.length > 100 ? 'medium' : 'low';

    // 判断长度
    const length = input.length > 1000 ? 'long' : 
                  input.length > 200 ? 'medium' : 'short';

    // 判断语言
    const chineseChars = (input.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = input.length;
    const chineseRatio = chineseChars / totalChars;
    
    const language = chineseRatio > 0.7 ? 'zh' : 
                    chineseRatio > 0.3 ? 'mixed' : 'en';

    return { type, complexity, length, language };
  }

  private containsCode(text: string): boolean {
    const codeIndicators = [
      'function', 'class', 'import', 'export', 'const', 'let', 'var',
      'def ', 'public', 'private', 'return', 'if (', 'for (', 'while (',
      '```', 'console.log', 'print(', 'useState', 'useEffect',
      '#!/', 'npm ', 'git ', 'docker ', 'kubectl '
    ];
    
    return codeIndicators.some(indicator => text.includes(indicator));
  }

  private isCreativeRequest(text: string): boolean {
    const creativeKeywords = [
      '写一个', '创作', '故事', '诗歌', '文案', '创意', '想象',
      'write a', 'create', 'story', 'poem', 'creative', 'imagine'
    ];
    
    return creativeKeywords.some(keyword => text.includes(keyword));
  }

  private isAnalysisRequest(text: string): boolean {
    const analysisKeywords = [
      '分析', '比较', '评估', '总结', '解释', '为什么', '如何',
      'analyze', 'compare', 'evaluate', 'summarize', 'explain', 'why', 'how'
    ];
    
    return analysisKeywords.some(keyword => text.includes(keyword));
  }

  private isTechnicalRequest(text: string): boolean {
    const technicalKeywords = [
      '技术', '架构', '设计', '优化', '性能', '算法', '数据库',
      'technical', 'architecture', 'design', 'optimize', 'performance', 'algorithm', 'database'
    ];
    
    return technicalKeywords.some(keyword => text.includes(keyword));
  }

  // 计算提供商性能统计
  private calculateProviderStats(stats: StatsEntry[]): Map<string, {
    avgResponseTime: number;
    successRate: number;
    totalRequests: number;
    avgTokens: number;
  }> {
    const providerStats = new Map();
    
    // 按提供商分组统计
    const grouped = new Map<string, StatsEntry[]>();
    stats.forEach(entry => {
      const provider = entry.provider || 'unknown';
      if (!grouped.has(provider)) {
        grouped.set(provider, []);
      }
      grouped.get(provider)!.push(entry);
    });

    // 计算每个提供商的统计数据
    grouped.forEach((entries, provider) => {
      const totalRequests = entries.length;
      const avgResponseTime = entries.reduce((sum, e) => sum + (e.responseTimeMs || 0), 0) / totalRequests;
      const avgTokens = entries.reduce((sum, e) => sum + e.totalTokens, 0) / totalRequests;
      
      // 简单的成功率计算（假设所有记录的请求都是成功的）
      const successRate = 1.0;

      providerStats.set(provider, {
        avgResponseTime,
        successRate,
        totalRequests,
        avgTokens,
      });
    });

    return providerStats;
  }

  // 选择最佳模型
  private selectBestModel(
    providers: Provider[],
    inputAnalysis: ReturnType<typeof this.analyzeUserInput>,
    providerStats: ReturnType<typeof this.calculateProviderStats>
  ): { provider: string; model: string; confidence: number } {
    
    let bestScore = 0;
    let bestProvider = providers[0].name;
    let bestModel = providers[0].models?.[0] || '';

    providers.forEach(provider => {
      if (!provider.models || provider.models.length === 0) return;

      const stats = providerStats.get(provider.name);
      let score = 0.5; // 基础分数

      // 根据统计数据调整分数
      if (stats) {
        // 响应时间越快分数越高
        if (stats.avgResponseTime < 2000) score += 0.2;
        else if (stats.avgResponseTime < 5000) score += 0.1;
        
        // 成功率越高分数越高
        score += stats.successRate * 0.2;
        
        // 请求数量越多表示越可靠
        if (stats.totalRequests > 100) score += 0.1;
        else if (stats.totalRequests > 10) score += 0.05;
      }

      // 根据输入类型选择合适的模型
      provider.models.forEach(modelId => {
        let modelScore = score;
        
        // 根据模型特性调整分数
        if (inputAnalysis.type === 'code') {
          if (modelId.toLowerCase().includes('code') || 
              modelId.toLowerCase().includes('dev')) {
            modelScore += 0.3;
          }
        } else if (inputAnalysis.type === 'creative') {
          if (modelId.toLowerCase().includes('creative') || 
              modelId.toLowerCase().includes('claude')) {
            modelScore += 0.3;
          }
        }

        // 根据复杂度选择模型
        if (inputAnalysis.complexity === 'high') {
          if (modelId.toLowerCase().includes('gpt-4') || 
              modelId.toLowerCase().includes('claude-3')) {
            modelScore += 0.2;
          }
        }

        if (modelScore > bestScore) {
          bestScore = modelScore;
          bestProvider = provider.name;
          bestModel = modelId;
        }
      });
    });

    return {
      provider: bestProvider,
      model: bestModel,
      confidence: Math.min(bestScore, 1.0),
    };
  }

  // 获取模型的每token成本
  private getCostPerToken(model: string): number {
    // 基础定价表（示例，实际使用时需要根据最新价格更新）
    const pricing: Record<string, number> = {
      'gpt-3.5-turbo': 0.000002,
      'gpt-4': 0.00003,
      'gpt-4-32k': 0.00006,
      'gpt-4o': 0.000015,
      'claude-instant': 0.0000016,
      'claude-2': 0.000008,
      'claude-3-haiku': 0.000001,
      'claude-3-sonnet': 0.000003,
      'claude-3-opus': 0.000015,
      'gemini-pro': 0.000001,
    };

    // 查找匹配的定价
    for (const [modelName, price] of Object.entries(pricing)) {
      if (model.toLowerCase().includes(modelName)) {
        return price;
      }
    }

    // 默认价格
    return 0.000002;
  }

  // 预测对话成本
  async predictConversationCost(
    messages: Array<{ role: string; content: string }>,
    model: string
  ): Promise<{ inputCost: number; estimatedOutputCost: number; totalEstimatedCost: number }> {
    
    // 计算输入token数量
    const inputTokens = this.estimateTokenCount(
      messages.map(m => m.content).join(' ')
    );
    
    // 估算输出token数量（基于历史平均值）
    const estimatedOutputTokens = Math.min(inputTokens * 0.8, 4000);
    
    const costPerToken = this.getCostPerToken(model);
    const inputCost = inputTokens * costPerToken;
    const estimatedOutputCost = estimatedOutputTokens * costPerToken * 1.5; // 输出通常更贵
    
    return {
      inputCost,
      estimatedOutputCost,
      totalEstimatedCost: inputCost + estimatedOutputCost,
    };
  }

  // 估算token数量
  private estimateTokenCount(text: string): number {
    // 简单的token估算（中文约1.5字符=1token，英文约4字符=1token）
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    
    return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
  }

  // 模型推荐
  recommendModel(
    taskType: 'code' | 'creative' | 'analysis' | 'chat',
    complexity: 'low' | 'medium' | 'high',
    budget: 'low' | 'medium' | 'high'
  ): string[] {
    const recommendations: Record<string, Record<string, Record<string, string[]>>> = {
      code: {
        low: {
          low: ['gpt-3.5-turbo'],
          medium: ['gpt-3.5-turbo', 'claude-3-haiku'],
          high: ['gpt-4', 'claude-3-sonnet'],
        },
        medium: {
          low: ['claude-3-haiku'],
          medium: ['gpt-4', 'claude-3-sonnet'],
          high: ['gpt-4o', 'claude-3-opus'],
        },
        high: {
          low: ['claude-3-sonnet'],
          medium: ['gpt-4o', 'claude-3-opus'],
          high: ['gpt-4o', 'claude-3-opus'],
        },
      },
      creative: {
        low: {
          low: ['gpt-3.5-turbo'],
          medium: ['claude-3-haiku', 'gpt-3.5-turbo'],
          high: ['claude-3-sonnet', 'gpt-4'],
        },
        medium: {
          low: ['claude-3-haiku'],
          medium: ['claude-3-sonnet', 'gpt-4'],
          high: ['claude-3-opus', 'gpt-4o'],
        },
        high: {
          low: ['claude-3-sonnet'],
          medium: ['claude-3-opus', 'gpt-4o'],
          high: ['claude-3-opus', 'gpt-4o'],
        },
      },
      analysis: {
        low: {
          low: ['gpt-3.5-turbo'],
          medium: ['gpt-3.5-turbo', 'claude-3-haiku'],
          high: ['gpt-4', 'claude-3-sonnet'],
        },
        medium: {
          low: ['claude-3-haiku'],
          medium: ['gpt-4', 'claude-3-sonnet'],
          high: ['gpt-4o', 'claude-3-opus'],
        },
        high: {
          low: ['claude-3-sonnet'],
          medium: ['gpt-4o', 'claude-3-opus'],
          high: ['gpt-4o', 'claude-3-opus'],
        },
      },
      chat: {
        low: {
          low: ['gpt-3.5-turbo'],
          medium: ['gpt-3.5-turbo', 'claude-3-haiku'],
          high: ['gpt-4', 'claude-3-sonnet'],
        },
        medium: {
          low: ['claude-3-haiku'],
          medium: ['gpt-4', 'claude-3-sonnet'],
          high: ['gpt-4o', 'claude-3-opus'],
        },
        high: {
          low: ['claude-3-sonnet'],
          medium: ['gpt-4o', 'claude-3-opus'],
          high: ['gpt-4o', 'claude-3-opus'],
        },
      },
    };

    return recommendations[taskType]?.[complexity]?.[budget] || ['gpt-3.5-turbo'];
  }
}
