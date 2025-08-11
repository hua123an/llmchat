import { ElMessage, ElNotification } from 'element-plus';

// 错误类型定义
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  STORAGE = 'STORAGE',
  SYSTEM = 'SYSTEM',
  USER = 'USER'
}

// 错误严重级别
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 自定义错误类
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: string;
  public readonly timestamp: Date;
  public readonly userMessage: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity,
    context: string,
    userMessage?: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.userMessage = userMessage || this.getDefaultUserMessage();
    this.originalError = originalError;

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  private getDefaultUserMessage(): string {
    const messages = {
      [ErrorType.NETWORK]: '网络连接出现问题，请检查网络设置',
      [ErrorType.API]: 'API服务暂时不可用，请稍后重试',
      [ErrorType.VALIDATION]: '输入数据格式不正确，请检查后重试',
      [ErrorType.STORAGE]: '数据存储出现问题，请重启应用',
      [ErrorType.SYSTEM]: '系统出现异常，请联系技术支持',
      [ErrorType.USER]: '操作失败，请重试'
    };
    return messages[this.type] || '发生未知错误，请重试';
  }
}

// 错误处理器类
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];
  private maxLogSize = 100;

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理错误的主要方法
   */
  public handle(error: Error | AppError, context?: string): void {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else {
      // 将普通错误转换为AppError
      appError = this.convertToAppError(error, context || 'Unknown');
    }

    // 记录错误
    this.logError(appError);

    // 显示用户友好的错误提示
    this.showUserNotification(appError);

    // 根据严重级别进行不同处理
    this.handleBySeverity(appError);
  }

  /**
   * 将普通错误转换为AppError
   */
  private convertToAppError(error: Error, context: string): AppError {
    let type = ErrorType.SYSTEM;
    let severity = ErrorSeverity.MEDIUM;

    // 根据错误消息推断类型
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('fetch')) {
      type = ErrorType.NETWORK;
    } else if (message.includes('api') || message.includes('http')) {
      type = ErrorType.API;
    } else if (message.includes('validation') || message.includes('invalid')) {
      type = ErrorType.VALIDATION;
    } else if (message.includes('storage') || message.includes('localStorage')) {
      type = ErrorType.STORAGE;
    }

    // 根据错误类型设置严重级别
    if (type === ErrorType.NETWORK || type === ErrorType.API) {
      severity = ErrorSeverity.HIGH;
    } else if (type === ErrorType.STORAGE) {
      severity = ErrorSeverity.CRITICAL;
    }

    return new AppError(
      error.message,
      type,
      severity,
      context,
      undefined,
      error
    );
  }

  /**
   * 记录错误
   */
  private logError(error: AppError): void {
    // 添加到内存日志
    this.errorLog.unshift(error);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // 控制台输出
    const logLevel = this.getLogLevel(error.severity);
    console[logLevel](`[${error.context}] ${error.type}: ${error.message}`, {
      timestamp: error.timestamp,
      severity: error.severity,
      stack: error.stack,
      originalError: error.originalError
    });

    // 持久化存储（可选）
    this.persistError(error);
  }

  /**
   * 根据严重级别获取日志级别
   */
  private getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'log';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * 显示用户通知
   */
  private showUserNotification(error: AppError): void {
    switch (error.severity) {
      case ErrorSeverity.LOW:
        ElMessage.info(error.userMessage);
        break;
      case ErrorSeverity.MEDIUM:
        ElMessage.warning(error.userMessage);
        break;
      case ErrorSeverity.HIGH:
        ElMessage.error(error.userMessage);
        break;
      case ErrorSeverity.CRITICAL:
        ElNotification.error({
          title: '严重错误',
          message: error.userMessage,
          duration: 0, // 不自动关闭
          showClose: true
        });
        break;
    }
  }

  /**
   * 根据严重级别处理错误
   */
  private handleBySeverity(error: AppError): void {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        // 关键错误可能需要重启应用或清理数据
        this.handleCriticalError(error);
        break;
      case ErrorSeverity.HIGH:
        // 高级错误可能需要重试或回退
        this.handleHighSeverityError(error);
        break;
      default:
        // 其他错误正常处理
        break;
    }
  }

  /**
   * 处理关键错误
   */
  private handleCriticalError(error: AppError): void {
    // 可以在这里实现自动重启、数据备份等逻辑
    console.error('Critical error detected:', error);
    
    // 如果是存储错误，尝试清理损坏的数据
    if (error.type === ErrorType.STORAGE) {
      this.attemptStorageRecovery();
    }
  }

  /**
   * 处理高级错误
   */
  private handleHighSeverityError(error: AppError): void {
    // 可以在这里实现重试逻辑、降级服务等
    console.warn('High severity error detected:', error);
  }

  /**
   * 尝试存储恢复
   */
  private attemptStorageRecovery(): void {
    try {
      // 清理可能损坏的localStorage数据
      const keysToCheck = ['chatTabs', 'agents', 'settings'];
      for (const key of keysToCheck) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            JSON.parse(data); // 尝试解析
          }
        } catch {
          console.warn(`Removing corrupted data for key: ${key}`);
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Storage recovery failed:', error);
    }
  }

  /**
   * 持久化错误日志
   */
  private persistError(error: AppError): void {
    try {
      const errorData = {
        message: error.message,
        type: error.type,
        severity: error.severity,
        context: error.context,
        timestamp: error.timestamp.toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // 保存到localStorage（简单实现）
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.unshift(errorData);
      
      // 只保留最近50条错误日志
      const logsToKeep = existingLogs.slice(0, 50);
      localStorage.setItem('errorLogs', JSON.stringify(logsToKeep));
    } catch {
      // 如果无法保存日志，忽略错误避免递归
    }
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: AppError[];
  } {
    const stats = {
      total: this.errorLog.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: this.errorLog.slice(0, 10)
    };

    // 初始化计数器
    Object.values(ErrorType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // 统计错误
    this.errorLog.forEach(error => {
      stats.byType[error.type]++;
      stats.bySeverity[error.severity]++;
    });

    return stats;
  }

  /**
   * 清理错误日志
   */
  public clearErrorLog(): void {
    this.errorLog = [];
    localStorage.removeItem('errorLogs');
  }
}

// 便捷的全局错误处理函数
export const handleError = (error: Error | AppError, context?: string): void => {
  ErrorHandler.getInstance().handle(error, context);
};

// 创建特定类型的错误
export const createError = {
  network: (message: string, context: string, userMessage?: string) =>
    new AppError(message, ErrorType.NETWORK, ErrorSeverity.HIGH, context, userMessage),
  
  api: (message: string, context: string, userMessage?: string) =>
    new AppError(message, ErrorType.API, ErrorSeverity.HIGH, context, userMessage),
  
  validation: (message: string, context: string, userMessage?: string) =>
    new AppError(message, ErrorType.VALIDATION, ErrorSeverity.MEDIUM, context, userMessage),
  
  storage: (message: string, context: string, userMessage?: string) =>
    new AppError(message, ErrorType.STORAGE, ErrorSeverity.CRITICAL, context, userMessage),
  
  system: (message: string, context: string, userMessage?: string) =>
    new AppError(message, ErrorType.SYSTEM, ErrorSeverity.HIGH, context, userMessage),
  
  user: (message: string, context: string, userMessage?: string) =>
    new AppError(message, ErrorType.USER, ErrorSeverity.LOW, context, userMessage)
};

export default ErrorHandler;