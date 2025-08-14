// 服务容器和依赖注入
export { container, SERVICE_TOKENS, injectable, inject } from './container';

// 服务实现
export { EventService } from './EventService';
export { StorageService } from './StorageService';
export { SearchService } from './SearchService';
export { ChatService } from './ChatService';
export { ProviderService } from './ProviderService';
export { AttachmentService } from './AttachmentService';
export { AIService } from './AIService';
export { ErrorHandlerService } from './ErrorHandlerService';
export { NotificationService } from './NotificationService';
export { PerformanceMonitorService } from './PerformanceMonitorService';
export { I18nService } from '../i18n';

// 服务接口
export type {
  IEventService,
  IStorageService,
  ISearchService,
  IChatService,
  IProviderService,
  IAttachmentService,
  IAIService,
  IRAGService,
  IErrorHandlerService,
  INotificationService,
  IPerformanceMonitorService,
} from '../types/services';

// I18n相关导出
export type { LocaleInfo, I18nConfig } from '../i18n';

// 服务注册函数
export function registerServices() {
  // 服务会通过装饰器自动注册到容器中
  // 这里只需要确保服务类被加载
  const services = [
    require('./EventService'),
    require('./StorageService'),
    require('./SearchService'),
    require('./ChatService'),
    require('./ProviderService'),
    require('./AttachmentService'),
    require('./AIService'),
    require('./ErrorHandlerService'),
    require('./NotificationService'),
    require('./PerformanceMonitorService'),
    require('../i18n'),
  ];

  console.log('Services registered:', services.length);
}

// 验证所有服务是否正确注册
export function validateServices(): boolean {
  const requiredServices = [
    SERVICE_TOKENS.EVENT_SERVICE,
    SERVICE_TOKENS.STORAGE_SERVICE,
    SERVICE_TOKENS.SEARCH_SERVICE,
    SERVICE_TOKENS.CHAT_SERVICE,
    SERVICE_TOKENS.PROVIDER_SERVICE,
    SERVICE_TOKENS.ATTACHMENT_SERVICE,
    SERVICE_TOKENS.AI_SERVICE,
    SERVICE_TOKENS.ERROR_HANDLER_SERVICE,
    SERVICE_TOKENS.NOTIFICATION_SERVICE,
    SERVICE_TOKENS.PERFORMANCE_MONITOR_SERVICE,
    SERVICE_TOKENS.I18N_SERVICE,
  ];

  const missingServices = requiredServices.filter(token => !container.has(token));
  
  if (missingServices.length > 0) {
    console.error('Missing services:', missingServices);
    return false;
  }

  console.log('All services validated successfully');
  return true;
}
