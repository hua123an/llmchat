import { IProviderService } from '../types/services';
import { Provider } from '../types';
import { injectable, SERVICE_TOKENS } from './container';

@injectable(SERVICE_TOKENS.PROVIDER_SERVICE)
export class ProviderService implements IProviderService {
  
  async getProviders(): Promise<Provider[]> {
    try {
      const providersData = await (window as any).electronAPI.getProviders();
      
      if (Array.isArray(providersData) && providersData.length > 0) {
        return providersData.map(provider => ({
          id: provider.id || provider.name,
          name: provider.name,
          baseUrl: provider.baseUrl,
          models: provider.models || [],
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get providers from Electron API:', error);
      throw new Error(`Failed to load providers: ${error}`);
    }
  }

  async getModels(providerName: string): Promise<any[]> {
    try {
      const models = await (window as any).electronAPI.getModels(providerName);
      return Array.isArray(models) ? models : [];
    } catch (error) {
      console.error(`Failed to get models for provider ${providerName}:`, error);
      throw new Error(`Failed to load models for ${providerName}: ${error}`);
    }
  }

  async testProvider(providerName: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const result = await (window as any).electronAPI.testProvider(providerName);
      
      return {
        ok: result?.ok || false,
        message: result?.message || (result?.ok ? 'Provider test successful' : 'Provider test failed'),
      };
    } catch (error) {
      console.error(`Failed to test provider ${providerName}:`, error);
      return {
        ok: false,
        message: `Provider test failed: ${error}`,
      };
    }
  }

  // 批量测试提供商
  async batchTestProviders(providerNames: string[]): Promise<Map<string, { ok: boolean; message?: string }>> {
    const results = new Map<string, { ok: boolean; message?: string }>();
    
    const testPromises = providerNames.map(async (providerName) => {
      try {
        const result = await this.testProvider(providerName);
        results.set(providerName, result);
      } catch (error) {
        results.set(providerName, {
          ok: false,
          message: `Test failed: ${error}`,
        });
      }
    });

    await Promise.all(testPromises);
    return results;
  }

  // 验证提供商配置
  validateProviderConfig(provider: Partial<Provider>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!provider.name || provider.name.trim().length === 0) {
      errors.push('Provider name is required');
    }

    if (!provider.baseUrl || provider.baseUrl.trim().length === 0) {
      errors.push('Base URL is required');
    } else {
      try {
        new URL(provider.baseUrl);
      } catch {
        errors.push('Base URL is not a valid URL');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // 获取提供商健康状态
  async getProviderHealth(providerName: string): Promise<{
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime?: number;
    lastChecked: number;
    details?: any;
  }> {
    const startTime = Date.now();
    
    try {
      const result = await this.testProvider(providerName);
      const responseTime = Date.now() - startTime;
      
      return {
        status: result.ok ? 'healthy' : 'unhealthy',
        responseTime,
        lastChecked: Date.now(),
        details: result,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: Date.now(),
        details: { error: String(error) },
      };
    }
  }

  // 获取模型能力信息
  async getModelCapabilities(providerName: string, modelId: string): Promise<{
    supportsImages: boolean;
    supportsStreaming: boolean;
    maxTokens: number;
    contextWindow: number;
  }> {
    try {
      // 这里可以根据不同的提供商和模型返回不同的能力信息
      // 目前返回一个通用的默认配置
      const capabilities = {
        supportsImages: this.modelSupportsImages(modelId),
        supportsStreaming: true,
        maxTokens: this.getModelMaxTokens(modelId),
        contextWindow: this.getModelContextWindow(modelId),
      };

      return capabilities;
    } catch (error) {
      console.error(`Failed to get model capabilities for ${providerName}/${modelId}:`, error);
      // 返回保守的默认值
      return {
        supportsImages: false,
        supportsStreaming: true,
        maxTokens: 4096,
        contextWindow: 8192,
      };
    }
  }

  // 检查模型是否支持图像输入
  private modelSupportsImages(modelId: string): boolean {
    const imageModels = [
      'gpt-4-vision',
      'gpt-4o',
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku',
      'gemini-pro-vision',
      'dall-e',
    ];

    return imageModels.some(model => 
      modelId.toLowerCase().includes(model.toLowerCase())
    );
  }

  // 获取模型最大token数
  private getModelMaxTokens(modelId: string): number {
    const modelLimits: Record<string, number> = {
      'gpt-3.5-turbo': 4096,
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4o': 128000,
      'claude-instant': 100000,
      'claude-2': 100000,
      'claude-3': 200000,
      'gemini-pro': 32768,
      'text-davinci': 4096,
    };

    for (const [model, limit] of Object.entries(modelLimits)) {
      if (modelId.toLowerCase().includes(model)) {
        return limit;
      }
    }

    return 4096; // 默认值
  }

  // 获取模型上下文窗口大小
  private getModelContextWindow(modelId: string): number {
    // 通常上下文窗口比最大输出token大
    return this.getModelMaxTokens(modelId) * 2;
  }

  // 估算API调用成本
  estimateApiCost(
    providerName: string, 
    modelId: string, 
    inputTokens: number, 
    outputTokens: number
  ): number {
    // 这里可以根据不同提供商的定价策略计算成本
    // 目前返回一个简单的估算
    const baseCostPer1kTokens = 0.002; // $0.002 per 1k tokens (示例价格)
    const totalTokens = inputTokens + outputTokens;
    
    return (totalTokens / 1000) * baseCostPer1kTokens;
  }
}
