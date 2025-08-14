import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ChatTab, TabId, createTabId } from '../types';
import { inject, SERVICE_TOKENS } from '../services/container';
import { IEventService, IStorageService } from '../types/services';
import { useMessagesStore } from './useMessagesStore';

export const useTabsStore = defineStore('tabs', () => {
  // 注入服务
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
  const storageService = inject<IStorageService>(SERVICE_TOKENS.STORAGE_SERVICE);
  const messagesStore = useMessagesStore();

  // 状态
  const tabs = ref<ChatTab[]>([]);
  const activeTabId = ref<TabId | null>(null);

  // 计算属性
  const activeTab = computed(() => {
    return tabs.value.find(tab => tab.id === activeTabId.value) || null;
  });

  const tabCount = computed(() => tabs.value.length);

  const hasUnsavedChanges = computed(() => {
    return tabs.value.some(tab => {
      const messages = messagesStore.getMessages(tab.id);
      return messages.length > 0;
    });
  });

  // 动作
  const createTab = (options?: Partial<ChatTab>): TabId => {
    const tabId = createTabId(`chat-${Date.now()}`);
    const newTab: ChatTab = {
      id: tabId,
      name: `chat-${Date.now()}`,
      title: options?.title || `新对话 ${tabs.value.length + 1}`,
      messages: [],
      provider: options?.provider || '',
      model: options?.model || '',
      models: options?.models || [],
      systemPrompt: options?.systemPrompt || '',
      attachments: options?.attachments || [],
      ...options
    };

    tabs.value.push(newTab);
    activeTabId.value = tabId;

    eventService.emit('tab:created', { tab: newTab });
    saveTabs();
    
    return tabId;
  };

  const removeTab = (tabId: TabId) => {
    const index = tabs.value.findIndex(tab => tab.id === tabId);
    if (index === -1) return;

    const removedTab = tabs.value[index];
    tabs.value.splice(index, 1);

    // 清理相关消息
    messagesStore.clearMessages(tabId);

    // 如果删除的是当前标签，切换到其他标签
    if (activeTabId.value === tabId) {
      if (tabs.value.length > 0) {
        activeTabId.value = tabs.value[Math.max(0, index - 1)].id;
      } else {
        // 如果没有标签了，创建一个新的
        createTab();
        return;
      }
    }

    eventService.emit('tab:removed', { tab: removedTab });
    saveTabs();
  };

  const updateTab = (tabId: TabId, updates: Partial<ChatTab>) => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab) {
      Object.assign(tab, updates);
      eventService.emit('tab:updated', { tabId, updates });
      saveTabs();
    }
  };

  const setActiveTab = (tabId: TabId) => {
    if (tabs.value.some(tab => tab.id === tabId)) {
      activeTabId.value = tabId;
      eventService.emit('tab:activated', { tabId });
      saveTabs();
    }
  };

  const duplicateTab = (tabId: TabId): TabId | null => {
    const sourceTab = tabs.value.find(tab => tab.id === tabId);
    if (!sourceTab) return null;

    const newTabId = createTab({
      title: `${sourceTab.title} (副本)`,
      provider: sourceTab.provider,
      model: sourceTab.model,
      models: sourceTab.models,
      systemPrompt: sourceTab.systemPrompt,
    });

    // 复制消息
    const sourceMessages = messagesStore.getMessages(tabId);
    messagesStore.setMessagesForTab(newTabId, [...sourceMessages]);

    return newTabId;
  };

  const moveTab = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= tabs.value.length || 
        toIndex < 0 || toIndex >= tabs.value.length) {
      return;
    }

    const tab = tabs.value.splice(fromIndex, 1)[0];
    tabs.value.splice(toIndex, 0, tab);

    eventService.emit('tab:moved', { fromIndex, toIndex, tab });
    saveTabs();
  };

  const saveTabs = async () => {
    try {
      await storageService.saveTabs(tabs.value);
    } catch (error) {
      console.error('Failed to save tabs:', error);
      eventService.emit('tabs:save_failed', { error: error as Error });
    }
  };

  const loadTabs = async () => {
    try {
      const loadedTabs = await storageService.loadTabs();
      if (loadedTabs.length > 0) {
        tabs.value = loadedTabs;
        
        // 设置活动标签
        const savedActiveTab = localStorage.getItem('activeTab');
        if (savedActiveTab && tabs.value.some(t => t.name === savedActiveTab)) {
          const tab = tabs.value.find(t => t.name === savedActiveTab);
          if (tab) activeTabId.value = tab.id;
        } else if (tabs.value.length > 0) {
          activeTabId.value = tabs.value[0].id;
        }

        // 加载每个标签的消息
        for (const tab of tabs.value) {
          messagesStore.setMessagesForTab(tab.id, tab.messages || []);
        }
      } else {
        // 没有保存的标签，创建默认标签
        createTab();
      }

      eventService.emit('tabs:loaded', { tabs: tabs.value });
    } catch (error) {
      console.error('Failed to load tabs:', error);
      // 加载失败，创建默认标签
      createTab();
      eventService.emit('tabs:load_failed', { error: error as Error });
    }
  };

  const clearAllTabs = () => {
    const oldTabs = [...tabs.value];
    tabs.value = [];
    activeTabId.value = null;

    // 清理所有消息
    oldTabs.forEach(tab => messagesStore.clearMessages(tab.id));

    eventService.emit('tabs:cleared', { oldTabs });
    saveTabs();
  };

  return {
    // 状态
    tabs,
    activeTabId,

    // 计算属性
    activeTab,
    tabCount,
    hasUnsavedChanges,

    // 动作
    createTab,
    removeTab,
    updateTab,
    setActiveTab,
    duplicateTab,
    moveTab,
    saveTabs,
    loadTabs,
    clearAllTabs,
  };
});
