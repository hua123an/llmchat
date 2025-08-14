import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Message, MessageId, TabId, MessageUsage } from '../types';
import { inject, SERVICE_TOKENS } from '../services/container';
import { IEventService, IChatService } from '../types/services';

export const useMessagesStore = defineStore('messages', () => {
  // 注入服务
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
  const chatService = inject<IChatService>(SERVICE_TOKENS.CHAT_SERVICE);

  // 状态
  const messagesMap = ref<Map<TabId, Message[]>>(new Map());
  const messagesContainer = ref<HTMLElement | null>(null);

  // 计算属性
  const getMessages = computed(() => (tabId: TabId) => {
    return messagesMap.value.get(tabId) || [];
  });

  const getMessageById = computed(() => (messageId: MessageId) => {
    for (const messages of messagesMap.value.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) return message;
    }
    return null;
  });

  const getTotalUsage = computed(() => (tabId: TabId) => {
    const messages = getMessages.value(tabId);
    return messages.reduce((total, message) => {
      if (message.usage) {
        return {
          prompt_tokens: total.prompt_tokens + message.usage.prompt_tokens,
          completion_tokens: total.completion_tokens + message.usage.completion_tokens,
          total_tokens: total.total_tokens + message.usage.total_tokens
        };
      }
      return total;
    }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
  });

  // 动作
  const addMessage = (tabId: TabId, message: Message) => {
    const messages = messagesMap.value.get(tabId) || [];
    messages.push(message);
    messagesMap.value.set(tabId, messages);
    
    eventService.emit('message:added', { tabId, message });
  };

  const updateMessage = (tabId: TabId, messageId: MessageId, updates: Partial<Message>) => {
    const messages = messagesMap.value.get(tabId) || [];
    const index = messages.findIndex(m => m.id === messageId);
    
    if (index !== -1) {
      messages[index] = { ...messages[index], ...updates };
      messagesMap.value.set(tabId, messages);
      
      eventService.emit('message:updated', { tabId, messageId, updates });
    }
  };

  const deleteMessage = (tabId: TabId, messageId: MessageId) => {
    const messages = messagesMap.value.get(tabId) || [];
    const filteredMessages = messages.filter(m => m.id !== messageId);
    messagesMap.value.set(tabId, filteredMessages);
    
    eventService.emit('message:removed', { tabId, messageId });
  };

  const clearMessages = (tabId: TabId) => {
    messagesMap.value.set(tabId, []);
    eventService.emit('messages:cleared', { tabId });
  };

  const setMessagesForTab = (tabId: TabId, messages: Message[]) => {
    messagesMap.value.set(tabId, messages);
    eventService.emit('messages:set', { tabId, messages });
  };

  // 流式消息处理
  const appendToMessage = (tabId: TabId, messageId: MessageId, content: string) => {
    const messages = messagesMap.value.get(tabId) || [];
    const message = messages.find(m => m.id === messageId);
    
    if (message) {
      message.content += content;
      eventService.emit('message:streamed', { tabId, messageId, content });
    }
  };

  // 更新消息使用统计
  const updateMessageUsage = (tabId: TabId, messageId: MessageId, usage: MessageUsage) => {
    updateMessage(tabId, messageId, { usage });
  };

  // 重试消息
  const retryMessage = async (tabId: TabId, messageId: MessageId) => {
    try {
      await chatService.retryMessage(messageId);
    } catch (error) {
      console.error('Failed to retry message:', error);
      throw error;
    }
  };

  // 滚动到底部
  const scrollToBottom = () => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  };

  // 滚动到指定消息
  const scrollToMessage = (messageId: MessageId) => {
    const element = document.getElementById(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return {
    // 状态
    messagesMap,
    messagesContainer,
    
    // 计算属性
    getMessages,
    getMessageById,
    getTotalUsage,
    
    // 动作
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    setMessagesForTab,
    appendToMessage,
    updateMessageUsage,
    retryMessage,
    scrollToBottom,
    scrollToMessage,
  };
});
