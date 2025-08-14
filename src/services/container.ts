// 依赖注入容器
export class ServiceContainer {
  private services = new Map<string, any>();
  private singletons = new Map<string, any>();

  // 注册服务
  register<T>(token: string, factory: () => T, singleton = true): void {
    if (singleton) {
      this.singletons.set(token, factory);
    } else {
      this.services.set(token, factory);
    }
  }

  // 解析服务
  resolve<T>(token: string): T {
    // 先检查单例
    if (this.singletons.has(token)) {
      const factory = this.singletons.get(token);
      if (typeof factory === 'function') {
        const instance = factory();
        this.singletons.set(token, instance);
        return instance;
      }
      return factory;
    }

    // 检查普通服务
    if (this.services.has(token)) {
      const factory = this.services.get(token);
      return factory();
    }

    throw new Error(`Service ${token} not found`);
  }

  // 检查服务是否存在
  has(token: string): boolean {
    return this.services.has(token) || this.singletons.has(token);
  }

  // 清除服务
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }
}

// 全局容器实例
export const container = new ServiceContainer();

// 服务令牌
export const SERVICE_TOKENS = {
  CHAT_SERVICE: 'ChatService',
  STORAGE_SERVICE: 'StorageService',
  SEARCH_SERVICE: 'SearchService',
  PROVIDER_SERVICE: 'ProviderService',
  AI_SERVICE: 'AIService',
  ATTACHMENT_SERVICE: 'AttachmentService',
  RAG_SERVICE: 'RAGService',
  EVENT_SERVICE: 'EventService',
  ERROR_HANDLER_SERVICE: 'ErrorHandlerService',
  NOTIFICATION_SERVICE: 'NotificationService',
  PERFORMANCE_MONITOR_SERVICE: 'PerformanceMonitorService',
  I18N_SERVICE: 'I18nService',
  THEME_SERVICE: 'ThemeService',
} as const;

// 装饰器助手
export function injectable<T>(token: string) {
  return function(target: new (...args: any[]) => T) {
    container.register(token, () => new target());
    return target;
  };
}

// 注入助手
export function inject<T>(token: string): T {
  return container.resolve<T>(token);
}
