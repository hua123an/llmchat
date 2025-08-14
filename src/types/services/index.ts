import { Message, ChatTab, Provider, Attachment } from '../core/chat';
import { Agent } from '../core/agent';
import { Workspace } from '../core/workspace';
import { User, StatsEntry } from '../core/user';
import { WebSearchOptions, WebSearchHit } from '../api';

// 聊天服务接口
export interface IChatService {
  sendMessage(
    provider: string,
    model: string,
    messages: any[],
    userMessageId: string,
    assistantMessageId: string,
    attachments?: Attachment[],
    webSearchEnabled?: boolean,
    webSearchOptions?: { search_context_size?: 'low' | 'medium' | 'high' }
  ): Promise<void>;
  
  retryMessage(messageId: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
}

// 存储服务接口
export interface IStorageService {
  saveTabs(tabs: ChatTab[]): Promise<void>;
  loadTabs(): Promise<ChatTab[]>;
  saveUser(user: User): Promise<void>;
  loadUser(): Promise<User | null>;
  saveAgents(agents: Agent[]): Promise<void>;
  loadAgents(): Promise<Agent[]>;
  saveWorkspaces(workspaces: Workspace[]): Promise<void>;
  loadWorkspaces(): Promise<Workspace[]>;
  saveStats(stats: StatsEntry[]): Promise<void>;
  loadStats(): Promise<StatsEntry[]>;
}

// 搜索服务接口
export interface ISearchService {
  webSearch(query: string, options?: WebSearchOptions): Promise<WebSearchHit[]>;
  fetchReadable(url: string): Promise<string>;
  searchAndFetch(
    query: string,
    topN?: number,
    options?: WebSearchOptions
  ): Promise<Array<{ url: string; title: string; content: string; isDirect?: boolean }>>;
}

// 提供商服务接口
export interface IProviderService {
  getProviders(): Promise<Provider[]>;
  getModels(providerName: string): Promise<any[]>;
  testProvider(providerName: string): Promise<{ ok: boolean; message?: string }>;
}

// AI服务接口
export interface IAIService {
  routeModel(userInput: string, providers: Provider[]): Promise<{ provider: string; model: string }>;
  estimateCost(tokens: number, model: string): Promise<number>;
}

// 附件服务接口
export interface IAttachmentService {
  processFile(file: File): Promise<Attachment>;
  extractText(attachment: Attachment): Promise<string>;
  recognizeImage(file: File): Promise<string>;
}

// RAG服务接口
export interface IRAGService {
  importDocument(attachment: Attachment): Promise<{ docId: string; name: string; size: number }>;
  searchDocuments(query: string, topK?: number): Promise<Array<{ content: string; score: number }>>;
  deleteDocument(docId: string): Promise<void>;
}

// 事件服务接口
export interface IEventService {
  emit<T>(eventName: string, data: T): void;
  on<T>(eventName: string, handler: (data: T) => void): () => void;
  once<T>(eventName: string, handler: (data: T) => void): () => void;
}

// 错误处理服务接口
export interface IErrorHandlerService {
  handleError(error: Error, context: string, metadata?: Record<string, any>): Promise<void>;
  withRetry<T>(operation: () => Promise<T>, context: string, customConfig?: any): Promise<T>;
  registerRetryConfig(context: string, config: any): void;
  registerFallback(context: string, strategy: any): void;
  getErrorStats(): any;
  cleanupOldErrors(maxAge?: number): void;
  isOnline(): boolean;
  waitForOnline(): Promise<void>;
}

// 通知服务接口
export interface INotificationService {
  show(options: any): string;
  success(message: string, options?: any): string;
  error(message: string, options?: any): string;
  warning(message: string, options?: any): string;
  info(message: string, options?: any): string;
  loading(message: string, options?: any): string;
  dismiss(id: string): void;
  dismissAll(excludePersistent?: boolean): void;
  update(id: string, updates: any): void;
  getNotifications(): any[];
  getVisibleNotifications(): any[];
  getNotificationsByPosition(position: string): any[];
}

// 性能监控服务接口
export interface IPerformanceMonitorService {
  startMonitoring(): void;
  stopMonitoring(): void;
  generateReport(): any;
  getMetrics(filter?: any): any[];
  getReports(): any[];
  getUserActions(timeRange?: number): any[];
  updateThresholds(thresholds: any[]): void;
  getThresholds(): any[];
  exportData(): any;
}
