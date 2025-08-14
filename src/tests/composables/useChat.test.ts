import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChat } from '../../composables/useChat';
import { useTabsStore } from '../../stores/useTabsStore';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { container, SERVICE_TOKENS } from '../../services/container';

// Mock服务
const mockChatService = {
  sendMessage: vi.fn(),
  retryMessage: vi.fn(),
  deleteMessage: vi.fn(),
};

const mockEventService = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

describe('useChat', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    
    // 注册mock服务
    container.register(SERVICE_TOKENS.CHAT_SERVICE, () => mockChatService);
    container.register(SERVICE_TOKENS.EVENT_SERVICE, () => mockEventService);
    
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const chat = useChat();
    
    expect(chat.userInput.value).toBe('');
    expect(chat.isGenerating.value).toBe(false);
    expect(chat.currentError.value).toBeNull();
  });

  it('should validate canSend correctly', () => {
    const tabsStore = useTabsStore();
    const chat = useChat();
    
    // 没有输入和活动tab时不能发送
    expect(chat.canSend.value).toBe(false);
    
    // 创建tab
    const tabId = tabsStore.createTab({
      title: 'Test Tab',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });
    tabsStore.setActiveTab(tabId);
    
    // 有tab但没有输入时不能发送
    expect(chat.canSend.value).toBe(false);
    
    // 有输入和tab时可以发送
    chat.userInput.value = 'Hello';
    expect(chat.canSend.value).toBe(true);
    
    // 正在生成时不能发送
    chat.isGenerating.value = true;
    expect(chat.canSend.value).toBe(false);
  });

  it('should estimate tokens correctly', () => {
    const chat = useChat();
    
    // 测试英文token估算
    const englishTokens = chat.estimateTokens('Hello world, this is a test message.');
    expect(englishTokens).toBeGreaterThan(0);
    
    // 测试中文token估算
    const chineseTokens = chat.estimateTokens('你好世界，这是一个测试消息。');
    expect(chineseTokens).toBeGreaterThan(0);
    
    // 中文应该比英文token数更多（因为中文字符权重更高）
    expect(chineseTokens).toBeGreaterThan(englishTokens);
  });

  it('should send message successfully', async () => {
    const tabsStore = useTabsStore();
    const messagesStore = useMessagesStore();
    const chat = useChat();
    
    // 创建活动tab
    const tabId = tabsStore.createTab({
      title: 'Test Tab',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });
    tabsStore.setActiveTab(tabId);
    
    // 设置输入
    chat.userInput.value = 'Hello, AI!';
    
    // mock服务响应
    mockChatService.sendMessage.mockResolvedValue(undefined);
    
    // 发送消息
    await chat.sendMessage(false);
    
    // 验证状态
    expect(chat.userInput.value).toBe(''); // 输入应该被清空
    expect(mockChatService.sendMessage).toHaveBeenCalledTimes(1);
    
    // 验证消息被添加到store
    const messages = messagesStore.getMessages(tabId);
    expect(messages.length).toBeGreaterThan(0);
  });

  it('should handle send message error', async () => {
    const tabsStore = useTabsStore();
    const chat = useChat();
    
    // 创建活动tab
    const tabId = tabsStore.createTab({
      title: 'Test Tab',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });
    tabsStore.setActiveTab(tabId);
    
    // 设置输入
    chat.userInput.value = 'Hello, AI!';
    
    // mock服务错误
    const testError = new Error('Network error');
    mockChatService.sendMessage.mockRejectedValue(testError);
    
    // 发送消息应该抛出错误
    await expect(chat.sendMessage(false)).rejects.toThrow('Network error');
    
    // 验证错误状态
    expect(chat.currentError.value).toBe(testError);
    expect(chat.isGenerating.value).toBe(false);
  });

  it('should retry message successfully', async () => {
    const chat = useChat();
    const messageId = 'test-message-id' as any;
    
    mockChatService.retryMessage.mockResolvedValue(undefined);
    
    await chat.retryMessage(messageId);
    
    expect(mockChatService.retryMessage).toHaveBeenCalledWith(messageId);
    expect(chat.currentError.value).toBeNull();
  });

  it('should delete message successfully', async () => {
    const tabsStore = useTabsStore();
    const messagesStore = useMessagesStore();
    const chat = useChat();
    
    // 创建活动tab
    const tabId = tabsStore.createTab({
      title: 'Test Tab',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });
    tabsStore.setActiveTab(tabId);
    
    const messageId = 'test-message-id' as any;
    
    mockChatService.deleteMessage.mockResolvedValue(undefined);
    
    await chat.deleteMessage(messageId);
    
    expect(mockChatService.deleteMessage).toHaveBeenCalledWith(messageId);
  });

  it('should clear error correctly', () => {
    const chat = useChat();
    
    // 设置错误
    chat.currentError.value = new Error('Test error');
    expect(chat.currentError.value).not.toBeNull();
    
    // 清除错误
    chat.clearError();
    expect(chat.currentError.value).toBeNull();
  });

  it('should calculate total usage correctly', () => {
    const tabsStore = useTabsStore();
    const messagesStore = useMessagesStore();
    const chat = useChat();
    
    // 创建活动tab
    const tabId = tabsStore.createTab({
      title: 'Test Tab',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });
    tabsStore.setActiveTab(tabId);
    
    // 默认使用量应该为0
    expect(chat.totalUsage.value).toEqual({
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    });
    
    // 这里可以添加更多测试，模拟添加有使用量的消息
  });
});
