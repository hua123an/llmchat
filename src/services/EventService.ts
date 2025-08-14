import { IEventService } from '../types/services';
import { injectable, SERVICE_TOKENS } from './container';

type EventHandler<T = any> = (data: T) => void;

@injectable(SERVICE_TOKENS.EVENT_SERVICE)
export class EventService implements IEventService {
  private listeners = new Map<string, Set<EventHandler>>();

  emit<T>(eventName: string, data: T): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }

  on<T>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    
    const handlers = this.listeners.get(eventName)!;
    handlers.add(handler);

    // 返回取消订阅函数
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventName);
      }
    };
  }

  once<T>(eventName: string, handler: EventHandler<T>): () => void {
    const onceHandler = (data: T) => {
      handler(data);
      unsubscribe();
    };

    const unsubscribe = this.on(eventName, onceHandler);
    return unsubscribe;
  }

  // 清除所有监听器
  clear(): void {
    this.listeners.clear();
  }

  // 获取事件监听器数量
  getListenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.size || 0;
  }

  // 获取所有事件名称
  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }
}
