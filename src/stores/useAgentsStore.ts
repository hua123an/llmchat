import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Agent, AgentId, createAgentId, AgentCategory } from '../types';
import { inject, SERVICE_TOKENS } from '../services/container';
import { IEventService, IStorageService } from '../types/services';

export const useAgentsStore = defineStore('agents', () => {
  // 注入服务
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
  const storageService = inject<IStorageService>(SERVICE_TOKENS.STORAGE_SERVICE);

  // 状态
  const agents = ref<Agent[]>([]);
  const selectedAgent = ref<Agent | null>(null);
  const isAgentSelectorOpen = ref(false);

  // 计算属性
  const activeAgents = computed(() => {
    return agents.value.filter(agent => agent.isActive);
  });

  const agentsByCategory = computed(() => {
    const grouped = new Map<AgentCategory, Agent[]>();
    
    agents.value.forEach(agent => {
      const category = agent.category as AgentCategory;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(agent);
    });

    return grouped;
  });

  const getAgentById = computed(() => (id: AgentId) => {
    return agents.value.find(agent => agent.id === id) || null;
  });

  const recommendedAgents = computed(() => {
    return agents.value.filter(agent => agent.isActive).slice(0, 6);
  });

  // 动作
  const createAgent = (agentData: Omit<Agent, 'id'>): AgentId => {
    const agentId = createAgentId(`agent-${Date.now()}`);
    const newAgent: Agent = {
      id: agentId,
      ...agentData,
    };

    agents.value.push(newAgent);
    
    eventService.emit('agent:created', { agent: newAgent });
    saveAgents();
    
    return agentId;
  };

  const updateAgent = (id: AgentId, updates: Partial<Omit<Agent, 'id'>>) => {
    const agent = agents.value.find(a => a.id === id);
    if (agent) {
      Object.assign(agent, updates);
      eventService.emit('agent:updated', { agentId: id, updates });
      saveAgents();
    }
  };

  const removeAgent = (id: AgentId) => {
    const index = agents.value.findIndex(agent => agent.id === id);
    if (index === -1) return;

    const removedAgent = agents.value[index];
    agents.value.splice(index, 1);

    // 如果删除的是当前选中的agent，清除选择
    if (selectedAgent.value?.id === id) {
      selectedAgent.value = null;
    }

    eventService.emit('agent:removed', { agent: removedAgent });
    saveAgents();
  };

  const selectAgent = (agent: Agent) => {
    selectedAgent.value = agent;
    closeAgentSelector();
    eventService.emit('agent:selected', { agent });
  };

  const resetAgent = () => {
    selectedAgent.value = null;
    eventService.emit('agent:reset', {});
  };

  const toggleAgentActive = (id: AgentId) => {
    const agent = agents.value.find(a => a.id === id);
    if (agent) {
      agent.isActive = !agent.isActive;
      eventService.emit('agent:toggled', { agentId: id, isActive: agent.isActive });
      saveAgents();
    }
  };

  const duplicateAgent = (id: AgentId): AgentId | null => {
    const sourceAgent = agents.value.find(a => a.id === id);
    if (!sourceAgent) return null;

    const newAgentId = createAgent({
      ...sourceAgent,
      name: `${sourceAgent.name} (副本)`,
      id: undefined as any, // 会被createAgent重新分配
    });

    return newAgentId;
  };

  const reorderAgents = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= agents.value.length || 
        toIndex < 0 || toIndex >= agents.value.length) {
      return;
    }

    const agent = agents.value.splice(fromIndex, 1)[0];
    agents.value.splice(toIndex, 0, agent);

    eventService.emit('agents:reordered', { fromIndex, toIndex, agent });
    saveAgents();
  };

  const searchAgents = (query: string, category?: AgentCategory) => {
    const lowerQuery = query.toLowerCase();
    
    return agents.value.filter(agent => {
      const matchesQuery = !query || 
        agent.name.toLowerCase().includes(lowerQuery) ||
        agent.description.toLowerCase().includes(lowerQuery) ||
        agent.capabilities.some(cap => cap.toLowerCase().includes(lowerQuery));
      
      const matchesCategory = !category || agent.category === category;
      
      return matchesQuery && matchesCategory && agent.isActive;
    });
  };

  // Agent选择器控制
  const openAgentSelector = () => {
    isAgentSelectorOpen.value = true;
    eventService.emit('agent_selector:opened', {});
  };

  const closeAgentSelector = () => {
    isAgentSelectorOpen.value = false;
    eventService.emit('agent_selector:closed', {});
  };

  // 持久化方法
  const saveAgents = async () => {
    try {
      await storageService.saveAgents(agents.value);
    } catch (error) {
      console.error('Failed to save agents:', error);
      eventService.emit('agents:save_failed', { error: error as Error });
    }
  };

  const loadAgents = async () => {
    try {
      const savedAgents = await storageService.loadAgents();
      
      if (savedAgents.length > 0) {
        agents.value = savedAgents;
      } else {
        // 创建默认agents
        initializeDefaultAgents();
      }

      eventService.emit('agents:loaded', { agents: agents.value });
    } catch (error) {
      console.error('Failed to load agents:', error);
      // 加载失败，创建默认agents
      initializeDefaultAgents();
      eventService.emit('agents:load_failed', { error: error as Error });
    }
  };

  const initializeDefaultAgents = () => {
    const defaultAgents = [
      {
        name: '通用AI助手',
        avatar: '🤖',
        description: '专业、友好、高效的全能AI助手',
        category: 'general' as AgentCategory,
        systemPrompt: '你是一个专业、友好、高效的AI助手。',
        capabilities: ['问答咨询', '任务规划', '信息整理'],
        examples: ['帮我制定学习计划', '解释区块链概念'],
        isActive: true,
      },
      {
        name: '高级软件工程师',
        avatar: '💻',
        description: '经验丰富的全栈开发专家',
        category: 'programming' as AgentCategory,
        systemPrompt: '你是一位经验丰富的高级软件工程师。',
        capabilities: ['代码开发', '架构设计', '性能优化'],
        examples: ['设计用户认证系统', '优化SQL查询'],
        isActive: true,
      },
      {
        name: 'UI/UX设计师',
        avatar: '🎨',
        description: '专业的用户界面和用户体验设计师',
        category: 'design' as AgentCategory,
        systemPrompt: '你是一位专业的UI/UX设计师。',
        capabilities: ['界面设计', '用户研究', '原型制作'],
        examples: ['设计移动App界面', '改进用户导航'],
        isActive: true,
      },
    ];

    defaultAgents.forEach(agentData => {
      createAgent(agentData);
    });
  };

  const exportAgents = () => {
    return JSON.stringify(agents.value, null, 2);
  };

  const importAgents = (data: string, merge = false) => {
    try {
      const importedAgents: Agent[] = JSON.parse(data);
      
      // 验证数据格式
      const validAgents = importedAgents.filter(agent => 
        agent.name && agent.description && agent.category
      );

      if (!merge) {
        agents.value = validAgents;
      } else {
        // 合并模式：避免重复
        validAgents.forEach(agent => {
          const existingNames = agents.value.map(a => a.name);
          if (!existingNames.includes(agent.name)) {
            agents.value.push(agent);
          }
        });
      }

      saveAgents();
      
      eventService.emit('agents:imported', { 
        count: validAgents.length,
        merge 
      });

    } catch (error) {
      eventService.emit('agents:import_failed', { error: error as Error });
      throw error;
    }
  };

  const clearAllAgents = () => {
    const oldAgents = [...agents.value];
    agents.value = [];
    selectedAgent.value = null;

    eventService.emit('agents:cleared', { oldAgents });
    saveAgents();
  };

  return {
    // 状态
    agents,
    selectedAgent,
    isAgentSelectorOpen,

    // 计算属性
    activeAgents,
    agentsByCategory,
    getAgentById,
    recommendedAgents,

    // 动作
    createAgent,
    updateAgent,
    removeAgent,
    selectAgent,
    resetAgent,
    toggleAgentActive,
    duplicateAgent,
    reorderAgents,
    searchAgents,
    openAgentSelector,
    closeAgentSelector,
    loadAgents,
    exportAgents,
    importAgents,
    clearAllAgents,
  };
});
