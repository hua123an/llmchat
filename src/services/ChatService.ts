import { IChatService } from '../types/services';
import { Attachment, MessageId } from '../types';
import { injectable, SERVICE_TOKENS, inject } from './container';
import { IEventService } from '../types/services';

@injectable(SERVICE_TOKENS.CHAT_SERVICE)
export class ChatService implements IChatService {
  private eventService: IEventService;

  constructor() {
    this.eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
  }

  async sendMessage(
    provider: string,
    model: string,
    messages: any[],
    userMessageId: string,
    assistantMessageId: string,
    attachments?: Attachment[],
    webSearchEnabled?: boolean,
    webSearchOptions?: { search_context_size?: 'low' | 'medium' | 'high' }
  ): Promise<void> {
    try {
      // 发送消息开始事件
      this.eventService.emit('message:sending', {
        userMessageId,
        assistantMessageId,
        provider,
        model
      });

      // 调用 Electron API
      await (window as any).electronAPI.sendMessage(
        provider,
        model,
        messages,
        userMessageId,
        assistantMessageId,
        attachments,
        webSearchEnabled,
        webSearchOptions || { search_context_size: 'medium' }
      );

      // 发送消息成功事件
      this.eventService.emit('message:sent', {
        userMessageId,
        assistantMessageId,
        provider,
        model
      });

    } catch (error) {
      // 发送消息失败事件
      this.eventService.emit('message:error', {
        userMessageId,
        assistantMessageId,
        error: error as Error
      });
      
      throw error;
    }
  }

  async retryMessage(messageId: string): Promise<void> {
    try {
      this.eventService.emit('message:retrying', { messageId });
      
      // TODO: 实现重试逻辑
      // 1. 获取原始消息
      // 2. 重新构建请求
      // 3. 调用 sendMessage
      
      this.eventService.emit('message:retried', { messageId });
    } catch (error) {
      this.eventService.emit('message:retry_failed', { messageId, error: error as Error });
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      this.eventService.emit('message:deleting', { messageId });
      
      // TODO: 实现删除逻辑
      // 1. 从存储中删除消息
      // 2. 更新相关状态
      
      this.eventService.emit('message:deleted', { messageId });
    } catch (error) {
      this.eventService.emit('message:delete_failed', { messageId, error: error as Error });
      throw error;
    }
  }

  // 创建消息管道
  createMessagePipeline() {
    return {
      // 预处理消息
      preprocess: (content: string) => {
        return content.trim();
      },

      // 验证消息
      validate: (content: string) => {
        if (!content) {
          throw new Error('消息内容不能为空');
        }
        if (content.length > 32000) {
          throw new Error('消息内容过长');
        }
        return true;
      },

      // 后处理响应
      postprocess: (response: string) => {
        return response.trim();
      }
    };
  }

  // 估算token使用量
  estimateTokens(content: string): number {
    // 简单的token估算（中文大约1.5字符=1token，英文大约4字符=1token）
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = content.length - chineseChars;
    
    return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
  }

  // 检查内容安全性
  checkContentSafety(content: string): { safe: boolean; reason?: string } {
    // 基础安全检查
    const sensitivePatterns = [
      /(?:密码|password|pwd)[:：]\s*\w+/i,
      /(?:api[-_]?key|token)[:：]\s*[\w-]+/i,
      /\b\d{15,19}\b/, // 信用卡号
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        return { safe: false, reason: '检测到敏感信息' };
      }
    }

    return { safe: true };
  }
}
