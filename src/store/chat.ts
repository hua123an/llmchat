import { defineStore } from 'pinia';
import { ref, computed, nextTick } from 'vue';
import { createError, handleError } from '../utils/errorHandler';
// import removed: cost estimation no longer used
import { t } from '../locales';
import { searchAndFetch } from '../services/search/web';

// 基础数据接口
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  // 可选的富内容，用于前端渲染（不一定发给服务端）
  richContent?: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  // 为重试保留当时的附件快照（仅克隆字段，避免结构化克隆问题）
  attachmentsSnapshot?: Attachment[];
  usage?: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  };
  // OpenRouter搜索注释
  searchAnnotations?: Array<{
    type: 'url_citation';
    url_citation: {
      url: string;
      title: string;
      content?: string;
      start_index: number;
      end_index: number;
    };
  }>;
  // 引用链接（用于联网检索时的参考来源输出）
  citations?: Array<{ index: number; title: string; url: string }>;
  responseTime?: number; // 响应时间（毫秒）
  model?: string; // 使用的模型
  provider?: string; // 使用的服务商
  // 联网搜索状态（用于重试时恢复）
  webSearchEnabled?: boolean;
}

export interface ChatTab {
  name: string;
  title: string;
  messages: Message[];
  provider: string;
  model: string;
  models: Array<{id: string; name?: string}>;
  systemPrompt: string;
  attachments?: Attachment[];
  // 新增：智能分类标签
  category?: 'work' | 'study' | 'creative' | 'technical' | 'daily' | 'other';
  tags?: string[]; // 自定义标签
  lastActive?: number; // 最后活跃时间
}

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl?: string; // for images
  textSnippet?: string; // for text files
  // internal optional full text (not sent to backend)
  fullText?: string;
}

export interface Provider {
  name: string;
  baseUrl: string;
  models?: string[];
}

export interface SearchResult {
  messageId: string;
  tabTitle: string;
  highlightedContent: string;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  description: string;
  category: string;
  systemPrompt: string;
  capabilities: string[];
  modelRecommendation?: string;
  examples: string[];
  isActive: boolean;
}

export interface WorkSpace {
  id: string;
  name: string;
  color: 'purple' | 'red' | 'blue' | 'green' | 'orange';
  shortcut: string;
  systemPrompt: string;
  tabs: string[]; // tab IDs belonging to this space
}

// 统计账本条目（以每条助手回复为粒度）
export interface StatsEntry {
  id: string; // messageId
  tabName: string;
  provider?: string;
  model?: string;
  timestamp: number; // assistantMessage.timestamp
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTimeMs?: number;
  costUSD?: number | null;
}

export const useChatStore = defineStore('chat', () => {
  // State
  const providers = ref<Provider[]>([]);
  const tabs = ref<ChatTab[]>([]);
  const activeTab = ref('');
  const userInput = ref('');
  const messagesContainer = ref<HTMLElement | null>(null);
  const searchQuery = ref('');
  const searchResults = ref<SearchResult[]>([]);
  const highlightedMessageId = ref<string | null>(null);
  const agents = ref<Agent[]>([]);
  const isAgentSelectorOpen = ref(false);
  const selectedAgent = ref<Agent | null>(null);
  const spaces = ref<WorkSpace[]>([]);
  const activeSpace = ref('ai-assistant');
  const isSettingsOpen = ref(false);
  const isUserProfileOpen = ref(false);
  const isSidebarCollapsed = ref(false);
  const isStatsOpen = ref(false);
  const isKnowledgeOpen = ref(false);
  const isPromptsOpen = ref(false);
  const isPluginsOpen = ref(false);
  const isHistorySearchOpen = ref(false);
  const isImageGenerationOpen = ref(false);

  // ===== 强制更新状态（用于遮罩层） =====
  const forceUpdateState = ref<{ required: boolean; status: 'idle'|'checking'|'available'|'downloading'|'downloaded'|'error'; notes?: string; progress?: number }>({ required: false, status: 'idle' });

  // 统计账本与显示设置
  const statsLedger = ref<StatsEntry[]>([]);
  // 费用统计已下线，保留占位避免破坏持久化结构
  const currencySettings = ref<{ currency: string; rateToUSD: number; lastFetchedAt?: number; autoFetchRate: boolean }>({
    currency: 'USD',
    rateToUSD: 1,
    autoFetchRate: false,
  });

  // 用户信息（简单本地状态，可接入真实账户系统）
  const user = ref<{ name: string; email: string }>({
    name: '用户',
    email: 'user@chatllm.com',
  });
  const userAvatar = ref<string | null>(null);
  const userInitial = computed(() => {
    const n = user.value.name?.trim();
    return n && n.length > 0 ? n.charAt(0).toUpperCase() : 'U';
  });
  const persistUserProfile = () => {
    try {
      localStorage.setItem('userProfile', JSON.stringify({
        user: user.value,
        avatar: userAvatar.value,
      }));
    } catch (error) {
      // 忽略本地存储异常以避免影响主流程
      console.warn('Persist userProfile failed', error);
    }
  };

  const setUser = (updates: Partial<{ name: string; email: string }>) => {
    user.value = { ...user.value, ...updates };
    persistUserProfile();
  };

  const setUserAvatar = (dataUrl: string | null) => {
    userAvatar.value = dataUrl;
    persistUserProfile();
  };

  const removeUserAvatar = () => {
    setUserAvatar(null);
  };

  const openUserProfile = () => { isUserProfileOpen.value = true; };
  const closeUserProfile = () => { isUserProfileOpen.value = false; };
  const toggleSidebar = () => { 
    isSidebarCollapsed.value = !isSidebarCollapsed.value; 
    try { localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed.value)); } catch {}
  };
  const toggleStats = () => { isStatsOpen.value = !isStatsOpen.value; };
  const toggleKnowledge = () => { isKnowledgeOpen.value = !isKnowledgeOpen.value; };
  const openPrompts = () => { isPromptsOpen.value = true; };
  const closePrompts = () => { isPromptsOpen.value = false; };
  const openPlugins = () => { isPluginsOpen.value = true; };
  const closePlugins = () => { isPluginsOpen.value = false; };
  
  const openHistorySearch = () => { isHistorySearchOpen.value = true; };
  const closeHistorySearch = () => { isHistorySearchOpen.value = false; };
  
  const openImageGeneration = () => { isImageGenerationOpen.value = true; };
  const closeImageGeneration = () => { isImageGenerationOpen.value = false; };

  // Getters
  const currentTab = computed(() => tabs.value.find(tab => tab.name === activeTab.value));
  const totalUsage = computed(() => {
    if (!currentTab.value) return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    return currentTab.value.messages.reduce((total, message) => {
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

  const currentSpace = computed(() => spaces.value.find(s => s.id === activeSpace.value));
  const spaceFilteredTabs = computed(() => {
    const space = currentSpace.value;
    if (!space) return tabs.value;
    return tabs.value.filter(tab => space.tabs.includes(tab.name));
  });

  // 强制更新遮罩层可见性
  const isUpdateOverlayVisible = computed(() => {
    return ['available', 'downloading', 'downloaded'].includes(forceUpdateState.value.status);
  });

  // 持久化方法
  const saveTabsToStorage = () => {
    try {
      localStorage.setItem('chatTabs', JSON.stringify(tabs.value));
      localStorage.setItem('activeTab', activeTab.value);
    } catch (error) {
      handleError(
        createError.storage('Failed to save tabs to localStorage', 'saveTabsToStorage', '保存对话标签失败'),
        'ChatStore'
      );
    }
  };

  const persistState = () => {
    localStorage.setItem('chatTabs', JSON.stringify(tabs.value));
    localStorage.setItem('activeTab', activeTab.value);
  };

  const persistAgents = () => {
    localStorage.setItem('agents', JSON.stringify(agents.value));
  };

  const persistSpaces = () => {
    localStorage.setItem('workSpaces', JSON.stringify(spaces.value));
  };

  // ===== 统计持久化 =====
  const saveStatsLedgerToStorage = () => {
    try {
      localStorage.setItem('statsLedger', JSON.stringify(statsLedger.value));
    } catch (error) {
      console.warn('Persist statsLedger failed', error);
    }
  };

  const loadStatsLedgerFromStorage = () => {
    try {
      const raw = localStorage.getItem('statsLedger');
      if (raw) {
        statsLedger.value = JSON.parse(raw);
      }
    } catch (error) {
      console.warn('Load statsLedger failed', error);
      statsLedger.value = [];
    }
  };

  const saveCurrencySettingsToStorage = () => {
    try {
      localStorage.setItem('currencySettings', JSON.stringify(currencySettings.value));
    } catch (error) {
      console.warn('Persist currencySettings failed', error);
    }
  };

  const loadCurrencySettingsFromStorage = () => {
    try {
      const raw = localStorage.getItem('currencySettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          currencySettings.value = { ...currencySettings.value, ...parsed };
        }
      }
    } catch (error) {
      console.warn('Load currencySettings failed', error);
    }
  };

  // 统计操作
  const clearStats = (params: { scope: 'all' | 'currentTab'; from?: number; to?: number }) => {
    const now = Date.now();
    const from = params.from ?? 0;
    const to = params.to ?? now;
    if (params.scope === 'all') {
      statsLedger.value = statsLedger.value.filter(e => e.timestamp < from || e.timestamp > to);
    } else {
      if (!currentTab.value) return;
      const tabName = currentTab.value.name;
      statsLedger.value = statsLedger.value.filter(e => e.tabName !== tabName || e.timestamp < from || e.timestamp > to);
    }
    saveStatsLedgerToStorage();
  };

  const setCurrencySettings = (updates: Partial<{ currency: string; rateToUSD: number; autoFetchRate: boolean; lastFetchedAt?: number }>) => {
    currencySettings.value = { ...currencySettings.value, ...updates };
    saveCurrencySettingsToStorage();
  };

  // 简易聚合/筛选（供组件使用或后续扩展）
  const getStatsInRange = (params: { scope: 'all' | 'currentTab'; from?: number; to?: number }) => {
    const now = Date.now();
    const from = params.from ?? 0;
    const to = params.to ?? now;
    const list = statsLedger.value.filter(e => e.timestamp >= from && e.timestamp <= to);
    if (params.scope === 'all') return list;
    if (!currentTab.value) return [];
    return list.filter(e => e.tabName === currentTab.value!.name);
  };

  const aggregateByModel = (entries: StatsEntry[]) => {
    const map: Record<string, { model: string; tokens: number; costUSD: number; count: number }>
      = {};
    for (const e of entries) {
      const key = (e.model || '-').toLowerCase();
      if (!map[key]) map[key] = { model: e.model || '-', tokens: 0, costUSD: 0, count: 0 };
      map[key].tokens += e.totalTokens || 0;
      map[key].costUSD += e.costUSD || 0;
      map[key].count += 1;
    }
    return Object.values(map);
  };

  // Actions
  // 单独的providers加载函数
  const loadProviders = async () => {
    try {
      const providersData = await window.electronAPI.getProviders();
      
      if (Array.isArray(providersData) && providersData.length > 0) {
        providers.value = [...providersData]; // 使用展开运算符确保响应式更新
        return true;
      } else {
        providers.value = [];
        return false;
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      providers.value = [];
      return false;
    }
  };

  const loadInitialData = async () => {
    // 加载providers
    await loadProviders();

    try {
    const savedTabs = localStorage.getItem('chatTabs');
    if (savedTabs) {
      tabs.value = JSON.parse(savedTabs);
      const savedActiveTab = localStorage.getItem('activeTab');
      if (savedActiveTab && tabs.value.some(t => t.name === savedActiveTab)) {
        activeTab.value = savedActiveTab;
      } else if (tabs.value.length > 0) {
        activeTab.value = tabs.value[0].name;
      }
    }
    } catch (error) {
      handleError(
        createError.storage('Failed to load tabs from localStorage', 'loadInitialData', '加载对话标签失败，已重置为默认'),
        'ChatStore'
      );
      tabs.value = [];
    }

    if (tabs.value.length === 0) {
      addNewChat();
    }

    // 加载Agents
    try {
      const savedAgents = localStorage.getItem('agents');
      if (savedAgents) {
        agents.value = JSON.parse(savedAgents);
      } else {
        agents.value = getDefaultAgents();
        persistAgents();
      }
    } catch (error) {
      handleError(
        createError.storage('Failed to load agents from localStorage', 'loadInitialData', '加载智能助手失败，已重置为默认'),
        'ChatStore'
      );
      agents.value = getDefaultAgents();
      persistAgents();
    }

    // 初始化工作空间
    try {
      const savedSpaces = localStorage.getItem('workSpaces');
      if (savedSpaces) {
        spaces.value = JSON.parse(savedSpaces);
      } else {
        // 初始化默认工作空间
        spaces.value = getDefaultSpaces();
        persistSpaces();
      }
    } catch (error) {
      handleError(
        createError.storage('Failed to load workspaces from localStorage', 'loadInitialData', '加载工作空间失败，已重置为默认'),
        'ChatStore'
      );
      spaces.value = getDefaultSpaces();
      persistSpaces();
    }

    // 加载用户资料（姓名、邮箱、头像）
    try {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed && parsed.user) {
          user.value = parsed.user;
        }
        if (typeof parsed?.avatar === 'string' || parsed?.avatar === null) {
          userAvatar.value = parsed.avatar;
        }
      }
    } catch (error) {
      console.warn('Load userProfile failed', error);
    }

    // 读取侧边栏折叠状态
    try {
      const savedCollapsed = localStorage.getItem('sidebarCollapsed');
      if (savedCollapsed !== null) {
        isSidebarCollapsed.value = JSON.parse(savedCollapsed);
      }
    } catch {}

    // 加载统计与货币配置
    loadStatsLedgerFromStorage();
    loadCurrencySettingsFromStorage();

    // Listen for message usage updates
    window.electronAPI.onMessageUsage((_event, usageData) => {
      if (currentTab.value) {
        const message = currentTab.value.messages.find(m => m.id === usageData.messageId);
        if (message) {
          message.usage = usageData.usage;
          saveTabsToStorage();

          // 写入/更新统计账本
          const existing = statsLedger.value.find(e => e.id === usageData.messageId);
          const promptTokens = usageData.usage?.prompt_tokens ?? 0;
          const completionTokens = usageData.usage?.completion_tokens ?? 0;
          const totalTokens = usageData.usage?.total_tokens ?? (promptTokens + completionTokens);
          const modelId = message.model || currentTab.value!.model;
          // 费用统计已移除
          const costUSD = null;

          const entry: StatsEntry = {
            id: usageData.messageId,
            tabName: currentTab.value!.name,
            provider: message.provider || currentTab.value!.provider,
            model: modelId,
            timestamp: message.timestamp || Date.now(),
            promptTokens,
            completionTokens,
            totalTokens,
            responseTimeMs: existing?.responseTimeMs,
            costUSD: costUSD,
          };

          if (existing) {
            Object.assign(existing, entry);
          } else {
            statsLedger.value.push(entry);
          }
          saveStatsLedgerToStorage();
        }
      }
    });

    // Listen for streaming message updates
    const lastStreamDeltaByMessage = new Map<string, string>();
    window.electronAPI.onMessage((_event, data) => {
      if (!currentTab.value) return;
      
      const assistantMessage = currentTab.value.messages.find(m => m.id === data.messageId);
      if (!assistantMessage) return;

      if (data.delta === '[DONE]') {
        // 计算响应时间
        if (assistantMessage.timestamp) {
          assistantMessage.responseTime = Date.now() - assistantMessage.timestamp;
        }
        saveTabsToStorage();

        // 回填统计账本中的响应时间
        const entry = statsLedger.value.find(e => e.id === data.messageId);
        if (entry) {
          entry.responseTimeMs = assistantMessage.responseTime;
          saveStatsLedgerToStorage();
        }
        lastStreamDeltaByMessage.delete(data.messageId);
        return;
      }
      if (data.delta.startsWith('error:')) {
        console.error(data.delta);
        assistantMessage.content = t('errors.generic');
        scrollToBottom();
        return;
      }
      const delta: string = String(data.delta || '');
      const prevDelta = lastStreamDeltaByMessage.get(data.messageId) || '';
      const prevContent = assistantMessage.content || '';
      // 1) 完整重复的delta（服务端偶发重发）→ 忽略
      if (delta === prevDelta || prevContent.endsWith(delta)) {
        return;
      }
      // 2) 处理重叠：如果新delta的前缀与已有内容尾部重叠，则只追加非重叠部分
      const maxOverlap = Math.min(prevContent.length, delta.length);
      let overlap = 0;
      for (let k = maxOverlap; k > 0; k--) {
        if (prevContent.endsWith(delta.slice(0, k))) { overlap = k; break; }
      }
      const toAppend = delta.slice(overlap);
      if (toAppend) assistantMessage.content += toAppend;
      lastStreamDeltaByMessage.set(data.messageId, delta);
      scrollToBottom();
    });

    // Listen for search annotations (OpenRouter web search results)
    window.electronAPI.onMessageAnnotations((_event, data) => {
      if (!currentTab.value) return;
      
      const assistantMessage = currentTab.value.messages.find(m => m.id === data.messageId);
      if (!assistantMessage) return;

      // 保存搜索注释
      assistantMessage.searchAnnotations = data.annotations;
      saveTabsToStorage();
    });

    // 监听自动更新事件（强制更新遮罩层）
    try {
      (window as any).electronAPI?.onAutoUpdate?.((_e: any, payload: any) => {
        if (!payload || !payload.type) return;
        switch (payload.type) {
          case 'checking':
            forceUpdateState.value.status = 'checking';
            break;
          case 'available':
            forceUpdateState.value.status = 'available';
            forceUpdateState.value.required = !!payload?.meta?.force;
            forceUpdateState.value.notes = payload?.meta?.notes || forceUpdateState.value.notes;
            break;
          case 'progress':
            forceUpdateState.value.status = 'downloading';
            forceUpdateState.value.progress = Math.floor(payload?.progress?.percent || 0);
            break;
          case 'downloaded':
            forceUpdateState.value.status = 'downloaded';
            forceUpdateState.value.required = !!payload?.meta?.force;
            forceUpdateState.value.notes = payload?.meta?.notes || forceUpdateState.value.notes;
            break;
          case 'error':
            forceUpdateState.value.status = 'error';
            break;
        }
      });
    } catch {}
  };

  const addNewChat = () => {
    const newTabName = `chat-${Date.now()}`;
    const defaultProvider = providers.value.length > 0 ? providers.value[0].name : '';
         tabs.value.push({
       name: newTabName,
       title: `${t('sidebar.newChat')} ${tabs.value.length + 1}`,
       messages: [],
       provider: defaultProvider,
       model: '',
       models: [],
       systemPrompt: '',
       attachments: [],
       category: 'other',
       tags: [],
       lastActive: Date.now()
     });
    activeTab.value = newTabName;
    saveTabsToStorage();
    
    // 如果有默认provider，尝试加载模型
    if (defaultProvider) {
      nextTick(() => {
        fetchModels();
      });
    }
  };

  const removeTab = (tabName: string) => {
    const index = tabs.value.findIndex(tab => tab.name === tabName);
    if (index !== -1) {
      tabs.value.splice(index, 1);
      
      // 如果删除的是当前标签，切换到其他标签
      if (activeTab.value === tabName) {
        if (tabs.value.length > 0) {
          activeTab.value = tabs.value[Math.max(0, index - 1)].name;
        } else {
          // 如果没有标签了，创建一个新的
          addNewChat();
          return;
        }
      }
      
      saveTabsToStorage();
    }
  };

  // 供 MessageActions 调用
  // const deleteMessageById = (messageId: string) => {
  //   const tab = currentTab.value; if (!tab) return;
  //   const idx = tab.messages.findIndex(m => m.id === messageId);
  //   if (idx >= 0) {
  //     tab.messages.splice(idx, 1);
  //     saveTabsToStorage();
  //   }
  // };

  const handleTabChange = (tabName: string) => {
    activeTab.value = tabName;
    saveTabsToStorage();
  };

  const fetchModels = async () => {
    if (!currentTab.value) return;
    const provider = providers.value.find(p => p.name === currentTab.value!.provider);
    if (!provider) return;

    currentTab.value.models = [];
    currentTab.value.model = '';

    try {
      const models = await window.electronAPI.getModels(provider.name);
      // 如果没有拿到，尝试测试端点以方便提示
      if ((!models || models.length === 0)) {
        const probe = await window.electronAPI.testProvider(provider.name);
        if (!probe?.ok) {
          (window as any).ElMessage?.error?.(`模型列表获取失败：${probe?.message || 'Unknown'}`);
        }
      }
      currentTab.value.models = models;
      if (currentTab.value.models.length > 0) {
        currentTab.value.model = currentTab.value.models[0].id;
      }
      saveTabsToStorage();
    } catch (error) {
      handleError(
        createError.api(`Failed to fetch models for ${provider.name}`, 'fetchModels', `获取 ${provider.name} 模型列表失败`),
        'ChatStore'
      );
    }
  };

  // 创建消息的辅助函数，供 Mutation 和重试使用
  const createMessagePair = (enableWebSearch = false) => {
    if (!userInput.value.trim() || !currentTab.value) return null;
    if (!currentTab.value.provider || !currentTab.value.model) return null;

    const currentProvider = currentTab.value.provider;
    const currentModel = currentTab.value.model;

    const userMessage: Message = { 
      id: `msg-${Date.now()}`, 
      role: 'user', 
      content: userInput.value,
      timestamp: Date.now(),
      webSearchEnabled: enableWebSearch
    };

    // 本地渲染用：将图片附件作为富内容展示
    try {
      const atts = (currentTab.value.attachments || []);
      if (atts.length > 0) {
        const parts: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }> = [];
        if (userMessage.content) parts.push({ type: 'text', text: userMessage.content });
        for (const a of atts) {
          if (a.dataUrl && a.mime?.startsWith('image/')) {
            parts.push({ type: 'image_url', image_url: { url: a.dataUrl } });
          }
        }
        if (parts.length > 0) userMessage.richContent = parts;
        userMessage.attachmentsSnapshot = atts.map(a => ({
          id: a.id, name: a.name, mime: a.mime, size: a.size,
          dataUrl: a.dataUrl, textSnippet: a.textSnippet, fullText: a.fullText,
        }));
      }
    } catch {}

    const assistantMessage: Message = { 
      id: `msg-${Date.now() + 1}`, 
      role: 'assistant', 
      content: '',
      timestamp: Date.now(),
      model: currentModel,
      provider: currentProvider
    };

    return { userMessage, assistantMessage, currentProvider, currentModel };
  };

  // 准备发送消息的有效负载
  const prepareMessagePayload = async (userMessage: Message, assistantMessage: Message, enableWebSearch = false) => {
    if (!currentTab.value) return null;

    // 包含完整的对话历史（包括当前用户消息）
    const messagesToSend = currentTab.value.messages.map(({role, content}) => ({role, content} as { role: 'user' | 'assistant'; content: string }));
    if (currentTab.value.systemPrompt) {
        (messagesToSend as any).unshift({ role: 'system', content: currentTab.value.systemPrompt });
    }

    const attachmentsToSend = (currentTab.value.attachments || []).map(a => ({
      id: a.id, name: a.name, mime: a.mime, size: a.size,
      dataUrl: a.dataUrl, textSnippet: a.textSnippet, fullText: a.fullText,
    }));

    // 联网搜索处理
    if (enableWebSearch) {
      const q = userMessage.content.trim();
      const docs = await searchAndFetch(q, 8, {
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
        
        (messagesToSend as any).unshift({ role: 'system', content: `你现在有一个精确的直接答案可以使用：

**直接答案**：${directAnswerDoc.content}

**回答要求**：
- 直接使用这个答案回答用户的问题
- 保持答案的准确性和简洁性
- 在回答后标注［1］表示来源
- 不要添加额外的推测或补充信息

请现在直接回答用户的问题。` });
      } else {
        const curated = docs.map((d, i) => `［${i+1}］ ${d.title}\n${d.url}\n${(d.content||'').slice(0, 1200)}\n---`).join('\n');
        assistantMessage.citations = docs.map((d, i) => ({ index: i+1, title: d.title, url: d.url }));
        
        (messagesToSend as any).unshift({ role: 'system', content: `你现在有以下互联网搜索结果可以使用。请直接基于这些信息回答用户问题：

**搜索结果**：
${curated}

**回答要求**：
- 直接回答用户的问题，不要说"搜索结果有错误"或"信息不足"
- 从搜索结果中提取有用信息，即使信息不完整也要尽力回答
- 重要信息后标注来源编号，如［1］［2］等
- 如果是询问当前时间/日期，优先从搜索结果中找到相关时间信息
- 保持回答的实用性和有帮助性

请现在回答用户的问题。` });
      }
    }

    return { messagesToSend, attachmentsToSend };
  };

  // 保留原始 sendMessage 供向后兼容，但重构为调用新的辅助函数
  const sendMessage = async (enableWebSearch = false) => {
    // 预算预警
    try {
      const raw = localStorage.getItem('appSettings');
      const cfg = raw ? JSON.parse(raw) : {};
      const budget = Number(cfg.budgetToken || 0);
      const warnPct = Number(cfg.warnPercent || 80);
      if (budget > 0) {
        const used = totalUsage.value.total_tokens;
        const threshold = Math.floor((budget * warnPct) / 100);
        if (used >= threshold) {
          const key = `budgetWarn_${threshold}`;
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            (window as any).ElMessage?.warning?.(t('notifications.budgetWarn'));
          }
        }
      }
    } catch {}

    const messagePair = createMessagePair(enableWebSearch);
    if (!messagePair) return;

    const { userMessage, assistantMessage, currentProvider, currentModel } = messagePair;
    
    // 添加消息到当前对话
    currentTab.value!.messages.push(userMessage);
    userInput.value = '';
    scrollToBottom();
    currentTab.value!.messages.push(assistantMessage);

    try {
      const payload = await prepareMessagePayload(userMessage, assistantMessage, enableWebSearch);
      if (!payload) return;
      
      // 清空附件（发送时浮层马上消失）
      currentTab.value!.attachments = [];
      
      await window.electronAPI.sendMessage(
        currentProvider, 
        currentModel, 
        payload.messagesToSend, 
        userMessage.id, 
        assistantMessage.id, 
        payload.attachmentsToSend,
        enableWebSearch, // 联网搜索开关
        { search_context_size: 'medium' } // 搜索上下文大小
      );
    } catch (e: any) {
      const message = String(e?.message || '');
      if (/image input not supported/i.test(message)) {
        const tip = t('errors.imageNotSupported') || '当前模型不支持图像输入，请切换到支持多模态的模型，或移除图片后重试。';
        const assistant = currentTab.value!.messages.find(m => m.id === assistantMessage.id);
        if (assistant) assistant.content = tip;
        saveTabsToStorage();
        return;
      }
      throw e;
    }
  };

  const scrollToBottom = () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    });
  };

  const goToMessage = (messageId: string) => {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightedMessageId.value = messageId;

      // 2秒后清除高亮
    setTimeout(() => {
      highlightedMessageId.value = null;
    }, 2000);
    }
  };

  // Agent管理
  const openAgentSelector = () => { isAgentSelectorOpen.value = true; };
  const closeAgentSelector = () => { isAgentSelectorOpen.value = false; };
  
  const selectAgent = (agent: Agent) => {
    selectedAgent.value = agent;
    // 应用Agent的系统提示到当前对话
    if (currentTab.value) {
      currentTab.value.systemPrompt = agent.systemPrompt;
      saveTabsToStorage();
    }
    closeAgentSelector();
  };
  
  const resetAgent = () => {
    selectedAgent.value = null;
    if (currentTab.value) {
      currentTab.value.systemPrompt = '';
      saveTabsToStorage();
    }
  };

  // 工作空间相关方法
  const switchSpace = (spaceId: string) => {
    activeSpace.value = spaceId;
    const space = spaces.value.find(s => s.id === spaceId);
    if (space && space.tabs.length > 0) {
      // 切换到该空间的第一个标签
      const firstTab = tabs.value.find(t => t.name === space.tabs[0]);
      if (firstTab) {
        activeTab.value = firstTab.name;
        saveTabsToStorage();
      }
    }
  };

  const addTabToSpace = (tabName: string, spaceId: string) => {
    const space = spaces.value.find(s => s.id === spaceId);
    if (space && !space.tabs.includes(tabName)) {
      space.tabs.push(tabName);
      persistSpaces();
    }
  };

  const removeTabFromSpace = (tabName: string, spaceId: string) => {
    const space = spaces.value.find(s => s.id === spaceId);
    if (space) {
      space.tabs = space.tabs.filter(t => t !== tabName);
      persistSpaces();
    }
  };

  // 设置相关
  // const openSettings = () => { isSettingsOpen.value = true; };
  // const closeSettings = () => { isSettingsOpen.value = false; };

  // 全局暴露store给快捷键使用
  const storeInstance = {
    providers,
    tabs,
    activeTab,
    userInput,
    messagesContainer,
    searchQuery,
    searchResults,
    highlightedMessageId,
    agents,
    isAgentSelectorOpen,
    selectedAgent,
    spaces,
    activeSpace,
    isSettingsOpen,
    isUserProfileOpen,
    isSidebarCollapsed,
         isStatsOpen,
     isKnowledgeOpen,
     isPromptsOpen,
     isPluginsOpen,
     isHistorySearchOpen,
     isImageGenerationOpen,
     forceUpdateState,
     isUpdateOverlayVisible,
     user,
     userAvatar,
     userInitial,
     statsLedger,
     currencySettings,
     currentTab,
     totalUsage,
     currentSpace,
     spaceFilteredTabs,
     setUser,
     setUserAvatar,
     removeUserAvatar,
     openUserProfile,
     closeUserProfile,
     toggleSidebar,
     toggleStats,
     toggleKnowledge,
     openPrompts,
     closePrompts,
     openPlugins,
     closePlugins,
     openHistorySearch,
     closeHistorySearch,
     openImageGeneration,
     closeImageGeneration,
    clearStats,
    setCurrencySettings,
    getStatsInRange,
    aggregateByModel,
    loadProviders,
    loadInitialData,
    addNewChat,
    removeTab,
    handleTabChange,
    fetchModels,
    sendMessage,
    createMessagePair,
    prepareMessagePayload,
    scrollToBottom,
    goToMessage,
    openAgentSelector,
    closeAgentSelector,
    selectAgent,
    resetAgent,
    switchSpace,
    addTabToSpace,
    removeTabFromSpace,
    persistState,
    saveTabsToStorage
  };

  // 全局暴露store给快捷键使用
  (window as any).__CHAT_STORE__ = storeInstance;

  return storeInstance;
});

// 默认智能助手 - 基于提示词转换的专业Agent系统
function getDefaultAgents(): Agent[] {
  return [
    {
      id: 'general-assistant',
      name: '通用AI助手',
      avatar: '🤖',
      description: '专业、友好、高效的全能AI助手，能够处理各种日常问题和任务。',
      category: 'general',
      systemPrompt: `你是一个专业、友好、高效的AI助手。请遵循以下原则：

1. **专业性**：提供准确、有依据的信息
2. **友好性**：保持礼貌、耐心、积极的语调
3. **高效性**：直接回答问题，避免冗余
4. **适应性**：根据用户需求调整回答风格和深度
5. **安全性**：不提供有害、违法或不当内容

请用简洁明了的中文回答，必要时提供具体的例子或步骤。`,
      capabilities: ['问答咨询', '任务规划', '信息整理', '学习辅导', '生活建议'],
      modelRecommendation: 'moonshot',
      examples: [
        '帮我制定一个学习计划',
        '解释一下区块链的基本概念',
        '推荐几本好看的科幻小说'
      ],
      isActive: true
    },
    {
      id: 'senior-developer',
      name: '高级软件工程师',
      avatar: '💻',
      description: '经验丰富的全栈开发专家，精通多种编程语言和技术栈。',
      category: 'programming',
      systemPrompt: `你是一位经验丰富的高级软件工程师，具备以下特质：

**技术能力**：
- 精通多种编程语言（Python、JavaScript、Java、Go、Rust等）
- 熟悉前端、后端、移动端、云原生技术栈
- 深入理解系统架构、数据库设计、性能优化

**工作方式**：
- 代码必须符合最佳实践和编码规范
- 优先考虑代码可读性、可维护性、可扩展性
- 提供完整的错误处理和边界情况考虑
- 包含必要的注释和文档说明

**回答格式**：
1. 简要分析问题
2. 提供最优解决方案
3. 展示完整代码实现
4. 解释关键技术点
5. 给出测试建议

请用专业的技术语言回答，确保代码质量达到生产环境标准。`,
      capabilities: ['代码开发', '架构设计', '性能优化', '技术选型', '代码重构'],
      modelRecommendation: 'deepseek',
      examples: [
        '帮我设计一个用户认证系统',
        '优化这个SQL查询的性能',
        '实现一个RESTful API'
      ],
      isActive: true
    },
    {
      id: 'code-reviewer',
      name: '代码审查专家',
      avatar: '🔍',
      description: '资深代码审查专家，提供专业的代码质量评估和改进建议。',
      category: 'programming',
      systemPrompt: `你是一位资深的代码审查专家，负责提供专业的代码质量评估。

**审查维度**：
1. **功能性**：代码是否正确实现需求
2. **可读性**：命名、结构、注释是否清晰
3. **性能**：是否存在性能瓶颈或优化空间
4. **安全性**：是否存在安全漏洞或风险
5. **可维护性**：代码结构是否易于维护和扩展
6. **测试性**：代码是否易于测试，测试覆盖是否充分

**审查格式**：
✅ **优点**：列出代码的亮点
⚠️ **改进建议**：提供具体的改进方案
🚨 **安全问题**：指出潜在的安全风险
🔧 **重构建议**：提供代码重构的方向

请提供建设性的反馈，帮助开发者提升代码质量。`,
      capabilities: ['代码审查', '质量评估', '安全检查', '性能分析', '重构建议'],
      modelRecommendation: 'zhipu',
      examples: [
        '审查这段Python代码',
        '检查API接口的安全性',
        '评估数据库查询性能'
      ],
      isActive: true
    },
    {
      id: 'ui-ux-designer',
      name: 'UI/UX设计师',
      avatar: '🎨',
      description: '专业的用户界面和用户体验设计师，精通现代设计理念。',
      category: 'design',
      systemPrompt: `你是一位专业的UI/UX设计师，具备以下能力：

**设计理念**：
- 用户中心设计思维
- 简洁优雅的视觉风格
- 注重可用性和可访问性
- 响应式设计原则

**专业技能**：
- 用户体验研究和分析
- 界面设计和原型制作
- 交互设计和动效设计
- 设计系统构建

**工作流程**：
1. 理解用户需求和业务目标
2. 分析竞品和设计趋势
3. 创建用户流程和线框图
4. 设计高保真原型
5. 测试和迭代优化

请提供专业的设计建议，注重用户体验和视觉美感的平衡。`,
      capabilities: ['界面设计', '用户研究', '原型制作', '交互设计', '设计系统'],
      modelRecommendation: 'siliconflow',
      examples: [
        '设计一个移动App的登录界面',
        '改进网站的用户导航体验',
        '制定设计系统的颜色规范'
      ],
      isActive: true
    },
    {
      id: 'data-analyst',
      name: '数据分析师',
      avatar: '📊',
      description: '专业的数据分析专家，擅长数据挖掘和商业智能分析。',
      category: 'data',
      systemPrompt: `你是一位专业的数据分析师，具备以下能力：

**分析技能**：
- 数据清洗和预处理
- 统计分析和假设检验
- 数据可视化和报告
- 机器学习和预测建模

**工具掌握**：
- Python (pandas, numpy, scikit-learn)
- R语言统计分析
- SQL数据库查询
- Tableau/Power BI可视化

**分析流程**：
1. 理解业务问题和目标
2. 数据收集和质量评估
3. 探索性数据分析
4. 建立分析模型
5. 结果解释和建议

请提供基于数据的洞察和建议，确保分析结果的准确性和实用性。`,
      capabilities: ['数据分析', '统计建模', '数据可视化', '商业洞察', '预测分析'],
      modelRecommendation: '302ai',
      examples: [
        '分析销售数据的趋势',
        '建立用户流失预测模型',
        '制作数据分析报告'
      ],
      isActive: true
    },
    {
      id: 'content-writer',
      name: '内容创作专家',
      avatar: '✍️',
      description: '专业的内容创作者，擅长各种文体写作和营销文案。',
      category: 'writing',
      systemPrompt: `你是一位专业的内容创作专家，具备以下能力：

**写作技能**：
- 各种文体创作（新闻、营销、技术文档等）
- SEO优化写作
- 品牌调性把握
- 多平台内容适配

**创作原则**：
- 目标受众导向
- 信息价值最大化
- 可读性和吸引力并重
- 原创性和准确性

**服务范围**：
- 营销文案和广告创意
- 技术文档和使用说明
- 社交媒体内容
- 博客文章和新闻稿
- 品牌故事和产品介绍

请根据具体需求调整写作风格和语调，确保内容的专业性和吸引力。`,
      capabilities: ['文案写作', '内容策划', 'SEO优化', '品牌文案', '技术写作'],
      modelRecommendation: 'moonshot',
      examples: [
        '写一篇产品发布的新闻稿',
        '创作社交媒体营销文案',
        '撰写用户使用手册'
      ],
      isActive: true
    }
  ];
}

// 默认工作空间
const getDefaultSpaces = (): WorkSpace[] => {
  return [
    {
      id: 'ai-assistant',
      name: 'AI助手空间',
      color: 'purple',
      shortcut: '⌘1',
      systemPrompt: '你是一个全能的AI助手，能够帮助用户解决各种问题。',
      tabs: []
    },
    {
      id: 'programming',
      name: '编程助手',
      color: 'red',
      shortcut: '⌘2',
      systemPrompt: '你是一个专业的编程助手，精通各种编程语言和开发技术，能够提供代码建议、调试帮助和最佳实践指导。',
      tabs: []
    },
    {
      id: 'learning',
      name: '学习空间',
      color: 'blue',
      shortcut: '⌘3',
      systemPrompt: '你是一个学习导师，能够帮助用户理解复杂概念，提供学习建议，制定学习计划。',
      tabs: []
    }
  ];
}