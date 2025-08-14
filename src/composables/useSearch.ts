import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useTabsStore } from '../stores/useTabsStore';
import { useMessagesStore } from '../stores/useMessagesStore';
import { inject, SERVICE_TOKENS } from '../services/container';
import { ISearchService } from '../types/services';
import { SearchResult, MessageId } from '../types';

export function useSearch() {
  // Store 引用
  const tabsStore = useTabsStore();
  const messagesStore = useMessagesStore();
  
  // 服务注入
  const searchService = inject<ISearchService>(SERVICE_TOKENS.SEARCH_SERVICE);

  // 状态
  const searchQuery = ref('');
  const searchResults = ref<SearchResult[]>([]);
  const highlightedMessageId = ref<MessageId | null>(null);
  const isSearching = ref(false);
  const searchError = ref<Error | null>(null);

  // 从 stores 获取状态
  const { tabs } = storeToRefs(tabsStore);

  // 计算属性
  const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0);
  const hasSearchResults = computed(() => searchResults.value.length > 0);
  const searchResultsCount = computed(() => searchResults.value.length);

  // 搜索消息内容
  const searchMessages = async (query?: string) => {
    const searchTerm = query || searchQuery.value.trim();
    if (!searchTerm) {
      clearSearch();
      return;
    }

    try {
      isSearching.value = true;
      searchError.value = null;
      
      const results: SearchResult[] = [];
      const lowerQuery = searchTerm.toLowerCase();

      // 搜索所有标签的消息
      tabs.value.forEach(tab => {
        const messages = messagesStore.getMessages(tab.id);
        messages.forEach(message => {
          if (message.content.toLowerCase().includes(lowerQuery)) {
            // 创建高亮内容
            const content = message.content;
            const index = content.toLowerCase().indexOf(lowerQuery);
            const start = Math.max(0, index - 50);
            const end = Math.min(content.length, index + searchTerm.length + 50);
            
            let highlightedContent = content.slice(start, end);
            if (start > 0) highlightedContent = '...' + highlightedContent;
            if (end < content.length) highlightedContent = highlightedContent + '...';
            
            // 高亮搜索词
            const regex = new RegExp(searchTerm, 'gi');
            highlightedContent = highlightedContent.replace(regex, `<mark>$&</mark>`);

            results.push({
              messageId: message.id,
              tabTitle: tab.title,
              highlightedContent,
            });
          }
        });
      });

      searchResults.value = results;
      
    } catch (error) {
      searchError.value = error as Error;
      console.error('搜索失败:', error);
    } finally {
      isSearching.value = false;
    }
  };

  // 跳转到消息
  const goToMessage = (messageId: MessageId) => {
    // 找到包含此消息的标签
    const targetTab = tabs.value.find(tab => {
      const messages = messagesStore.getMessages(tab.id);
      return messages.some(msg => msg.id === messageId);
    });

    if (targetTab) {
      // 切换到对应标签
      tabsStore.setActiveTab(targetTab.id);
      
      // 高亮消息并滚动到位置
      messagesStore.scrollToMessage(messageId);
      highlightedMessageId.value = messageId;

      // 2秒后清除高亮
      setTimeout(() => {
        highlightedMessageId.value = null;
      }, 2000);
    }
  };

  // 清除搜索
  const clearSearch = () => {
    searchQuery.value = '';
    searchResults.value = [];
    highlightedMessageId.value = null;
    searchError.value = null;
  };

  // Web搜索功能
  const webSearch = async (query: string, options?: {
    providers?: Array<'google' | 'bing' | 'baidu' | 'duckduckgo'>;
    limit?: number;
  }) => {
    try {
      isSearching.value = true;
      searchError.value = null;

      const results = await searchService.webSearch(query, options);
      return results;
      
    } catch (error) {
      searchError.value = error as Error;
      console.error('Web搜索失败:', error);
      return [];
    } finally {
      isSearching.value = false;
    }
  };

  // 获取网页内容
  const fetchWebContent = async (url: string) => {
    try {
      isSearching.value = true;
      searchError.value = null;

      const content = await searchService.fetchReadable(url);
      return content;
      
    } catch (error) {
      searchError.value = error as Error;
      console.error('获取网页内容失败:', error);
      return '';
    } finally {
      isSearching.value = false;
    }
  };

  // 搜索并获取内容
  const searchAndFetch = async (
    query: string, 
    topN = 8, 
    options?: Parameters<typeof searchService.searchAndFetch>[2]
  ) => {
    try {
      isSearching.value = true;
      searchError.value = null;

      const results = await searchService.searchAndFetch(query, topN, options);
      return results;
      
    } catch (error) {
      searchError.value = error as Error;
      console.error('搜索并获取内容失败:', error);
      return [];
    } finally {
      isSearching.value = false;
    }
  };

  // 高级搜索（支持过滤器）
  const advancedMessageSearch = (filters: {
    query: string;
    role?: 'user' | 'assistant';
    dateRange?: { start: Date; end: Date };
    tabId?: string;
    hasAttachments?: boolean;
    provider?: string;
    model?: string;
  }) => {
    const results: SearchResult[] = [];
    const lowerQuery = filters.query.toLowerCase();

    const tabsToSearch = filters.tabId 
      ? tabs.value.filter(tab => tab.name === filters.tabId)
      : tabs.value;

    tabsToSearch.forEach(tab => {
      const messages = messagesStore.getMessages(tab.id);
      
      messages.forEach(message => {
        // 基础文本匹配
        if (!message.content.toLowerCase().includes(lowerQuery)) return;

        // 角色过滤
        if (filters.role && message.role !== filters.role) return;

        // 日期范围过滤
        if (filters.dateRange) {
          const messageDate = new Date(message.timestamp);
          if (messageDate < filters.dateRange.start || messageDate > filters.dateRange.end) return;
        }

        // 附件过滤
        if (filters.hasAttachments !== undefined) {
          const hasAttachments = !!(message.attachmentsSnapshot?.length);
          if (hasAttachments !== filters.hasAttachments) return;
        }

        // 提供商过滤
        if (filters.provider && message.provider !== filters.provider) return;

        // 模型过滤
        if (filters.model && message.model !== filters.model) return;

        // 创建结果
        const content = message.content;
        const index = content.toLowerCase().indexOf(lowerQuery);
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + filters.query.length + 50);
        
        let highlightedContent = content.slice(start, end);
        if (start > 0) highlightedContent = '...' + highlightedContent;
        if (end < content.length) highlightedContent = highlightedContent + '...';
        
        const regex = new RegExp(filters.query, 'gi');
        highlightedContent = highlightedContent.replace(regex, `<mark>$&</mark>`);

        results.push({
          messageId: message.id,
          tabTitle: tab.title,
          highlightedContent,
        });
      });
    });

    searchResults.value = results;
    return results;
  };

  // 搜索建议
  const getSearchSuggestions = (query: string): string[] => {
    if (!query.trim()) return [];

    const suggestions = new Set<string>();
    const lowerQuery = query.toLowerCase();

    // 从历史消息中提取相关词汇
    tabs.value.forEach(tab => {
      const messages = messagesStore.getMessages(tab.id);
      messages.forEach(message => {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          // 提取包含查询词的句子片段
          const sentences = message.content.split(/[.!?。！？]/);
          sentences.forEach(sentence => {
            if (sentence.toLowerCase().includes(lowerQuery)) {
              const words = sentence.trim().split(/\s+/);
              words.forEach(word => {
                if (word.length > 2 && word.toLowerCase().includes(lowerQuery)) {
                  suggestions.add(word);
                }
              });
            }
          });
        }
      });
    });

    return Array.from(suggestions).slice(0, 5);
  };

  return {
    // 状态
    searchQuery,
    searchResults,
    highlightedMessageId,
    isSearching,
    searchError,

    // 计算属性
    hasSearchQuery,
    hasSearchResults,
    searchResultsCount,

    // 方法
    searchMessages,
    goToMessage,
    clearSearch,
    webSearch,
    fetchWebContent,
    searchAndFetch,
    advancedMessageSearch,
    getSearchSuggestions,
  };
}
