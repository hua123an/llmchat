import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { createError, handleError } from '../utils/errorHandler';

// 基础数据接口
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatTab {
  name: string;
  messages: Message[];
  provider: string;
  model: string;
  systemPrompt: string;
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

  // Actions
  const loadInitialData = async () => {
    try {
      providers.value = await window.electronAPI.getProviders();
    } catch (error) {
      handleError(
        createError.api('Failed to load providers', 'loadInitialData', '加载服务商列表失败'),
        'ChatStore'
      );
    }

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
  };

  const addNewChat = () => {
    const newTabName = `chat-${Date.now()}`;
    tabs.value.push({
      name: newTabName,
      messages: [],
      provider: '',
      model: '',
      systemPrompt: ''
    });
    activeTab.value = newTabName;
    saveTabsToStorage();
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

  const handleTabChange = (tabName: string) => {
    activeTab.value = tabName;
    saveTabsToStorage();
  };

  const fetchModels = async () => {
    const tab = currentTab.value;
    if (!tab) return;
    const provider = providers.value.find(p => p.name === tab.provider);
    if (!provider) return;

    try {
      const models = await window.electronAPI.getModels(provider.name);
      provider.models = models;
    } catch (error) {
      handleError(
        createError.api(`Failed to fetch models for ${provider.name}`, 'fetchModels', `获取 ${provider.name} 模型列表失败`),
        'ChatStore'
      );
    }
  };

  const sendMessage = async (messageContent: string) => {
    if (!currentTab.value || !currentTab.value.provider || !currentTab.value.model) {
      return;
    }

    // 生成消息ID
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now() + 1}`;

    // 添加用户消息
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: messageContent,
      timestamp: Date.now()
    };
    currentTab.value.messages.push(userMessage);

    // 添加空的助手消息
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    currentTab.value.messages.push(assistantMessage);

    // 构建消息历史（包含完整的对话历史，包括当前用户消息）
    const systemMessage = currentTab.value.systemPrompt ? [{ role: 'system', content: currentTab.value.systemPrompt }] : [];
    const messagesToSend = [
      ...systemMessage,
      ...currentTab.value.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    saveTabsToStorage();

    try {
      await window.electronAPI.sendMessage(currentTab.value.provider, currentTab.value.model, messagesToSend, userMessage.id, assistantMessage.id, undefined, false, { search_context_size: 'medium' });
    } catch (error) {
      handleError(
        createError.api('Failed to send message', 'sendMessage', '发送消息失败'),
        'ChatStore'
      );
    }
  };

  const scrollToBottom = () => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
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
    currentTab,
    totalUsage,
    currentSpace,
    spaceFilteredTabs,
    loadInitialData,
    addNewChat,
    removeTab,
    handleTabChange,
    fetchModels,
    sendMessage,
    scrollToBottom,
    goToMessage,
    openAgentSelector,
    closeAgentSelector,
    selectAgent,
    resetAgent,
    switchSpace,
    addTabToSpace,
    removeTabFromSpace,
    persistState
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
      id: 'ui-ux-expert',
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