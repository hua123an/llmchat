/**
 * AI图像生成服务
 * 支持多种图像生成API
 */

export interface ImageGenerationRequest {
  prompt: string;
  model?: 'dall-e-3' | 'dall-e-2' | 'stable-diffusion' | 'midjourney-style' | 
          'stable-diffusion-3.5-large' | 'stable-diffusion-3.5-large-turbo' | 
          'flux-schnell' | 'flux-dev' |
          // Google Gemini image models
          'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-2.0-flash' | 'imagen-3';
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
    // 胜算云作为首选服务商
    {
      name: 'shengsuanyun',
      displayName: '胜算云',
      description: '胜算云AI图像生成服务，支持多种模型',
      baseUrl: 'https://router.shengsuanyun.com',
      supportedSizes: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
      supportedModels: [
        'stable-diffusion',
        'dall-e-3',
        'dall-e-2',
        'midjourney-style'
      ],
      maxImages: 4,
      pricing: {
        'stable-diffusion': {
          '512x512': 0.015,
          '1024x1024': 0.03,
          '1792x1024': 0.045,
          '1024x1792': 0.045
        },
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
    // Google Gemini/Imagen
    {
      name: 'gemini',
      displayName: 'Google Gemini',
      description: 'Google Generative AI（Gemini/Imagen）',
      baseUrl: 'https://generativelanguage.googleapis.com',
      supportedSizes: ['512x512', '1024x1024', '1792x1024', '1024x1792'],
      supportedModels: ['imagen-3', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
      maxImages: 4,
      pricing: {
        'imagen-3': {
          '512x512': 0.02,
          '1024x1024': 0.04,
          '1792x1024': 0.06,
          '1024x1792': 0.06
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
  static async isProviderConfigured(providerName: string): Promise<boolean> {
    try {
      console.log(`🔍 检查服务商配置: ${providerName}`);
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // 在Electron环境中，动态检查API密钥
        console.log(`📱 Electron环境 - 检查${providerName}的API密钥`);
        const apiKey = await this.getApiKey(providerName);
        const isConfigured = !!apiKey;
        console.log(`🔑 ${providerName} API密钥检查结果: ${isConfigured ? '已配置' : '未配置'}`);
        if (apiKey) {
          console.log(`🔑 ${providerName} API密钥预览: ${apiKey.substring(0, 10)}...`);
        }
        return isConfigured;
      } else {
        // 在非Electron环境中，使用localStorage
        console.log(`🌐 非Electron环境 - 从localStorage检查${providerName}`);
        const settings = this.getSettings();
        let isConfigured = false;
        
        switch (providerName) {
          case 'shengsuanyun':
            isConfigured = !!settings.shengsuanyunApiKey;
            break;
          case 'openai':
            isConfigured = !!settings.openaiApiKey;
            break;
          case 'stability':
            isConfigured = !!settings.stabilityApiKey;
            break;
          case 'midjourney':
            isConfigured = !!settings.midjourneyApiKey;
            break;
          case 'local':
            isConfigured = !!settings.localSdUrl;
            break;
          case 'aliyun':
            isConfigured = !!settings.aliyunApiKey;
            break;
          default:
            isConfigured = false;
        }
        
        console.log(`💾 ${providerName} localStorage检查结果: ${isConfigured ? '已配置' : '未配置'}`);
        return isConfigured;
      }
    } catch (error) {
      console.error(`❌ 检查${providerName}配置失败:`, error);
      return false;
    }
  }

  /**
   * 生成图像
   */
  static async generateImage(request: ImageGenerationRequest, provider: string): Promise<ImageGenerationResponse> {
    // 检查服务商是否已配置
    if (!await this.isProviderConfigured(provider)) {
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

      // 动态获取API密钥
      let apiKey = '';
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        apiKey = await this.getApiKey(provider);
      } else {
        const settings = this.getSettings();
        switch (provider) {
          case 'shengsuanyun':
            apiKey = settings.shengsuanyunApiKey;
            break;
          case 'openai':
            apiKey = settings.openaiApiKey;
            break;
          case 'stability':
            apiKey = settings.stabilityApiKey;
            break;
          case 'midjourney':
            apiKey = settings.midjourneyApiKey;
            break;
          case 'aliyun':
            apiKey = settings.aliyunApiKey;
            break;
          default:
            apiKey = '';
        }
      }
      
      switch (provider) {
        case 'shengsuanyun':
          return await this.generateWithShengsuanyun(request, apiKey);
        case 'openai':
          return await this.generateWithOpenAI(request, apiKey);
        case 'gemini':
          return await this.generateWithGemini(request, apiKey);
        case 'stability':
          return await this.generateWithStability(request, apiKey);
        case 'midjourney':
          return await this.generateWithMidjourney(request, apiKey);
        case 'local':
          const settings = this.getSettings();
          return await this.generateWithLocalSD(request, settings.localSdUrl);
        case 'aliyun':
          return await this.generateWithAliyun(request, apiKey);
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
   * 胜算云图像生成
   */
  private static async generateWithShengsuanyun(request: ImageGenerationRequest, apiKey: string): Promise<ImageGenerationResponse> {
    if (!apiKey) {
      throw new Error('胜算云API密钥未配置');
    }

    // 检查是否在Electron环境中
    if (typeof window !== 'undefined') {
      try {
        console.log('通过Electron主进程调用胜算云API');
        
        // 确保传递的request对象是完全可序列化的
        const cleanRequest = {
          prompt: String(request.prompt || ''),
          model: String(request.model || 'stable-diffusion'),
          size: String(request.size || '1024x1024'),
          n: Number(request.n || 1)
        };
        
        const { generateImage } = await import('../modules/system/ipc');
        const result = await generateImage(cleanRequest, 'shengsuanyun', apiKey);
        
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
            provider: String(result.usage.provider || '胜算云'),
            cost: Number(result.usage.cost || this.calculateCost('shengsuanyun', request))
          } : {
            provider: '胜算云',
            cost: this.calculateCost('shengsuanyun', request)
          }
        };
      } catch (error) {
        console.error('Electron图像生成失败:', error);
        throw error;
      }
    } else {
      throw new Error('胜算云图像生成需要在Electron环境中运行，以避免跨域限制。请在桌面版中使用此功能。');
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
    if (typeof window !== 'undefined') {
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
        
        const { generateImage } = await import('../modules/system/ipc');
        const result = await generateImage(cleanRequest, 'aliyun', apiKey);
        
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

  /**
   * Google Gemini/Imagen 图像生成（通过Electron主进程，自动处理CORS与鉴权）
   */
  private static async generateWithGemini(request: ImageGenerationRequest, apiKey: string): Promise<ImageGenerationResponse> {
    if (typeof window === 'undefined') {
      throw new Error('需要在桌面端运行');
    }
    const cleanRequest = {
      prompt: String(request.prompt || ''),
      model: String(request.model || 'imagen-3'),
      size: String(request.size || '1024x1024'),
      n: Number(request.n || 1)
    } as any;
    const { generateImage } = await import('../modules/system/ipc');
    // 主进程将优先使用传入 key；如为空则回退使用 secureStorage 中的 gemini 提供商密钥
    const result = await generateImage(cleanRequest, 'gemini', apiKey || '');
    if (!result?.success) throw new Error(result?.error || '图像生成失败');
    const images = Array.isArray(result.images) ? result.images.map((img: any) => ({
      url: String(img.url || ''),
      revised_prompt: cleanRequest.prompt,
      b64_json: img.b64_json
    })) : [];
    return { success: true, images, usage: { provider: 'Google Gemini', cost: this.calculateCost('gemini', request) } };
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
      // 在非Electron环境中，使用localStorage
      const settings = JSON.parse(localStorage.getItem('imageGenerationSettings') || '{}');
      return {
        shengsuanyunApiKey: settings.shengsuanyunApiKey || '',
        openaiApiKey: settings.openaiApiKey || '',
        stabilityApiKey: settings.stabilityApiKey || '',
        midjourneyApiKey: settings.midjourneyApiKey || '',
        localSdUrl: settings.localSdUrl || 'http://127.0.0.1:7860',
        aliyunApiKey: settings.aliyunApiKey || '',
        defaultProvider: settings.defaultProvider || 'shengsuanyun',
        defaultModel: settings.defaultModel || 'stable-diffusion',
        defaultSize: settings.defaultSize || '1024x1024',
        defaultQuality: settings.defaultQuality || 'standard'
      };
    } catch {
      return {
        shengsuanyunApiKey: '',
        openaiApiKey: '',
        stabilityApiKey: '',
        midjourneyApiKey: '',
        localSdUrl: 'http://127.0.0.1:7860',
        aliyunApiKey: '',
        defaultProvider: 'shengsuanyun',
        defaultModel: 'stable-diffusion',
        defaultSize: '1024x1024',
        defaultQuality: 'standard'
      };
    }
  }

  /**
   * 动态获取API密钥（在Electron环境中）
   */
  private static async getApiKey(provider: string): Promise<string> {
    try {
      console.log(`🔑 开始获取${provider}的API密钥`);
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        console.log(`📱 通过electronAPI.getApiKey获取${provider}密钥`);
        // 直接通过electronAPI获取API密钥
        const apiKey = await (window as any).electronAPI.getApiKey(provider);
        console.log(`🔑 ${provider} API密钥获取结果: ${apiKey ? '成功获取' : '未找到'}`);
        return apiKey || '';
      } else {
        console.log(`❌ electronAPI不可用，无法获取${provider}密钥`);
        return '';
      }
    } catch (error) {
      console.error(`❌ 获取${provider} API密钥失败:`, error);
      return '';
    }
  }

  /**
   * 保存设置
   */
  static async saveSettings(settings: any) {
    try {
      // 在Electron环境中，API密钥需要通过IPC保存到secureStorage
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // 保存API密钥到安全存储
        if (settings.shengsuanyunApiKey) {
          try {
            await (window as any).electronAPI.setProviderKey('shengsuanyun', settings.shengsuanyunApiKey);
            console.log('胜算云API密钥已保存到安全存储');
          } catch (error) {
            console.error('保存胜算云API密钥失败:', error);
          }
        }
        
        // 其他设置保存到localStorage（排除敏感的API密钥）
        const nonSensitiveSettings = { ...settings };
        delete nonSensitiveSettings.shengsuanyunApiKey;
        delete nonSensitiveSettings.openaiApiKey;
        delete nonSensitiveSettings.stabilityApiKey;
        delete nonSensitiveSettings.midjourneyApiKey;
        delete nonSensitiveSettings.aliyunApiKey;
        
        localStorage.setItem('imageGenerationSettings', JSON.stringify(nonSensitiveSettings));
      } else {
        // 在非Electron环境中，直接保存到localStorage
        localStorage.setItem('imageGenerationSettings', JSON.stringify(settings));
      }
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
