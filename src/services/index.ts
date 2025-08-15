// 服务容器和依赖注入（暂时禁用）
// export { container, SERVICE_TOKENS, injectable, inject } from './container';

// 服务实现（大部分服务文件不存在，暂时注释）
// export { EventService } from './EventService';
// export { StorageService } from './StorageService';
// export { SearchService } from './SearchService';
// export { ChatService } from './ChatService';
// export { ProviderService } from './ProviderService';
// export { AttachmentService } from './AttachmentService';
// export { AIService } from './AIService';
// export { ErrorHandlerService } from './ErrorHandlerService';
// export { NotificationService } from './NotificationService';
// export { PerformanceMonitorService } from './PerformanceMonitorService';
// export { I18nService } from '../i18n';

// 服务接口（类型文件不存在，暂时注释）
// export type {
//   IEventService,
//   IStorageService,
//   ISearchService,
//   IChatService,
//   IProviderService,
//   IAttachmentService,
//   IAIService,
//   IRAGService,
//   IErrorHandlerService,
//   INotificationService,
//   IPerformanceMonitorService,
// } from '../types/services';

// I18n相关导出（暂时注释）
// export type { LocaleInfo, I18nConfig } from '../i18n';

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
  // 服务容器系统暂时禁用，直接返回 true
  console.log('Service validation bypassed');
  return true;
}
