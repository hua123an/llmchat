<template>
  <div class="sidebar">
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <div class="app-logo">
        <div class="logo-icon">💬</div>
        <span class="logo-text">ChatLLM</span>
      </div>
      <button class="collapse-btn" @click.stop="store.toggleSidebar" :title="store.isSidebarCollapsed ? (t('common.expand') || '展开') : (t('common.collapse') || '收起')">
        {{ store.isSidebarCollapsed ? '›' : '‹' }}
      </button>
    </div>

    <!-- Scrollable body -->
    <div class="sidebar-body">
      <!-- 对话（可折叠） -->
      <details class="panel conversations-panel" open>
        <summary class="panel-summary">
          <span>{{ t('sidebar.conversations') }}</span>
          <button class="inline-btn new-chat" @click.stop="store.addNewChat">+ {{ t('sidebar.newChat') }}</button>
        </summary>
        <div class="panel-content">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input class="search-input" v-model="store.searchQuery" :placeholder="t('common.search')" @input="onSearch" />
          </div>
          <div class="conversation-list">
            <div
              v-for="tab in store.tabs"
              :key="tab.name"
              @click="store.handleTabChange(tab.name)"
              :class="['conversation-item', { active: store.activeTab === tab.name }]"
            >
              <span class="conversation-text">{{ getTabDisplayTitle(tab) }}</span>
              <div class="conversation-actions">
                <button @click.stop="store.removeTab(tab.name)" class="delete-btn" v-if="store.tabs.length > 1">×</button>
              </div>
            </div>
          </div>
        </div>
      </details>

      

      <!-- 控制按钮 -->
      <div class="control-buttons">
        <button class="control-btn" @click="store.openAgentSelector" :title="t('agent.selectAgent')">
          <span class="btn-icon">🤖</span>
        </button>
        <ThemeToggle class="compact-theme-toggle" />
      </div>
    </div>

    <!-- 底部固定 -->
    <div class="sidebar-footer" :class="{ collapsed: store.isSidebarCollapsed }">
      <div class="user-section" v-show="!store.isSidebarCollapsed" @click="store.openUserProfile">
        <div class="user-avatar">
          <img v-if="store.userAvatar" :src="store.userAvatar" alt="avatar" />
          <span v-else class="avatar-text">{{ store.userInitial }}</span>
        </div>
        <div class="user-info">
          <div class="user-name">{{ store.user.name }}</div>
          <a class="user-email" :href="`mailto:${store.user.email}`">{{ store.user.email }}</a>
        </div>
        <button class="user-menu-btn" :title="t('sidebar.profile')" @click.stop="store.openUserProfile">›</button>
      </div>

      <div class="footer-actions">
        <button @click="openSettings" class="footer-btn">
          <span class="btn-icon">⚙️</span>
          <span class="btn-text">{{ t('sidebar.settings') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useChatStore } from '../store/chat';
import type { ChatTab } from '../store/chat';
import ThemeToggle from './ThemeToggle.vue';

const store = useChatStore();
const { t } = useI18n();

// 获取标签页显示标题
const getTabDisplayTitle = (tab: ChatTab): string => {
  if (tab.messages.length > 0) {
    const firstUserMessage = tab.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
    }
  }
  return `${t('sidebar.newChat')} ${store.tabs.indexOf(tab) + 1}`;
};

const openSettings = () => {
  // 打开设置对话框
  store.isSettingsOpen = true;
};


// 简易全文搜索
import { searchMessages } from '../services/search';
let searchTimer: any = null;
const onSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = store.searchQuery?.trim();
    if (!q) { store.searchResults = []; return; }
    const results = searchMessages(q, 'all');
    store.searchResults = results.map(r => ({ messageId: r.messageId, tabTitle: r.tabName, highlightedContent: '' }));
    if (results.length > 0) {
      const first = results[0];
      // 切换到tab并滚动到消息
      store.handleTabChange(first.tabName);
      setTimeout(() => { store.goToMessage?.(first.messageId); }, 0);
    }
  }, 200);
};

// 已移除 support 入口

// 已移除空间区块
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sidebar-bg);
  color: var(--text-primary);
  overflow: hidden;
}

.sidebar-body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 由内部列表滚动 */
  min-height: 0;
  padding-bottom: 8px;
}

/* 折叠面板样式 */
.panel {
  border-bottom: none;
}
.panel-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  color: var(--text-secondary);
}
.panel[open] > .panel-summary { color: var(--text-primary); }
.panel-content { padding: 0 16px 12px; }

/* 仅让会话列表滚动 */
.conversations-panel { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.conversations-panel > .panel-content { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.conversation-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; max-height: 48vh; }

.sticky-bottom { position: sticky; bottom: 64px; background: var(--sidebar-bg); z-index: 1; }
.control-buttons { position: sticky; bottom: 8px; display: flex; gap: 8px; justify-content: center; padding: 8px; background: var(--sidebar-bg); z-index: 1; }
.control-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--bg-secondary);
  border: none;
}
.btn-icon { font-size: 18px; }

.sidebar-header {
  padding: 20px;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.collapse-btn {
  background: var(--bg-hover);
  border: none;
  color: var(--text-secondary);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.collapse-btn:hover {
  background: var(--bg-secondary);
  border-color: var(--border-hover);
}

.conversations-section,
.spaces-section {
  padding: 20px 16px;
}

.section-header {
  margin-bottom: 12px;
}

.search-row { display:flex; align-items:center; justify-content: space-between; gap:8px; }
.search-box { display:flex; align-items:center; gap:6px; background: var(--bg-primary); border:none; border-radius: 8px; padding: 4px 8px; }
.search-icon { font-size: 14px; color: var(--text-tertiary); }
.search-input { border:none; outline:none; background: transparent; color: var(--text-primary); width: 140px; font-size: 13px; }

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.conversation-list,
.space-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: var(--text-primary);
}

.conversation-item:hover {
  background-color: var(--bg-hover);
}

.conversation-item.active {
  background-color: var(--primary-light);
  color: var(--primary-color);
  font-weight: 500;
}

.conversation-item.new-chat-item {
  font-weight: 500;
}

.conversation-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-arrow {
  font-size: 16px;
  color: var(--text-tertiary);
}

.conversation-item.active .conversation-arrow {
  color: var(--primary-color);
}

.conversation-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

.delete-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-secondary);
}

.space-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: var(--text-primary);
}

.space-item:hover {
  background-color: var(--bg-hover);
}

.space-item.active {
  background-color: var(--primary-light);
  border-left: 3px solid var(--primary-color);
}

.space-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.space-indicator.purple {
  background-color: #8b5cf6;
}

.space-indicator.red {
  background-color: #ef4444;
}

.space-indicator.blue {
  background-color: #3b82f6;
}

.space-indicator.green {
  background-color: #10b981;
}

.space-indicator.orange {
  background-color: #f59e0b;
}

.space-name {
  flex: 1;
}

.space-shortcut {
  font-size: 12px;
  color: var(--text-tertiary);
}

.sidebar-footer {
  margin-top: auto;
  padding: 16px;
  border-top: none;
}
.sidebar-footer.collapsed {
  padding: 12px;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-bottom: 12px;
}

.user-section:hover {
  background-color: var(--bg-hover);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}
.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.user-avatar:hover {
  filter: brightness(1.05);
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.user-email {
  font-size: 12px;
  color: var(--text-secondary);
  text-decoration: none;
}

.user-email:hover {
  text-decoration: underline;
}

.user-menu-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}

/* 轻量下拉菜单，无第三方依赖 */
.menu-root {
  position: relative;
}
.menu-root[open] > .user-menu-btn {
  color: var(--text-secondary);
}
.menu-dropdown {
  position: absolute;
  right: 0;
  bottom: 28px;
  min-width: 160px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  padding: 6px;
  z-index: 10;
}
.menu-item {
  width: 100%;
  background: none;
  border: none;
  text-align: left;
  color: var(--text-primary);
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.menu-item:hover {
  background: var(--bg-hover);
}
.menu-item.danger {
  color: #e11d48;
}
.menu-sep {
  height: 1px;
  margin: 6px 4px;
  background: var(--border-color);
}

.footer-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.footer-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-size: 14px;
  color: var(--text-primary);
  text-align: left;
}

.footer-btn:hover { background-color: var(--bg-hover); }

.btn-icon {
  font-size: 14px;
}

.btn-text {
  flex: 1;
}

/* 控制按钮 */
.control-buttons {
  display: flex;
  justify-content: center; /* 居中对齐 */
  align-items: center;
  padding: 4px 8px; /* 收紧内边距 */
  margin: 200px 0 8px 0; /* 更接近用户信息 */
  gap: 16px; /* 两按钮之间的间距 */
}

.control-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: var(--bg-secondary);
  transform: translateY(-1px);
}

.control-btn .btn-icon {
  font-size: 18px;
}

.compact-theme-toggle {
  flex: 0 0 auto;
}

.compact-theme-toggle :deep(.theme-button) {
  width: 40px;
  height: 40px;
  min-width: 40px;
  padding: 0;
  border-radius: 8px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
}

.compact-theme-toggle :deep(.theme-button:hover) {
  background: var(--bg-secondary);
  border-color: var(--border-hover);
  transform: translateY(-1px);
}

.compact-theme-toggle :deep(.theme-icon) {
  font-size: 18px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    flex-direction: row;
    height: 60px;
    padding: 0 16px;
  }
  
  .sidebar-header {
    padding: 0;
    border-bottom: none;
    flex-shrink: 0;
  }
  
  .app-logo {
    margin-right: 16px;
  }
  
  .logo-text {
    display: none;
  }
  
  .conversations-section,
  .spaces-section,
  .control-buttons,
  .sidebar-footer {
    display: none;
  }
}

/* 滚动条样式 */
.conversation-list::-webkit-scrollbar,
.space-list::-webkit-scrollbar {
  width: 4px;
}

.conversation-list::-webkit-scrollbar-track,
.space-list::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-list::-webkit-scrollbar-thumb,
.space-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.conversation-list::-webkit-scrollbar-thumb:hover,
.space-list::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}
</style>