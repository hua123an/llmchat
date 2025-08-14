<template>
  <ResponsiveContainer 
    id="app" 
    class="app-container" 
    :class="{ 
      'sidebar-collapsed': preferences.sidebarCollapsed,
      [`breakpoint-${currentBreakpoint}`]: true,
      [`device-${deviceType}`]: true,
      'is-mobile': responsiveState.isMobile,
      'is-tablet': responsiveState.isTablet,
      'is-desktop': responsiveState.isDesktop,
      'is-touch': responsiveState.isTouch
    }"
    tag="div"
    :fluid="true"
    :gutter="false"
    :touch="responsiveState.isTouch"
  >
    <!-- 侧边栏 -->
    <Sidebar 
      v-if="!preferences.sidebarCollapsed"
      :workspaces="workspaces"
      :active-workspace="activeWorkspace"
      :tabs="tabs"
      :active-tab="activeTab"
      @workspace-select="setActiveWorkspace"
      @tab-select="setActiveTab"
      @tab-create="createNewTab"
      @tab-close="closeTab"
      @workspace-create="openWorkspaceDialog"
    />

    <!-- 主内容区域 -->
    <main class="main-content">
      <!-- 聊天标题栏 -->
      <ChatHeader
        v-if="activeTab"
        :tab="activeTab"
        :is-generating="isGenerating"
        :total-usage="totalUsage"
        @settings="openSettings"
        @toggle-sidebar="toggleSidebar"
        @clear-chat="clearCurrentChat"
      />

      <!-- 聊天消息区域 -->
      <div class="chat-container">
        <!-- 无标签提示 -->
        <WelcomePage 
          v-if="!activeTab"
          @create-tab="createNewTab"
        />

        <!-- 消息列表 -->
        <MessageList
          v-else
          ref="messageListRef"
          :key="activeTab.id"
          @message-retry="handleMessageRetry"
          @message-delete="handleMessageDelete"
          @scroll="handleScroll"
        />
      </div>

      <!-- 消息输入区域 -->
      <MessageInput
        v-if="activeTab"
        ref="messageInputRef"
        @send="handleMessageSend"
        @focus="handleInputFocus"
      />
    </main>

    <!-- 浮动面板 -->
    <div class="floating-panels">
      <!-- Agent选择器 -->
      <AgentSelector
        v-if="isAgentSelectorOpen"
        @select="selectAgent"
        @close="closeAgentSelector"
      />

      <!-- 统计面板 -->
      <StatsFloating
        v-if="preferences.statsOpen"
        :stats="statsLedger"
        @close="() => setPreference('statsOpen', false)"
      />

      <!-- 知识库面板 -->
      <KnowledgeFloating
        v-if="preferences.knowledgeOpen"
        @close="() => setPreference('knowledgeOpen', false)"
      />

      <!-- 提供商面板 -->
      <ProvidersFloating
        v-if="isProvidersOpen"
        @close="closeProviders"
      />
    </div>

    <!-- 模态对话框 -->
    <div class="modals">
      <!-- 设置对话框 -->
      <SettingsDialog
        v-if="isSettingsOpen"
        @close="closeSettings"
        @save="saveSettings"
      />

      <!-- 用户资料对话框 -->
      <UserProfileDialog
        v-if="isProfileOpen"
        :user="user"
        @close="closeProfile"
        @save="saveUserProfile"
      />

      <!-- 工作空间编辑对话框 -->
      <WorkspaceDialog
        v-if="isWorkspaceDialogOpen"
        :workspace="editingWorkspace"
        @close="closeWorkspaceDialog"
        @save="saveWorkspace"
      />
    </div>

    <!-- 全局通知容器 -->
    <NotificationContainer />

    <!-- 全局错误边界 -->
    <ErrorBoundary
      @error="handleGlobalError"
      @retry="handleErrorRetry"
    />

    <!-- 性能监控 -->
    <PerformanceMonitor
      v-if="appSettings.enablePerformanceMonitor"
      component-name="LLMChatApp"
      :show-chart="appSettings.showPerformanceChart"
    />

    <!-- 更新覆盖层 -->
    <UpdateOverlay
      v-if="forceUpdateState.required"
      :state="forceUpdateState"
      @download="downloadUpdate"
      @install="installUpdate"
    />
  </ResponsiveContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import { storeToRefs } from 'pinia';

// Stores
import { useTabsStore } from './stores/useTabsStore';
import { useMessagesStore } from './stores/useMessagesStore';
import { useUserStore } from './stores/useUserStore';
import { useStatsStore } from './stores/useStatsStore';
import { useAgentsStore } from './stores/useAgentsStore';
import { useWorkspacesStore } from './stores/useWorkspacesStore';
import { useProvidersStore } from './stores/useProvidersStore';

// Composables
import { useChat } from './composables/useChat';
import { useSearch } from './composables/useSearch';
import { useErrorHandling } from './composables/useErrorHandling';
import { useResponsiveDesign } from './composables/useResponsiveDesign';

// Services
import { registerServices, validateServices } from './services';

// Components
import Sidebar from './components/Sidebar.vue';
import ChatHeader from './components/ChatHeader.vue';
import MessageList from './components/refactored/MessageList.vue';
import MessageInput from './components/refactored/MessageInput.vue';
import AgentSelector from './components/AgentSelector.vue';
import StatsFloating from './components/StatsFloating.vue';
import KnowledgeFloating from './components/KnowledgeFloating.vue';
import ProvidersFloating from './components/ProvidersFloating.vue';
import SettingsDialog from './components/SettingsDialog.vue';
import UserProfileDialog from './components/UserProfileDialog.vue';
import WorkspaceDialog from './components/WorkspaceDialog.vue';
import WelcomePage from './components/WelcomePage.vue';
import NotificationContainer from './components/common/NotificationContainer.vue';
import UpdateOverlay from './components/common/UpdateOverlay.vue';
import ErrorBoundary from './components/common/ErrorBoundary.vue';
import PerformanceMonitor from './components/common/PerformanceMonitor.vue';
import ResponsiveContainer from './components/common/ResponsiveContainer.vue';

// Types
import { TabId, WorkspaceId, MessageId, Agent, User, Workspace } from './types';

// Stores
const tabsStore = useTabsStore();
const messagesStore = useMessagesStore();
const userStore = useUserStore();
const statsStore = useStatsStore();
const agentsStore = useAgentsStore();
const workspacesStore = useWorkspacesStore();
const providersStore = useProvidersStore();

// Store state
const { tabs, activeTab } = storeToRefs(tabsStore);
const { user, preferences, appSettings, forceUpdateState } = storeToRefs(userStore);
const { statsLedger } = storeToRefs(statsStore);
const { isAgentSelectorOpen } = storeToRefs(agentsStore);
const { workspaces, activeWorkspace } = storeToRefs(workspacesStore);

// Composables
const { isGenerating, totalUsage } = useChat();
const { handleError, retry: retryFromError } = useErrorHandling({
  context: 'app_global',
  showNotifications: true,
  autoRetry: true,
});
const { responsiveState, deviceType, currentBreakpoint } = useResponsiveDesign();

// Refs
const messageListRef = ref();
const messageInputRef = ref();

// Local state
const isSettingsOpen = ref(false);
const isProfileOpen = ref(false);
const isWorkspaceDialogOpen = ref(false);
const isProvidersOpen = ref(false);
const editingWorkspace = ref<Workspace | null>(null);

// Methods
const setActiveWorkspace = (workspaceId: WorkspaceId) => {
  workspacesStore.setActiveWorkspace(workspaceId);
};

const setActiveTab = (tabId: TabId) => {
  tabsStore.setActiveTab(tabId);
};

const createNewTab = () => {
  const tabId = tabsStore.createTab({
    title: '新对话',
    provider: '',
    model: '',
  });
  tabsStore.setActiveTab(tabId);
  
  // 聚焦输入框
  messageInputRef.value?.focus();
};

const closeTab = (tabId: TabId) => {
  tabsStore.closeTab(tabId);
};

const toggleSidebar = () => {
  setPreference('sidebarCollapsed', !preferences.value.sidebarCollapsed);
};

const clearCurrentChat = () => {
  if (activeTab.value) {
    messagesStore.clearMessages(activeTab.value.id);
  }
};

const selectAgent = (agent: Agent) => {
  agentsStore.selectAgent(agent);
};

const closeAgentSelector = () => {
  agentsStore.closeAgentSelector();
};

const setPreference = (key: keyof typeof preferences.value, value: any) => {
  userStore.updatePreferences({ [key]: value });
};

const openSettings = () => {
  isSettingsOpen.value = true;
};

const closeSettings = () => {
  isSettingsOpen.value = false;
};

const saveSettings = (settings: any) => {
  userStore.updateAppSettings(settings);
  closeSettings();
};

const openProfile = () => {
  isProfileOpen.value = true;
};

const closeProfile = () => {
  isProfileOpen.value = false;
};

const saveUserProfile = (userData: Partial<User>) => {
  userStore.updateUser(userData);
  closeProfile();
};

const openWorkspaceDialog = (workspace?: Workspace) => {
  editingWorkspace.value = workspace || null;
  isWorkspaceDialogOpen.value = true;
};

const closeWorkspaceDialog = () => {
  isWorkspaceDialogOpen.value = false;
  editingWorkspace.value = null;
};

const saveWorkspace = (workspaceData: any) => {
  if (editingWorkspace.value) {
    workspacesStore.updateWorkspace(editingWorkspace.value.id, workspaceData);
  } else {
    workspacesStore.createWorkspace(workspaceData);
  }
  closeWorkspaceDialog();
};

const closeProviders = () => {
  isProvidersOpen.value = false;
};

const handleMessageSend = (content: string, webSearch: boolean) => {
  console.log('Message sent:', { content, webSearch });
};

const handleMessageRetry = (messageId: MessageId) => {
  console.log('Retry message:', messageId);
};

const handleMessageDelete = (messageId: MessageId) => {
  console.log('Delete message:', messageId);
};

const handleInputFocus = () => {
  // 可以在这里处理输入框聚焦事件
};

const handleScroll = (scrollInfo: any) => {
  // 可以在这里处理滚动事件
};

const downloadUpdate = () => {
  // 处理更新下载
};

const installUpdate = () => {
  // 处理更新安装
};

const handleGlobalError = (error: Error) => {
  console.error('Global error:', error);
  handleError(error);
};

const handleErrorRetry = () => {
  retryFromError();
};

// 初始化应用
const initializeApp = async () => {
  try {
    // 注册服务
    registerServices();
    
    // 验证服务
    if (!validateServices()) {
      throw new Error('服务验证失败');
    }

    // 加载数据
    await Promise.all([
      tabsStore.loadTabs(),
      userStore.loadUser(),
      statsStore.loadStats(),
      agentsStore.loadAgents(),
      workspacesStore.loadWorkspaces(),
      providersStore.loadProviders(),
    ]);

    console.log('应用初始化完成');
    
  } catch (error) {
    console.error('应用初始化失败:', error);
    handleError(error as Error);
  }
};

// 生命周期
onMounted(() => {
  initializeApp();
});

onUnmounted(() => {
  // 清理资源
});

// 提供全局方法给子组件
provide('openSettings', openSettings);
provide('openProfile', openProfile);
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-family);
}

.app-container.sidebar-collapsed .main-content {
  margin-left: 0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.floating-panels {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
}

.floating-panels > * {
  pointer-events: auto;
}

.modals {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 200;
}

.modals > * {
  pointer-events: auto;
}

/* 响应式设计增强 */

/* 移动端优化 */
.app-container.is-mobile {
  flex-direction: column;
}

.app-container.is-mobile .main-content {
  margin-left: 0 !important;
}

/* 触摸设备优化 */
.app-container.is-touch {
  -webkit-overflow-scrolling: touch;
  touch-action: manipulation;
}

/* 平板优化 */
.app-container.is-tablet .floating-panels {
  padding: var(--spacing-md);
}

/* 断点特定样式 */
.app-container.breakpoint-xs,
.app-container.breakpoint-sm {
  /* 小屏幕特定优化 */
}

.app-container.breakpoint-xs .modals,
.app-container.breakpoint-sm .modals {
  padding: var(--spacing-sm);
}

.app-container.breakpoint-md,
.app-container.breakpoint-lg,
.app-container.breakpoint-xl,
.app-container.breakpoint-xxl {
  /* 大屏幕特定优化 */
}

/* 设备类型特定样式 */
.app-container.device-mobile .floating-panels {
  /* 移动端浮动面板调整 */
  padding: var(--spacing-xs);
}

.app-container.device-tablet .modals {
  /* 平板模态框调整 */
  padding: var(--spacing-md);
}

.app-container.device-desktop {
  /* 桌面端保持原样 */
}

/* 原有响应式设计保持兼容 */
@media (max-width: 768px) {
  .app-container:not(.sidebar-collapsed) .main-content {
    margin-left: 0;
  }
  
  .app-container {
    flex-direction: column;
  }
}

/* 全局滚动条样式 */
:deep(*::-webkit-scrollbar) {
  width: 6px;
  height: 6px;
}

:deep(*::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(*::-webkit-scrollbar-thumb) {
  background: var(--border-color);
  border-radius: 3px;
}

:deep(*::-webkit-scrollbar-thumb:hover) {
  background: var(--text-secondary);
}

/* 焦点样式 */
:deep(*:focus-visible) {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* 选择样式 */
:deep(::selection) {
  background: var(--primary-color);
  color: white;
}
</style>
