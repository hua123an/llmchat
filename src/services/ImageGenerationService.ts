/**
 * AI图像生成服务
 * 支持多种图像生成API
 */

export interface ImageGenerationRequest {
  prompt: string;
  model?: 'dall-e-3' | 'dall-e-2' | 'stable-diffusion' | 'midjourney-style' | 
          'stable-diffusion-3.5-large' | 'stable-diffusion-3.5-large-turbo' | 
          'flux-schnell' | 'flux-dev';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number; // 生成图片数量
  // 阿里云特有参数
  steps?: number; // 生成步数
  guidance_scale?: number; // 引导强度
}

export interface ImageGenerationResponse {
  success: boolean;
  images?: Array<{
    url: string;
    revised_prompt?: string;
    b64_json?: string;
  }>;
  error?: string;
  usage?: {
    cost?: number;
    provider: string;
  };
}

export interface ImageProvider {
  name: string;
  displayName: string;
  description: string;
  apiKey?: string;
  baseUrl?: string;
  supportedSizes: string[];
  supportedModels: string[];
  maxImages: number;
  pricing?: {
    [model: string]: {
      [size: string]: number; // USD
    };
  };
}

export class ImageGenerationService {
  private static providers: ImageProvider[] = [
    // 阿里云作为首选服务商
    {
      name: 'aliyun',
      displayName: '阿里云百炼',
      description: '阿里云百炼平台，支持StableDiffusion 3.5和Flux模型',
      baseUrl: 'https://dashscope.aliyuncs.com',
      supportedSizes: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
      supportedModels: [
        'flux-schnell',
        'flux-dev',
        'wanx-v1',
        'wanx-v1-lite',
        'stable-diffusion-3.5-large',
        'stable-diffusion-3.5-large-turbo'
      ],
      maxImages: 4,
      pricing: {
        'stable-diffusion-3.5-large': {
          '512x512': 0.02,
          '1024x1024': 0.04,
          '1792x1024': 0.06,
          '1024x1792': 0.06
        },
        'stable-diffusion-3.5-large-turbo': {
          '512x512': 0.01,
          '1024x1024': 0.02,
          '1792x1024': 0.03,
          '1024x1792': 0.03
        },
        'flux-schnell': {
          '512x512': 0.015,
          '1024x1024': 0.03,
          '1792x1024': 0.045,
          '1024x1792': 0.045
        },
        'flux-dev': {
          '512x512': 0.025,
          '1024x1024': 0.05,
          '1792x1024': 0.075,
          '1024x1792': 0.075
        }
      }
    },
    {
      name: 'openai',
      displayName: 'OpenAI DALL-E',
      description: '高质量的AI图像生成，支持详细提示词',
      supportedSizes: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
      supportedModels: ['dall-e-3', 'dall-e-2'],
      maxImages: 4,
      pricing: {
        'dall-e-3': {
          '1024x1024': 0.04,
          '1792x1024': 0.08,
          '1024x1792': 0.08
        },
        'dall-e-2': {
          '256x256': 0.016,
          '512x512': 0.018,
          '1024x1024': 0.02
        }
      }
    },
    {
      name: 'stability',
      displayName: 'Stability AI',
      description: 'Stable Diffusion模型，开源社区驱动',
      supportedSizes: ['512x512', '1024x1024'],
      supportedModels: ['stable-diffusion'],
      maxImages: 4
    },
    {
      name: 'midjourney',
      displayName: 'Midjourney风格',
      description: '艺术性强的AI绘图，适合创意设计',
      supportedSizes: ['1024x1024'],
      supportedModels: ['midjourney-style'],
      maxImages: 1
    },
    {
      name: 'local',
      displayName: '本地Stable Diffusion',
      description: '本地部署的SD服务，免费使用',
      supportedSizes: ['512x512', '1024x1024'],
      supportedModels: ['stable-diffusion'],
      maxImages: 1
    }
  ];

  /**
   * 获取所有图像生成服务商（无论是否配置）
   */
  static getProviders(): ImageProvider[] {
    return this.providers;
  }

  /**
   * 检查服务商是否已配置并可用
   */
  static isProviderConfigured(providerName: string): boolean {
    const settings = this.getSettings();
    switch (providerName) {
      case 'openai':
        return !!settings.openaiApiKey;
      case 'stability':
        return !!settings.stabilityApiKey;
      case 'midjourney':
        return !!settings.midjourneyApiKey;
      case 'local':
        return !!settings.localSdUrl;
      case 'aliyun':
        return !!settings.aliyunApiKey;
      default:
        return false;
    }
  }

  /**
   * 生成图像
   */
  static async generateImage(request: ImageGenerationRequest, provider: string): Promise<ImageGenerationResponse> {
    // 检查服务商是否已配置
    if (!this.isProviderConfigured(provider)) {
      return {
        success: false,
        error: `请先配置 ${provider} 的API密钥或服务地址`
      };
    }

    try {
      const providerConfig = this.providers.find(p => p.name === provider);
      if (!providerConfig) {
        throw new Error(`Unknown provider: ${provider}`);
      }

      const settings = this.getSettings();
      
      switch (provider) {
        case 'openai':
          return await this.generateWithOpenAI(request, settings.openaiApiKey);
        case 'stability':
          return await this.generateWithStability(request, settings.stabilityApiKey);
        case 'midjourney':
          return await this.generateWithMidjourney(request, settings.midjourneyApiKey);
        case 'local':
          return await this.generateWithLocalSD(request, settings.localSdUrl);
        case 'aliyun':
          return await this.generateWithAliyun(request, settings.aliyunApiKey);
        default:
          throw new Error(`Provider ${provider} not implemented`);
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * OpenAI DALL-E生成
   */
  private static async generateWithOpenAI(request: ImageGenerationRequest, apiKey: string): Promise<ImageGenerationResponse> {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.model || 'dall-e-3',
        prompt: request.prompt,
        size: request.size || '1024x1024',
        quality: request.quality || 'standard',
        style: request.style || 'natural',
        n: Math.min(request.n || 1, 4),
        response_format: 'url'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    
    return {
      success: true,
      images: data.data.map((item: any) => ({
        url: item.url,
        revised_prompt: item.revised_prompt
      })),
      usage: {
        provider: 'OpenAI DALL-E',
        cost: this.calculateCost('openai', request)
      }
    };
  }

  /**
   * Stability AI生成
   */
  private static async generateWithStability(request: ImageGenerationRequest, apiKey: string): Promise<ImageGenerationResponse> {
    // 这里是示例实现，实际需要根据Stability AI的API文档调整
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [{ text: request.prompt }],
        cfg_scale: 7,
        height: parseInt(request.size?.split('x')[1] || '1024'),
        width: parseInt(request.size?.split('x')[0] || '1024'),
        samples: request.n || 1,
        steps: 30
      })
    });

    if (!response.ok) {
      throw new Error('Stability AI API request failed');
    }

    const data = await response.json();
    
    return {
      success: true,
      images: data.artifacts.map((artifact: any) => ({
        b64_json: artifact.base64,
        url: `data:image/png;base64,${artifact.base64}`
      })),
      usage: {
        provider: 'Stability AI'
      }
    };
  }

  /**
   * Midjourney风格生成（通过代理服务）
   */
  private static async generateWithMidjourney(_request: ImageGenerationRequest, _apiKey: string): Promise<ImageGenerationResponse> {
    // 这里需要集成第三方Midjourney代理服务
    // 示例实现
    throw new Error('Midjourney integration not implemented yet');
  }

  /**
   * 本地Stable Diffusion生成
   */
  private static async generateWithLocalSD(request: ImageGenerationRequest, baseUrl: string): Promise<ImageGenerationResponse> {
    const response = await fetch(`${baseUrl}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: request.prompt,
        negative_prompt: "low quality, blurry, distorted",
        width: parseInt(request.size?.split('x')[0] || '512'),
        height: parseInt(request.size?.split('x')[1] || '512'),
        steps: 20,
        cfg_scale: 7,
        sampler_name: "DPM++ 2M Karras",
        n_iter: 1,
        batch_size: 1
      })
    });

    if (!response.ok) {
      throw new Error('Local Stable Diffusion API request failed');
    }

    const data = await response.json();
    
    return {
      success: true,
      images: data.images.map((b64: string) => ({
        b64_json: b64,
        url: `data:image/png;base64,${b64}`
      })),
      usage: {
        provider: 'Local SD',
        cost: 0 // 本地免费
      }
    };
  }

  /**
   * 阿里云百炼平台图像生成（通过Electron主进程）
   */
  private static async generateWithAliyun(request: ImageGenerationRequest, apiKey: string): Promise<ImageGenerationResponse> {
    if (!apiKey) {
      throw new Error('阿里云API密钥未配置');
    }

    // 检查是否在Electron环境中
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        console.log('通过Electron主进程调用阿里云API');
        
        // 确保传递的request对象是完全可序列化的
        const cleanRequest = {
          prompt: String(request.prompt || ''),
          model: String(request.model || 'stable-diffusion-3.5-large'),
          size: String(request.size || '1024x1024'),
          n: Number(request.n || 1),
          steps: request.steps ? Number(request.steps) : undefined,
          guidance_scale: request.guidance_scale ? Number(request.guidance_scale) : undefined
        };
        
        const result = await (window as any).electronAPI.generateImage(cleanRequest, 'aliyun', apiKey);
        
        if (!result.success) {
          throw new Error(result.error || '图像生成失败');
        }
        
        // 安全处理返回结果，确保数据完整性
        const images = Array.isArray(result.images) ? result.images.map((image: any) => ({
          url: typeof image.url === 'string' ? image.url : '',
          revised_prompt: typeof image.revised_prompt === 'string' ? image.revised_prompt : request.prompt
        })) : [];

        return {
          success: true,
          images: images,
          usage: result.usage && typeof result.usage === 'object' ? {
            provider: String(result.usage.provider || '阿里云百炼'),
            cost: Number(result.usage.cost || this.calculateCost('aliyun', request))
          } : {
            provider: '阿里云百炼',
            cost: this.calculateCost('aliyun', request)
          }
        };
      } catch (error) {
        console.error('Electron图像生成失败:', error);
        throw error;
      }
    } else {
      throw new Error('阿里云图像生成需要在Electron环境中运行，以避免跨域限制。请在桌面版中使用此功能。');
    }
  }

  /*
   * 轮询阿里云异步任务结果（暂时未使用，因为改为通过Electron主进程调用）
   * 
  private static async pollAliyunTask(taskId: string, apiKey: string, maxAttempts: number = 30): Promise<ImageGenerationResponse> {
    console.log(`开始轮询任务: ${taskId}`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`轮询第 ${attempt + 1} 次`);
        
        const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`任务查询失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        switch (data.output?.task_status) {
          case 'SUCCEEDED':
            return {
              success: true,
              images: data.output.results.map((result: any) => ({
                url: result.url,
                revised_prompt: undefined
              })),
              usage: {
                provider: '阿里云百炼',
                cost: 0 // 成本将在前端计算
              }
            };
            
          case 'FAILED':
            throw new Error(`任务失败: ${data.output?.message || '未知错误'}`);
            
          case 'PENDING':
          case 'RUNNING':
            // 继续等待
            break;
            
          default:
            throw new Error(`未知任务状态: ${data.output?.task_status}`);
        }

        // 等待2秒后重试
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        // 短暂等待后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('任务超时，请稍后重试');
  }
  */

  /**
   * 计算生成成本
   */
  private static calculateCost(provider: string, request: ImageGenerationRequest): number {
    const providerConfig = this.providers.find(p => p.name === provider);
    if (!providerConfig?.pricing) return 0;

    const model = request.model || Object.keys(providerConfig.pricing)[0];
    const size = request.size || '1024x1024';
    const count = request.n || 1;

    const unitCost = providerConfig.pricing[model]?.[size] || 0;
    return unitCost * count;
  }

  /**
   * 获取设置
   */
  private static getSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('imageGenerationSettings') || '{}');
      return {
        openaiApiKey: settings.openaiApiKey || '',
        stabilityApiKey: settings.stabilityApiKey || '',
        midjourneyApiKey: settings.midjourneyApiKey || '',
        localSdUrl: settings.localSdUrl || 'http://127.0.0.1:7860',
        aliyunApiKey: settings.aliyunApiKey || '',
        defaultProvider: settings.defaultProvider || 'openai',
        defaultModel: settings.defaultModel || 'dall-e-3',
        defaultSize: settings.defaultSize || '1024x1024',
        defaultQuality: settings.defaultQuality || 'standard'
      };
    } catch {
      return {
        openaiApiKey: '',
        stabilityApiKey: '',
        midjourneyApiKey: '',
        localSdUrl: 'http://127.0.0.1:7860',
        aliyunApiKey: '',
        defaultProvider: 'openai',
        defaultModel: 'dall-e-3',
        defaultSize: '1024x1024',
        defaultQuality: 'standard'
      };
    }
  }

  /**
   * 保存设置
   */
  static saveSettings(settings: any) {
    try {
      localStorage.setItem('imageGenerationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save image generation settings:', error);
    }
  }

  /**
   * 优化提示词
   */
  static optimizePrompt(prompt: string): string {
    // 简单的提示词优化
    let optimized = prompt.trim();
    
    // 添加质量关键词
    if (!optimized.includes('high quality') && !optimized.includes('detailed')) {
      optimized += ', high quality, detailed';
    }
    
    // 添加艺术风格提示
    if (!optimized.includes('art') && !optimized.includes('style')) {
      optimized += ', digital art';
    }
    
    return optimized;
  }

  /**
   * 验证提示词
   */
  static validatePrompt(prompt: string): { valid: boolean; message?: string } {
    if (!prompt.trim()) {
      return { valid: false, message: '提示词不能为空' };
    }
    
    if (prompt.length < 10) {
      return { valid: false, message: '提示词过短，请提供更详细的描述' };
    }
    
    if (prompt.length > 1000) {
      return { valid: false, message: '提示词过长，请控制在1000字符以内' };
    }
    
    // 检查敏感内容（简单实现）
    const sensitiveKeywords = ['violent', 'nsfw', 'explicit'];
    const lowerPrompt = prompt.toLowerCase();
    for (const keyword of sensitiveKeywords) {
      if (lowerPrompt.includes(keyword)) {
        return { valid: false, message: '提示词包含不当内容，请修改' };
      }
    }
    
    return { valid: true };
  }
}
