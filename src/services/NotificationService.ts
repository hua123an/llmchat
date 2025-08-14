import { reactive, ref } from 'vue';
import { injectable, SERVICE_TOKENS } from './container';
import type { NotificationAction } from '../components/common/Notification.vue';

export interface NotificationOptions {
  type?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title?: string;
  message: string;
  duration?: number;
  dismissible?: boolean;
  showProgress?: boolean;
  actions?: NotificationAction[];
  persistent?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  category?: string; // 用于分组和批量操作
}

export interface Notification extends NotificationOptions {
  id: string;
  timestamp: number;
  visible: boolean;
}

@injectable(SERVICE_TOKENS.NOTIFICATION_SERVICE)
export class NotificationService {
  private notifications = reactive<Notification[]>([]);
  private idCounter = 0;
  private maxNotifications = 5;
  private defaultDuration = 5000;
  private defaultPosition: NotificationOptions['position'] = 'top-right';

  // 获取所有通知
  getNotifications() {
    return this.notifications;
  }

  // 获取可见通知
  getVisibleNotifications() {
    return this.notifications.filter(n => n.visible);
  }

  // 按位置分组通知
  getNotificationsByPosition(position: NotificationOptions['position']) {
    return this.notifications.filter(n => n.visible && n.position === position);
  }

  // 显示通知
  show(options: NotificationOptions): string {
    const notification: Notification = {
      id: `notification-${++this.idCounter}`,
      timestamp: Date.now(),
      visible: true,
      position: this.defaultPosition,
      duration: this.defaultDuration,
      dismissible: true,
      showProgress: true,
      persistent: false,
      ...options,
    };

    // 添加到队列
    this.notifications.unshift(notification);

    // 限制通知数量
    this.enforceMaxNotifications();

    // 自动关闭
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, notification.duration);
    }

    return notification.id;
  }

  // 显示成功通知
  success(message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      type: 'success',
      message,
      ...options,
    });
  }

  // 显示错误通知
  error(message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      type: 'error',
      message,
      duration: 0, // 错误通知默认不自动关闭
      ...options,
    });
  }

  // 显示警告通知
  warning(message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      type: 'warning',
      message,
      duration: 8000, // 警告通知显示更久
      ...options,
    });
  }

  // 显示信息通知
  info(message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      type: 'info',
      message,
      ...options,
    });
  }

  // 显示加载通知
  loading(message: string, options?: Partial<NotificationOptions>): string {
    return this.show({
      type: 'loading',
      message,
      duration: 0, // 加载通知不自动关闭
      dismissible: false,
      ...options,
    });
  }

  // 关闭通知
  dismiss(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.visible = false;
      
      // 延迟移除以允许动画完成
      setTimeout(() => {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
          this.notifications.splice(index, 1);
        }
      }, 300);
    }
  }

  // 关闭所有通知
  dismissAll(excludePersistent = true): void {
    this.notifications.forEach(notification => {
      if (!excludePersistent || !notification.persistent) {
        notification.visible = false;
      }
    });

    // 延迟移除
    setTimeout(() => {
      for (let i = this.notifications.length - 1; i >= 0; i--) {
        const notification = this.notifications[i];
        if (!notification.visible && (!excludePersistent || !notification.persistent)) {
          this.notifications.splice(i, 1);
        }
      }
    }, 300);
  }

  // 按分类关闭通知
  dismissByCategory(category: string): void {
    this.notifications.forEach(notification => {
      if (notification.category === category) {
        notification.visible = false;
      }
    });

    setTimeout(() => {
      for (let i = this.notifications.length - 1; i >= 0; i--) {
        const notification = this.notifications[i];
        if (!notification.visible && notification.category === category) {
          this.notifications.splice(i, 1);
        }
      }
    }, 300);
  }

  // 更新通知
  update(id: string, updates: Partial<NotificationOptions>): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      Object.assign(notification, updates);
    }
  }

  // 替换通知（关闭旧的，显示新的）
  replace(oldId: string, options: NotificationOptions): string {
    this.dismiss(oldId);
    return this.show(options);
  }

  // 智能通知（防重复）
  smart(options: NotificationOptions & { key?: string }): string {
    const key = options.key || options.message;
    
    // 查找相同key的现有通知
    const existing = this.notifications.find(n => 
      n.visible && 
      (n.message === key || (n as any).key === key)
    );

    if (existing) {
      // 更新现有通知
      this.update(existing.id, options);
      return existing.id;
    } else {
      // 创建新通知
      const notification = this.show(options);
      (this.notifications.find(n => n.id === notification) as any).key = key;
      return notification;
    }
  }

  // 批量操作
  batch(operations: Array<{ action: 'show' | 'dismiss' | 'update'; data: any }>): void {
    operations.forEach(op => {
      switch (op.action) {
        case 'show':
          this.show(op.data);
          break;
        case 'dismiss':
          this.dismiss(op.data);
          break;
        case 'update':
          this.update(op.data.id, op.data.updates);
          break;
      }
    });
  }

  // 配置管理
  configure(config: {
    maxNotifications?: number;
    defaultDuration?: number;
    defaultPosition?: NotificationOptions['position'];
  }): void {
    if (config.maxNotifications !== undefined) {
      this.maxNotifications = config.maxNotifications;
    }
    if (config.defaultDuration !== undefined) {
      this.defaultDuration = config.defaultDuration;
    }
    if (config.defaultPosition !== undefined) {
      this.defaultPosition = config.defaultPosition;
    }
  }

  // 统计信息
  getStats(): {
    total: number;
    visible: number;
    byType: Record<string, number>;
    byPosition: Record<string, number>;
  } {
    const visible = this.getVisibleNotifications();
    
    const byType = visible.reduce((acc, n) => {
      acc[n.type || 'info'] = (acc[n.type || 'info'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPosition = visible.reduce((acc, n) => {
      acc[n.position || 'top-right'] = (acc[n.position || 'top-right'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.notifications.length,
      visible: visible.length,
      byType,
      byPosition,
    };
  }

  // 清理旧通知
  cleanup(maxAge = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const notification = this.notifications[i];
      if (!notification.visible && notification.timestamp < cutoff) {
        this.notifications.splice(i, 1);
      }
    }
  }

  // 导出通知历史
  exportHistory(): Notification[] {
    return [...this.notifications];
  }

  // 限制通知数量
  private enforceMaxNotifications(): void {
    const visibleNotifications = this.getVisibleNotifications();
    
    if (visibleNotifications.length > this.maxNotifications) {
      // 关闭最旧的非持久化通知
      const toRemove = visibleNotifications
        .filter(n => !n.persistent)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, visibleNotifications.length - this.maxNotifications);

      toRemove.forEach(notification => {
        this.dismiss(notification.id);
      });
    }
  }

  // 便捷方法：网络错误
  networkError(message = '网络连接失败，请检查您的网络设置'): string {
    return this.error(message, {
      title: '网络错误',
      category: 'network',
      actions: [
        {
          label: '重试',
          type: 'primary',
          handler: () => window.location.reload(),
        },
        {
          label: '检查设置',
          type: 'secondary',
          handler: () => {
            // 可以打开网络设置对话框
          },
        },
      ],
    });
  }

  // 便捷方法：权限错误
  permissionError(message = '您没有执行此操作的权限'): string {
    return this.error(message, {
      title: '权限错误',
      category: 'permission',
    });
  }

  // 便捷方法：验证错误
  validationError(message: string): string {
    return this.warning(message, {
      title: '输入验证',
      category: 'validation',
    });
  }

  // 便捷方法：操作成功
  operationSuccess(message = '操作已成功完成'): string {
    return this.success(message, {
      category: 'operation',
    });
  }

  // 便捷方法：保存成功
  saveSuccess(message = '保存成功'): string {
    return this.success(message, {
      category: 'save',
      duration: 3000,
    });
  }

  // 便捷方法：复制成功
  copySuccess(message = '已复制到剪贴板'): string {
    return this.success(message, {
      category: 'copy',
      duration: 2000,
    });
  }

  // 便捷方法：加载状态
  showLoading(message = '加载中...'): string {
    return this.loading(message, {
      category: 'loading',
    });
  }

  // 便捷方法：隐藏加载状态
  hideLoading(): void {
    this.dismissByCategory('loading');
  }
}
