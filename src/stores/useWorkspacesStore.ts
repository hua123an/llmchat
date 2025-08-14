import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Workspace, WorkspaceId, TabId, createWorkspaceId, WorkspaceColor } from '../types';
import { inject, SERVICE_TOKENS } from '../services/container';
import { IEventService, IStorageService } from '../types/services';

export const useWorkspacesStore = defineStore('workspaces', () => {
  // 注入服务
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
  const storageService = inject<IStorageService>(SERVICE_TOKENS.STORAGE_SERVICE);

  // 状态
  const workspaces = ref<Workspace[]>([]);
  const activeWorkspaceId = ref<WorkspaceId | null>(null);

  // 计算属性
  const activeWorkspace = computed(() => {
    return workspaces.value.find(ws => ws.id === activeWorkspaceId.value) || null;
  });

  const workspaceCount = computed(() => workspaces.value.length);

  const getWorkspaceById = computed(() => (id: WorkspaceId) => {
    return workspaces.value.find(ws => ws.id === id) || null;
  });

  const getWorkspacesByColor = computed(() => (color: WorkspaceColor) => {
    return workspaces.value.filter(ws => ws.color === color);
  });

  // 动作
  const createWorkspace = (options: {
    name: string;
    color: WorkspaceColor;
    shortcut?: string;
    systemPrompt?: string;
  }): WorkspaceId => {
    const workspaceId = createWorkspaceId(`workspace-${Date.now()}`);
    const newWorkspace: Workspace = {
      id: workspaceId,
      name: options.name,
      color: options.color,
      shortcut: options.shortcut || '',
      systemPrompt: options.systemPrompt || '',
      tabs: [],
    };

    workspaces.value.push(newWorkspace);
    
    eventService.emit('workspace:created', { workspace: newWorkspace });
    saveWorkspaces();
    
    return workspaceId;
  };

  const updateWorkspace = (id: WorkspaceId, updates: Partial<Omit<Workspace, 'id'>>) => {
    const workspace = workspaces.value.find(ws => ws.id === id);
    if (workspace) {
      Object.assign(workspace, updates);
      eventService.emit('workspace:updated', { workspaceId: id, updates });
      saveWorkspaces();
    }
  };

  const removeWorkspace = (id: WorkspaceId) => {
    const index = workspaces.value.findIndex(ws => ws.id === id);
    if (index === -1) return;

    const removedWorkspace = workspaces.value[index];
    workspaces.value.splice(index, 1);

    // 如果删除的是当前工作空间，切换到其他工作空间
    if (activeWorkspaceId.value === id) {
      if (workspaces.value.length > 0) {
        activeWorkspaceId.value = workspaces.value[0].id;
      } else {
        activeWorkspaceId.value = null;
      }
    }

    eventService.emit('workspace:removed', { workspace: removedWorkspace });
    saveWorkspaces();
  };

  const setActiveWorkspace = (id: WorkspaceId) => {
    if (workspaces.value.some(ws => ws.id === id)) {
      activeWorkspaceId.value = id;
      eventService.emit('workspace:activated', { workspaceId: id });
      saveWorkspaces();
    }
  };

  const addTabToWorkspace = (workspaceId: WorkspaceId, tabId: TabId) => {
    const workspace = workspaces.value.find(ws => ws.id === workspaceId);
    if (workspace && !workspace.tabs.includes(tabId)) {
      workspace.tabs.push(tabId);
      eventService.emit('workspace:tab_added', { workspaceId, tabId });
      saveWorkspaces();
    }
  };

  const removeTabFromWorkspace = (workspaceId: WorkspaceId, tabId: TabId) => {
    const workspace = workspaces.value.find(ws => ws.id === workspaceId);
    if (workspace) {
      const index = workspace.tabs.indexOf(tabId);
      if (index !== -1) {
        workspace.tabs.splice(index, 1);
        eventService.emit('workspace:tab_removed', { workspaceId, tabId });
        saveWorkspaces();
      }
    }
  };

  const moveTabBetweenWorkspaces = (tabId: TabId, fromWorkspaceId: WorkspaceId, toWorkspaceId: WorkspaceId) => {
    removeTabFromWorkspace(fromWorkspaceId, tabId);
    addTabToWorkspace(toWorkspaceId, tabId);
    
    eventService.emit('workspace:tab_moved', { 
      tabId, 
      fromWorkspaceId, 
      toWorkspaceId 
    });
  };

  const duplicateWorkspace = (id: WorkspaceId): WorkspaceId | null => {
    const sourceWorkspace = workspaces.value.find(ws => ws.id === id);
    if (!sourceWorkspace) return null;

    const newWorkspaceId = createWorkspace({
      name: `${sourceWorkspace.name} (副本)`,
      color: sourceWorkspace.color,
      shortcut: '',
      systemPrompt: sourceWorkspace.systemPrompt,
    });

    // 不复制标签，只复制配置
    return newWorkspaceId;
  };

  const reorderWorkspaces = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= workspaces.value.length || 
        toIndex < 0 || toIndex >= workspaces.value.length) {
      return;
    }

    const workspace = workspaces.value.splice(fromIndex, 1)[0];
    workspaces.value.splice(toIndex, 0, workspace);

    eventService.emit('workspace:reordered', { fromIndex, toIndex, workspace });
    saveWorkspaces();
  };

  const getFilteredTabs = (workspaceId: WorkspaceId, allTabs: Array<{ id: TabId; name: string }>) => {
    const workspace = workspaces.value.find(ws => ws.id === workspaceId);
    if (!workspace) return [];

    return allTabs.filter(tab => workspace.tabs.includes(tab.id));
  };

  // 持久化方法
  const saveWorkspaces = async () => {
    try {
      await storageService.saveWorkspaces(workspaces.value);
    } catch (error) {
      console.error('Failed to save workspaces:', error);
      eventService.emit('workspaces:save_failed', { error: error as Error });
    }
  };

  const loadWorkspaces = async () => {
    try {
      const savedWorkspaces = await storageService.loadWorkspaces();
      
      if (savedWorkspaces.length > 0) {
        workspaces.value = savedWorkspaces;
        
        // 设置默认活动工作空间
        if (!activeWorkspaceId.value && workspaces.value.length > 0) {
          activeWorkspaceId.value = workspaces.value[0].id;
        }
      } else {
        // 创建默认工作空间
        initializeDefaultWorkspaces();
      }

      eventService.emit('workspaces:loaded', { workspaces: workspaces.value });
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      // 加载失败，创建默认工作空间
      initializeDefaultWorkspaces();
      eventService.emit('workspaces:load_failed', { error: error as Error });
    }
  };

  const initializeDefaultWorkspaces = () => {
    const defaultWorkspaces = [
      {
        name: 'AI助手空间',
        color: 'purple' as WorkspaceColor,
        shortcut: '⌘1',
        systemPrompt: '你是一个全能的AI助手，能够帮助用户解决各种问题。',
      },
      {
        name: '编程助手',
        color: 'red' as WorkspaceColor,
        shortcut: '⌘2',
        systemPrompt: '你是一个专业的编程助手，精通各种编程语言和开发技术。',
      },
      {
        name: '学习空间',
        color: 'blue' as WorkspaceColor,
        shortcut: '⌘3',
        systemPrompt: '你是一个学习导师，能够帮助用户理解复杂概念。',
      },
    ];

    defaultWorkspaces.forEach(ws => {
      const id = createWorkspace(ws);
      if (!activeWorkspaceId.value) {
        activeWorkspaceId.value = id;
      }
    });
  };

  const exportWorkspaces = () => {
    return JSON.stringify(workspaces.value, null, 2);
  };

  const importWorkspaces = (data: string, merge = false) => {
    try {
      const importedWorkspaces: Workspace[] = JSON.parse(data);
      
      // 验证数据格式
      const validWorkspaces = importedWorkspaces.filter(ws => 
        ws.id && ws.name && ws.color
      );

      if (!merge) {
        workspaces.value = validWorkspaces;
      } else {
        // 合并模式：避免ID冲突
        validWorkspaces.forEach(ws => {
          const existingIds = workspaces.value.map(w => w.id);
          if (!existingIds.includes(ws.id)) {
            workspaces.value.push(ws);
          }
        });
      }

      saveWorkspaces();
      
      eventService.emit('workspaces:imported', { 
        count: validWorkspaces.length,
        merge 
      });

    } catch (error) {
      eventService.emit('workspaces:import_failed', { error: error as Error });
      throw error;
    }
  };

  const clearAllWorkspaces = () => {
    const oldWorkspaces = [...workspaces.value];
    workspaces.value = [];
    activeWorkspaceId.value = null;

    eventService.emit('workspaces:cleared', { oldWorkspaces });
    saveWorkspaces();
  };

  return {
    // 状态
    workspaces,
    activeWorkspaceId,

    // 计算属性
    activeWorkspace,
    workspaceCount,
    getWorkspaceById,
    getWorkspacesByColor,

    // 动作
    createWorkspace,
    updateWorkspace,
    removeWorkspace,
    setActiveWorkspace,
    addTabToWorkspace,
    removeTabFromWorkspace,
    moveTabBetweenWorkspaces,
    duplicateWorkspace,
    reorderWorkspaces,
    getFilteredTabs,
    loadWorkspaces,
    exportWorkspaces,
    importWorkspaces,
    clearAllWorkspaces,
  };
});
