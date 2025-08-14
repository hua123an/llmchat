<template>
  <div class="chat-container">
    <div class="main-container">
      <!-- 左侧边栏 -->
      <div class="sidebar-container" :class="{ collapsed: store.isSidebarCollapsed }">
        <Sidebar />
      </div>
      
      <!-- 主内容区域 -->
      <div class="content-container">
        <!-- 折叠时显示的展开把手 -->
        <button
          v-if="store.isSidebarCollapsed"
          class="sidebar-expand-handle"
          @click="store.toggleSidebar"
          :title="t('common.expand') || '展开'"
        >
          ‹
        </button>
        <!-- 聊天内容区域 -->
        <div class="chat-main">
          <div class="chat-content">
            <!-- 显示欢迎页面或聊天内容 -->
            <WelcomePage v-if="shouldShowWelcome" />
            <MessageList v-else />
          </div>
        </div>
        
        <!-- 底部输入区域 -->
        <div class="footer-container">
          <div class="input-container">
            <MessageInput />
          </div>
        </div>
        

      </div>
    </div>
    <!-- Agent选择器 -->
    <AgentSelector />
    <!-- 设置对话框 -->
    <SettingsDialog />
    <!-- 用户资料对话框 -->
    <UserProfileDialog />
    
    <!-- 数据统计悬浮窗 -->
    <StatsFloating />
    <!-- 知识库悬浮窗 -->
    <!-- <KnowledgeFloating /> -->
    <!-- <ProvidersFloating /> -->
    <!-- 强制更新遮罩层 -->
    <UpdateOverlay />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Sidebar from '../components/Sidebar.vue';
import MessageList from '../components/MessageList.vue';
import MessageInput from '../components/MessageInput.vue';
import WelcomePage from '../components/WelcomePage.vue';
import AgentSelector from '../components/AgentSelector.vue';
import SettingsDialog from '../components/SettingsDialog.vue';
import UserProfileDialog from '../components/UserProfileDialog.vue';
import StatsFloating from '../components/StatsFloating.vue';
import UpdateOverlay from '../components/common/UpdateOverlay.vue';
// import KnowledgeFloating from '../components/KnowledgeFloating.vue';
// import ProvidersFloating from '../components/ProvidersFloating.vue';
import { useChatStore } from '../store/chat';

const store = useChatStore();
const { t } = useI18n();

// 决定是否显示欢迎页面
const shouldShowWelcome = computed(() => {
  const currentTab = store.tabs.find(tab => tab.name === store.activeTab);
  return !currentTab || currentTab.messages.length === 0;
});

// 在组件挂载时加载初始数据
onMounted(async () => {
  await store.loadInitialData();
});
</script>

<style scoped>
.chat-container {
  width: 100%;
  height: 100vh;
  background: var(--bg-secondary);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.main-container {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: row;
}

.sidebar-container {
  width: 300px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  border-right: none;
  overflow: hidden;
}
.sidebar-container.collapsed {
  width: 0; /* 完全收起，不占用空间 */
  min-width: 0;
  border-right: none;
}

.content-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-secondary);
  position: relative;
}

.chat-main {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: stretch;
  padding: 0;
  overflow: hidden;
  background: var(--bg-secondary);
  width: 100%;
}

.sidebar-expand-handle {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  box-shadow: none;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.sidebar-expand-handle:hover { background: var(--bg-hover); color: var(--text-primary); }

.sidebar-expand-handle:active {
  transform: scale(0.98);
}

.chat-content {
  width: 100%;
  max-width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  justify-content: center;
  align-items: stretch;
}

.footer-container {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding: 20px;
  background: var(--bg-secondary);
}

.input-container {
  width: 100%;
  max-width: 800px;
}



/* 响应式设计 */
@media (max-width: 1024px) {
  .sidebar-container {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .main-container {
    flex-direction: column;
  }
  
  .sidebar-container {
    width: 100%;
    height: 60px;
    order: -1;
  }
  
  .content-container {
    height: calc(100vh - 60px);
  }
  
  .footer-container {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .footer-container {
    padding: 12px;
  }
}
</style>