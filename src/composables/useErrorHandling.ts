import { ref, computed } from 'vue';
import { inject, SERVICE_TOKENS } from '../services/container';
import type { ErrorHandlerService, RetryConfig } from '../services/ErrorHandlerService';
import type { NotificationService } from '../services/NotificationService';

export interface ErrorState {
  hasError: boolean;
  error: Error | null;
  isRetrying: boolean;
  retryCount: number;
  canRetry: boolean;
}

export interface ErrorHandlingOptions {
  context: string;
  retryConfig?: Partial<RetryConfig>;
  showNotifications?: boolean;
  autoRetry?: boolean;
  fallbackValue?: any;
}

export function useErrorHandling(options: ErrorHandlingOptions) {
  const errorHandler = inject<ErrorHandlerService>(SERVICE_TOKENS.ERROR_HANDLER_SERVICE);
  const notificationService = inject<NotificationService>(SERVICE_TOKENS.NOTIFICATION_SERVICE);

  // 状态
  const errorState = ref<ErrorState>({
    hasError: false,
    error: null,
    isRetrying: false,
    retryCount: 0,
    canRetry: false,
  });

  // 计算属性
  const isNetworkError = computed(() => {
    if (!errorState.value.error) return false;
    const message = errorState.value.error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('fetch') || 
           message.includes('timeout');
  });

  const errorMessage = computed(() => {
    if (!errorState.value.error) return '';
    
    const error = errorState.value.error;
    const message = error.message.toLowerCase();
    
    // 友好的错误消息
    if (message.includes('network') || message.includes('fetch')) {
      return '网络连接失败，请检查您的网络设置';
    }
    if (message.includes('timeout')) {
      return '请求超时，请稍后重试';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return '您没有执行此操作的权限';
    }
    if (message.includes('not found')) {
      return '请求的资源不存在';
    }
    if (message.includes('server') || message.includes('500')) {
      return '服务器暂时不可用，请稍后重试';
    }
    
    return error.message || '发生了未知错误';
  });

  const shouldShowRetry = computed(() => {
    return errorState.value.hasError && 
           errorState.value.canRetry && 
           !errorState.value.isRetrying;
  });

  // 方法
  const handleError = async (error: Error, showNotification = options.showNotifications) => {
    errorState.value = {
      hasError: true,
      error,
      isRetrying: false,
      retryCount: 0,
      canRetry: isRetryableError(error),
    };

    // 通知错误处理服务
    await errorHandler?.handleError(error, options.context);

    // 显示通知
    if (showNotification && notificationService) {
      if (isNetworkError.value) {
        notificationService.networkError(errorMessage.value);
      } else {
        notificationService.error(errorMessage.value, {
          title: '操作失败',
          actions: shouldShowRetry.value ? [
            {
              label: '重试',
              type: 'primary',
              handler: () => retry(),
            }
          ] : undefined,
        });
      }
    }
  };

  const isRetryableError = (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('fetch') ||
           message.includes('500') ||
           message.includes('502') ||
           message.includes('503');
  };

  const clearError = () => {
    errorState.value = {
      hasError: false,
      error: null,
      isRetrying: false,
      retryCount: 0,
      canRetry: false,
    };
  };

  const retry = async () => {
    if (!errorState.value.canRetry || errorState.value.isRetrying) return;

    errorState.value.isRetrying = true;
    errorState.value.retryCount++;

    try {
      // 等待网络恢复（如果是网络错误）
      if (isNetworkError.value) {
        await errorHandler?.waitForOnline();
      }

      // 清除错误状态
      clearError();

      // 显示重试成功通知
      if (options.showNotifications) {
        notificationService?.success('重试成功');
      }

    } catch (retryError) {
      errorState.value.isRetrying = false;
      await handleError(retryError as Error);
    }
  };

  // 带重试的执行函数
  const executeWithRetry = async <T>(
    operation: () => Promise<T>,
    customOptions?: Partial<ErrorHandlingOptions>
  ): Promise<T | undefined> => {
    const opts = { ...options, ...customOptions };
    
    try {
      clearError();
      
      if (errorHandler) {
        return await errorHandler.withRetry(operation, opts.context, opts.retryConfig);
      } else {
        return await operation();
      }
      
    } catch (error) {
      await handleError(error as Error, opts.showNotifications);
      
      // 返回fallback值
      if (opts.fallbackValue !== undefined) {
        return opts.fallbackValue;
      }
      
      throw error;
    }
  };

  // 安全执行（不抛出错误）
  const executeSafely = async <T>(
    operation: () => Promise<T>,
    fallbackValue?: T
  ): Promise<T | undefined> => {
    try {
      return await executeWithRetry(operation, { 
        showNotifications: false,
        fallbackValue 
      });
    } catch (error) {
      console.warn('Operation failed safely:', error);
      return fallbackValue;
    }
  };

  // 包装函数，自动添加错误处理
  const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    handlingOptions?: Partial<ErrorHandlingOptions>
  ): T => {
    return (async (...args: Parameters<T>) => {
      return executeWithRetry(() => fn(...args), handlingOptions);
    }) as T;
  };

  // 网络状态监控
  const isOnline = ref(navigator.onLine);
  
  const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine;
  };

  // 监听网络状态变化
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // 网络恢复时自动重试
  if (options.autoRetry) {
    window.addEventListener('online', () => {
      if (errorState.value.hasError && isNetworkError.value) {
        retry();
      }
    });
  }

  // 批量操作错误处理
  const handleBatchErrors = async (
    operations: Array<() => Promise<any>>,
    options: {
      continueOnError?: boolean;
      showProgress?: boolean;
      batchSize?: number;
    } = {}
  ) => {
    const { continueOnError = true, showProgress = true, batchSize = 5 } = options;
    const results: Array<{ success: boolean; data?: any; error?: Error }> = [];
    
    let progressNotificationId: string | undefined;
    
    if (showProgress && notificationService) {
      progressNotificationId = notificationService.showLoading('批量处理中...');
    }
    
    try {
      // 分批处理
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (operation, index) => {
          try {
            const data = await operation();
            return { success: true, data };
          } catch (error) {
            if (!continueOnError) throw error;
            return { success: false, error: error as Error };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // 更新进度
        if (showProgress && notificationService && progressNotificationId) {
          const progress = Math.round(((i + batch.length) / operations.length) * 100);
          notificationService.update(progressNotificationId, {
            message: `批量处理中... ${progress}%`,
          });
        }
      }
      
      // 显示结果摘要
      if (showProgress && notificationService) {
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        
        if (errorCount === 0) {
          notificationService.success(`批量操作完成，成功处理 ${successCount} 项`);
        } else {
          notificationService.warning(
            `批量操作完成，成功 ${successCount} 项，失败 ${errorCount} 项`
          );
        }
      }
      
    } finally {
      if (progressNotificationId && notificationService) {
        notificationService.dismiss(progressNotificationId);
      }
    }
    
    return results;
  };

  return {
    // 状态
    errorState: errorState.value,
    isNetworkError,
    errorMessage,
    shouldShowRetry,
    isOnline,

    // 方法
    handleError,
    clearError,
    retry,
    executeWithRetry,
    executeSafely,
    withErrorHandling,
    handleBatchErrors,
  };
}
