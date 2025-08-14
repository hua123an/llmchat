import { injectable, SERVICE_TOKENS, inject } from './container';
import { IEventService } from '../types/services';

export interface ErrorReport {
  id: string;
  error: Error;
  context: string;
  timestamp: number;
  userId?: string;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stack?: string;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: Error) => boolean;
}

export interface FallbackStrategy {
  context: string;
  fallbackAction: () => Promise<any> | any;
  description: string;
}

@injectable(SERVICE_TOKENS.ERROR_HANDLER_SERVICE)
export class ErrorHandlerService {
  private eventService: IEventService;
  private errorReports: ErrorReport[] = [];
  private fallbackStrategies = new Map<string, FallbackStrategy>();
  private retryConfigs = new Map<string, RetryConfig>();

  constructor() {
    this.eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
    this.setupGlobalErrorHandlers();
    this.setupDefaultRetryConfigs();
    this.setupDefaultFallbacks();
  }

  // 全局错误处理设置
  private setupGlobalErrorHandlers(): void {
    // 未捕获的JavaScript错误
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), 'global_error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // 未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'unhandled_promise_rejection'
      );
    });

    // 资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(
          new Error(`Resource failed to load: ${(event.target as any)?.src || 'unknown'}`),
          'resource_load_error',
          { target: event.target }
        );
      }
    }, true);
  }

  // 处理错误
  async handleError(
    error: Error,
    context: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const report = this.createErrorReport(error, context, metadata);
      this.errorReports.push(report);

      // 发送错误事件
      this.eventService.emit('error:occurred', { report });

      // 尝试自动恢复
      await this.attemptRecovery(error, context);

      // 记录错误（开发环境）
      if (import.meta.env.DEV) {
        console.group(`🚨 Error in ${context}`);
        console.error('Error:', error);
        console.log('Context:', context);
        console.log('Metadata:', metadata);
        console.log('Report ID:', report.id);
        console.groupEnd();
      }

      // 生产环境上报错误
      if (import.meta.env.PROD) {
        this.reportError(report);
      }

    } catch (handlingError) {
      console.error('Error while handling error:', handlingError);
    }
  }

  // 创建错误报告
  private createErrorReport(
    error: Error,
    context: string,
    metadata?: Record<string, any>
  ): ErrorReport {
    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      error,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: this.determineSeverity(error, context),
      stack: error.stack,
      metadata,
    };
  }

  // 确定错误严重程度
  private determineSeverity(error: Error, context: string): ErrorReport['severity'] {
    const message = error.message.toLowerCase();
    
    // 关键错误
    if (
      context.includes('auth') ||
      context.includes('payment') ||
      message.includes('network') && context.includes('critical')
    ) {
      return 'critical';
    }

    // 高严重性错误
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      context.includes('api')
    ) {
      return 'high';
    }

    // 中等严重性错误
    if (
      message.includes('validation') ||
      context.includes('form') ||
      context.includes('upload')
    ) {
      return 'medium';
    }

    // 低严重性错误
    return 'low';
  }

  // 重试机制
  async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = {
      ...this.getRetryConfig(context),
      ...customConfig,
    };

    let lastError: Error;
    let delay = config.baseDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 检查是否应该重试
        if (
          attempt === config.maxAttempts ||
          (config.retryCondition && !config.retryCondition(lastError))
        ) {
          break;
        }

        // 发送重试事件
        this.eventService.emit('error:retry', {
          attempt,
          maxAttempts: config.maxAttempts,
          error: lastError,
          context,
          nextDelay: delay,
        });

        // 等待后重试
        await this.delay(delay);
        delay = Math.min(delay * config.backoffFactor, config.maxDelay);
      }
    }

    // 所有重试都失败了
    await this.handleError(lastError!, `${context}_retry_failed`, {
      attempts: config.maxAttempts,
    });

    throw lastError!;
  }

  // 尝试自动恢复
  private async attemptRecovery(error: Error, context: string): Promise<void> {
    const fallback = this.fallbackStrategies.get(context);
    
    if (fallback) {
      try {
        const result = await fallback.fallbackAction();
        
        this.eventService.emit('error:recovered', {
          context,
          fallback: fallback.description,
          result,
        });
        
        console.log(`✅ Auto-recovered from error in ${context} using: ${fallback.description}`);
      } catch (fallbackError) {
        console.error(`❌ Fallback failed for ${context}:`, fallbackError);
      }
    }
  }

  // 注册重试配置
  registerRetryConfig(context: string, config: RetryConfig): void {
    this.retryConfigs.set(context, config);
  }

  // 注册降级策略
  registerFallback(context: string, strategy: FallbackStrategy): void {
    this.fallbackStrategies.set(context, strategy);
  }

  // 获取重试配置
  private getRetryConfig(context: string): RetryConfig {
    return this.retryConfigs.get(context) || this.retryConfigs.get('default')!;
  }

  // 设置默认重试配置
  private setupDefaultRetryConfigs(): void {
    // 默认配置
    this.registerRetryConfig('default', {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryCondition: (error) => {
        const message = error.message.toLowerCase();
        return (
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('fetch')
        );
      },
    });

    // API请求配置
    this.registerRetryConfig('api_request', {
      maxAttempts: 5,
      baseDelay: 500,
      maxDelay: 5000,
      backoffFactor: 1.5,
      retryCondition: (error) => {
        const message = error.message.toLowerCase();
        return (
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('500') ||
          message.includes('502') ||
          message.includes('503')
        );
      },
    });

    // 文件上传配置
    this.registerRetryConfig('file_upload', {
      maxAttempts: 3,
      baseDelay: 2000,
      maxDelay: 8000,
      backoffFactor: 2,
    });

    // 搜索请求配置
    this.registerRetryConfig('search_request', {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 3000,
      backoffFactor: 1.5,
    });
  }

  // 设置默认降级策略
  private setupDefaultFallbacks(): void {
    // 网络请求失败降级到缓存
    this.registerFallback('api_request', {
      context: 'api_request',
      description: 'Load from cache when API fails',
      fallbackAction: async () => {
        // 这里可以从localStorage或IndexedDB加载缓存数据
        const cached = localStorage.getItem('fallback_cache');
        return cached ? JSON.parse(cached) : null;
      },
    });

    // 搜索失败降级到本地搜索
    this.registerFallback('search_request', {
      context: 'search_request',
      description: 'Fallback to local search',
      fallbackAction: async () => {
        // 降级到本地消息搜索
        return { results: [], source: 'local_fallback' };
      },
    });

    // 文件上传失败降级策略
    this.registerFallback('file_upload', {
      context: 'file_upload',
      description: 'Queue file for later upload',
      fallbackAction: async () => {
        // 将文件加入待上传队列
        return { queued: true, message: '文件已加入上传队列，将在网络恢复后自动上传' };
      },
    });
  }

  // 上报错误（生产环境）
  private async reportError(report: ErrorReport): Promise<void> {
    try {
      // 这里可以集成错误监控服务，如Sentry、LogRocket等
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report),
      // });
      
      console.log('Error reported:', report.id);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  // 获取错误统计
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorReport['severity'], number>;
    byContext: Record<string, number>;
    recent: ErrorReport[];
  } {
    const bySeverity = this.errorReports.reduce((acc, report) => {
      acc[report.severity] = (acc[report.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorReport['severity'], number>);

    const byContext = this.errorReports.reduce((acc, report) => {
      acc[report.context] = (acc[report.context] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recent = this.errorReports
      .filter(report => Date.now() - report.timestamp < 24 * 60 * 60 * 1000) // 最近24小时
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      total: this.errorReports.length,
      bySeverity,
      byContext,
      recent,
    };
  }

  // 清理旧错误报告
  cleanupOldErrors(maxAge = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.errorReports = this.errorReports.filter(report => report.timestamp > cutoff);
  }

  // 辅助方法
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 检查网络状态
  isOnline(): boolean {
    return navigator.onLine;
  }

  // 等待网络恢复
  waitForOnline(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isOnline()) {
        resolve();
        return;
      }

      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve();
      };

      window.addEventListener('online', handleOnline);
    });
  }
}
