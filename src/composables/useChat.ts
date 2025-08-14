import { computed, ref, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useTabsStore } from '../stores/useTabsStore';
import { useMessagesStore } from '../stores/useMessagesStore';
import { useProvidersStore } from '../stores/useProvidersStore';
import { useUserStore } from '../stores/useUserStore';
import { inject, SERVICE_TOKENS } from '../services/container';
import { IChatService, ISearchService, IEventService } from '../types/services';
import { Message, MessageId, TabId, createMessageId, createTabId } from '../types';
import { searchAndFetch } from '../services/search/web';

export function useChat() {
  // Store 引用
  const tabsStore = useTabsStore();
  const messagesStore = useMessagesStore();
  const providersStore = useProvidersStore();
  const userStore = useUserStore();

  // 服务注入
  const chatService = inject<IChatService>(SERVICE_TOKENS.CHAT_SERVICE);
  const searchService = inject<ISearchService>(SERVICE_TOKENS.SEARCH_SERVICE);
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);

  // 状态
  const userInput = ref('');
  const isGenerating = ref(false);
  const currentError = ref<Error | null>(null);

  // 从 stores 获取状态
  const { activeTab } = storeToRefs(tabsStore);
  const { messagesContainer } = storeToRefs(messagesStore);
  const { appSettings } = storeToRefs(userStore);

  // 计算属性
  const canSend = computed(() => {
    return userInput.value.trim() && 
           activeTab.value && 
           activeTab.value.provider && 
           activeTab.value.model &&
           !isGenerating.value;
  });

  const totalUsage = computed(() => {
    if (!activeTab.value) return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    return messagesStore.getTotalUsage(activeTab.value.id);
  });

  const shouldShowBudgetWarning = computed(() => {
    const budget = appSettings.value.budgetToken || 0;
    const warnPercent = appSettings.value.warnPercent || 80;
    if (budget <= 0) return false;
    
    const used = totalUsage.value.total_tokens;
    const threshold = Math.floor((budget * warnPercent) / 100);
    return used >= threshold;
  });

  // 核心聊天功能
  const sendMessage = async (enableWebSearch = false) => {
    if (!canSend.value) return;

    const messageContent = userInput.value.trim();
    const tab = activeTab.value!;

    try {
      isGenerating.value = true;
      currentError.value = null;

      // 预算检查
      if (shouldShowBudgetWarning.value) {
        const key = `budgetWarn_${Date.now()}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          // 这里可以触发提示事件
          eventService.emit('budget:warning', { usage: totalUsage.value });
        }
      }

      // 创建消息对
      const userMessageId = createMessageId(`msg-${Date.now()}`);
      const assistantMessageId = createMessageId(`msg-${Date.now() + 1}`);

      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        content: messageContent,
        timestamp: Date.now(),
        webSearchEnabled: enableWebSearch,
      };

      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        model: tab.model,
        provider: tab.provider,
      };

      // 处理附件
      if (tab.attachments && tab.attachments.length > 0) {
        const parts: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [];
        if (userMessage.content) parts.push({ type: 'text', text: userMessage.content });
        
        for (const attachment of tab.attachments) {
          if (attachment.dataUrl && attachment.mime?.startsWith('image/')) {
            parts.push({ type: 'image_url', image_url: { url: attachment.dataUrl } });
          }
        }
        
        if (parts.length > 0) userMessage.richContent = parts;
        userMessage.attachmentsSnapshot = [...tab.attachments];
      }

      // 添加消息到store
      messagesStore.addMessage(tab.id, userMessage);
      messagesStore.addMessage(tab.id, assistantMessage);

      // 清空输入
      userInput.value = '';
      scrollToBottom();

      // 准备消息负载
      const payload = await prepareMessagePayload(userMessage, assistantMessage, enableWebSearch, tab);
      
      // 清空附件
      tabsStore.updateTab(tab.id, { attachments: [] });

      // 发送到聊天服务
      await chatService.sendMessage(
        tab.provider,
        tab.model,
        payload.messagesToSend,
        userMessageId,
        assistantMessageId,
        payload.attachmentsToSend,
        enableWebSearch,
        { search_context_size: 'medium' }
      );

    } catch (error) {
      currentError.value = error as Error;
      console.error('发送消息失败:', error);
      
      // 处理特定错误
      const message = String((error as any)?.message || '');
      if (/image input not supported/i.test(message)) {
        const tip = '当前模型不支持图像输入，请切换到支持多模态的模型，或移除图片后重试。';
        messagesStore.updateMessage(tab.id, assistantMessageId, { content: tip });
        return;
      }
      
      throw error;
    } finally {
      isGenerating.value = false;
    }
  };

  // 准备消息负载
  const prepareMessagePayload = async (
    userMessage: Message, 
    assistantMessage: Message, 
    enableWebSearch: boolean,
    tab: typeof activeTab.value
  ) => {
    if (!tab) throw new Error('No active tab');

    // 构建消息历史
    const currentMessages = messagesStore.getMessages(tab.id);
    const messagesToSend = currentMessages.map(({ role, content }) => ({ role, content }));
    
    if (tab.systemPrompt) {
      (messagesToSend as any).unshift({ role: 'system', content: tab.systemPrompt });
    }

    const attachmentsToSend = (tab.attachments || []).map(a => ({
      id: a.id,
      name: a.name,
      mime: a.mime,
      size: a.size,
      dataUrl: a.dataUrl,
      textSnippet: a.textSnippet,
      fullText: a.fullText,
    }));

    // 联网搜索处理
    if (enableWebSearch) {
      const query = userMessage.content.trim();
      const docs = await searchAndFetch(query, 8, {
        providers: ['google', 'bing', 'baidu', 'duckduckgo'],
        limit: 20,
        whitelist: [],
        blacklist: [],
      });

      const hasDirectAnswer = docs.some(d => d.isDirect);

      if (hasDirectAnswer) {
        const directAnswerDoc = docs.find(d => d.isDirect)!;
        console.log(`🎯 使用直接答案: "${directAnswerDoc.content}"`);

        assistantMessage.citations = [{
          index: 1,
          title: directAnswerDoc.title,
          url: directAnswerDoc.url
        }];

        (messagesToSend as any).unshift({ 
          role: 'system', 
          content: `你现在有一个精确的直接答案可以使用：

**直接答案**：${directAnswerDoc.content}

**回答要求**：
- 直接使用这个答案回答用户的问题
- 保持答案的准确性和简洁性
- 在回答后标注［1］表示来源
- 不要添加额外的推测或补充信息

请现在直接回答用户的问题。` 
        });
      } else {
        const curated = docs.map((d, i) => 
          `［${i+1}］ ${d.title}\n${d.url}\n${(d.content||'').slice(0, 1200)}\n---`
        ).join('\n');
        
        assistantMessage.citations = docs.map((d, i) => ({ 
          index: i+1, 
          title: d.title, 
          url: d.url 
        }));

        (messagesToSend as any).unshift({ 
          role: 'system', 
          content: `你现在有以下互联网搜索结果可以使用。请直接基于这些信息回答用户问题：

**搜索结果**：
${curated}

**回答要求**：
- 直接回答用户的问题，不要说"搜索结果有错误"或"信息不足"
- 从搜索结果中提取有用信息，即使信息不完整也要尽力回答
- 重要信息后标注来源编号，如［1］［2］等
- 如果是询问当前时间/日期，优先从搜索结果中找到相关时间信息
- 保持回答的实用性和有帮助性

请现在回答用户的问题。` 
        });
      }
    }

    return { messagesToSend, attachmentsToSend };
  };

  // 重试消息
  const retryMessage = async (messageId: MessageId) => {
    if (!activeTab.value) return;
    
    try {
      isGenerating.value = true;
      await chatService.retryMessage(messageId);
    } catch (error) {
      currentError.value = error as Error;
      throw error;
    } finally {
      isGenerating.value = false;
    }
  };

  // 删除消息
  const deleteMessage = async (messageId: MessageId) => {
    if (!activeTab.value) return;
    
    try {
      await chatService.deleteMessage(messageId);
      messagesStore.deleteMessage(activeTab.value.id, messageId);
    } catch (error) {
      currentError.value = error as Error;
      throw error;
    }
  };

  // 滚动控制
  const scrollToBottom = () => {
    nextTick(() => {
      messagesStore.scrollToBottom();
    });
  };

  const scrollToMessage = (messageId: MessageId) => {
    messagesStore.scrollToMessage(messageId);
  };

  // 清除错误
  const clearError = () => {
    currentError.value = null;
  };

  // 估算Token
  const estimateTokens = (content: string): number => {
    // 简单的token估算
    const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = content.length - chineseChars;
    return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
  };

  return {
    // 状态
    userInput,
    isGenerating,
    currentError,
    
    // 计算属性
    canSend,
    totalUsage,
    shouldShowBudgetWarning,

    // 方法
    sendMessage,
    retryMessage,
    deleteMessage,
    scrollToBottom,
    scrollToMessage,
    clearError,
    estimateTokens,
  };
}
