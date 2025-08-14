<template>
  <div class="sidebar">
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <div class="app-logo">
        <div class="logo-icon">⚡</div>
        <span class="logo-text">Clarity AI</span>
        <span class="pro-badge">Pro</span>
      </div>
    </div>

    <!-- 用户信息区域 -->
    <div class="user-profile" @click="store.openUserProfile">
      <div class="user-avatar">
        <img v-if="store.userAvatar" :src="store.userAvatar" alt="avatar" />
        <span v-else class="avatar-text">{{ store.userInitial }}</span>
      </div>
      <div class="user-info">
        <div class="user-name">{{ store.user.name }}</div>
        <div class="user-email">{{ store.user.email }}</div>
      </div>
      <div class="dropdown-arrow">▼</div>
    </div>

    <!-- 导航菜单 -->
    <nav class="nav-menu">
      <div :class="['nav-item', { active: activeNavItem === 'home' }]" @click="handleNavClick('home')">
        <div class="nav-icon">🏠</div>
        <span class="nav-text">主页</span>
      </div>
      <div :class="['nav-item', { active: activeNavItem === 'ai' }]" @click="handleNavClick('ai')">
        <div class="nav-icon">🤖</div>
        <span class="nav-text">AI助手</span>
      </div>
      <div :class="['nav-item', { active: activeNavItem === 'prompts' }]" @click="handleNavClick('prompts')">
        <div class="nav-icon">📝</div>
        <span class="nav-text">提示词库</span>
      </div>
      <div :class="['nav-item', { active: activeNavItem === 'plugins' }]" @click="handleNavClick('plugins')">
        <div class="nav-icon">🔌</div>
        <span class="nav-text">插件</span>
      </div>
    </nav>

    <!-- 新建聊天按钮 -->
    <div class="new-chat-section">
      <button class="new-chat-btn" @click="store.addNewChat">
        <span class="plus-icon">+</span>
        <span class="btn-text">新建聊天</span>
      </button>
    </div>

    <!-- 聊天记录区域 -->
    <div class="conversations-section">
      <div class="section-header">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            class="search-input" 
            v-model="store.searchQuery" 
            placeholder="搜索聊天记录" 
            @input="onSearch" 
          />
        </div>
      </div>
      
      <div class="conversation-list">
        <div
          v-for="tab in store.tabs"
          :key="tab.name"
          @click="store.handleTabChange(tab.name)"
          :class="['conversation-item', { active: store.activeTab === tab.name }]"
        >
          <div class="conversation-icon">💬</div>
          <span class="conversation-text">{{ getTabDisplayTitle(tab) }}</span>
          <div class="conversation-actions">
            <button 
              @click.stop="store.removeTab(tab.name)" 
              class="delete-btn" 
              v-if="store.tabs.length > 1"
            >×</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部菜单 -->
    <div class="bottom-menu">
      <div class="bottom-item" @click="handlePlansClick">
        <div class="bottom-icon">💎</div>
        <span class="bottom-text">套餐</span>
      </div>
      <div class="bottom-item" @click="openSettings">
        <div class="bottom-icon">⚙️</div>
        <span class="bottom-text">设置</span>
      </div>
      <div class="bottom-item" @click="handleLogoutClick">
        <div class="bottom-icon">🚪</div>
        <span class="bottom-text">登出</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useChatStore } from '../store/chat';
import type { ChatTab } from '../store/chat';

const store = useChatStore();
const { t } = useI18n();

// 当前激活的导航项
const activeNavItem = ref('home');

// 获取标签页显示标题
const getTabDisplayTitle = (tab: ChatTab): string => {
  if (tab.messages.length > 0) {
    const firstUserMessage = tab.messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
    }
  }
  return `新聊天 ${store.tabs.indexOf(tab) + 1}`;
};

// 处理导航菜单点击
const handleNavClick = (navItem: string) => {
  activeNavItem.value = navItem;
  
  switch (navItem) {
    case 'home':
      // 返回主页 - 创建新的聊天标签
      store.addNewChat();
      ElMessage.success('已切换到主页');
      break;
      
    case 'ai':
      // 打开AI助手选择器
      store.openAgentSelector();
      break;
      
    case 'prompts':
      // 打开提示词库（模拟功能）
      showPromptsLibrary();
      break;
      
    case 'plugins':
      // 打开插件管理（模拟功能）
      showPluginManager();
      break;
  }
};

// 显示提示词库
const showPromptsLibrary = () => {
  ElMessage({
    message: '提示词库功能开发中，敬请期待！',
    type: 'info',
    duration: 3000
  });
};

// 显示插件管理器
const showPluginManager = () => {
  ElMessage({
    message: '插件管理功能开发中，敬请期待！',
    type: 'info', 
    duration: 3000
  });
};

// 处理套餐点击
const handlePlansClick = () => {
  ElMessageBox.alert(
    '当前为免费版本，升级到Pro可享受更多功能：\n\n' +
    '• 无限次对话\n' +
    '• 更快的响应速度\n' +
    '• 优先客服支持\n' +
    '• 高级AI模型访问\n\n' +
    '敬请期待正式版发布！',
    '套餐升级',
    {
      confirmButtonText: '了解',
      type: 'info'
    }
  );
};

// 处理登出点击
const handleLogoutClick = () => {
  ElMessageBox.confirm(
    '确定要登出吗？您的聊天记录将被保存。',
    '确认登出',
    {
      confirmButtonText: '确定登出',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 执行登出逻辑
    performLogout();
  }).catch(() => {
    // 用户取消
  });
};

// 执行登出
const performLogout = () => {
  // 清除用户数据（保留聊天记录）
  // 这里可以添加更多登出逻辑
  ElMessage.success('已成功登出');
  // 注意：实际项目中应该重定向到登录页面
};

// 简易全文搜索
import { searchMessages } from '../services/search';
let searchTimer: any = null;
const onSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = store.searchQuery?.trim();
    if (!q) { 
      store.searchResults = []; 
      return; 
    }
    const results = searchMessages(q, 'all');
    store.searchResults = results.map(r => ({ 
      messageId: r.messageId, 
      tabTitle: r.tabName, 
      highlightedContent: '' 
    }));
    if (results.length > 0) {
      const first = results[0];
      // 切换到tab并滚动到消息
      store.handleTabChange(first.tabName);
      setTimeout(() => { 
        store.goToMessage?.(first.messageId); 
      }, 0);
    }
  }, 200);
};

const openSettings = () => {
  // 打开设置对话框
  store.isSettingsOpen = true;
};
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 280px;
  background: var(--bg-sidebar);
  border-right: 1px solid #e5e7eb;
  padding: 0;
  overflow: hidden;
}

/* 头部区域 */
.sidebar-header {
  padding: 20px 16px 16px;
  border-bottom: none;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
  color: var(--brand-primary);
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-right: 8px;
}

.pro-badge {
  background: #ff9500;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 用户信息区域 */
.user-profile {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 0 16px 16px;
  border-radius: 8px;
  background: var(--bg-surface);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-profile:hover {
  background: var(--bg-hover);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  margin-right: 12px;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.user-email {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-arrow {
  color: var(--text-tertiary);
  font-size: 12px;
  margin-left: 8px;
}

/* 导航菜单 */
.nav-menu {
  padding: 0 16px;
  margin-bottom: 16px;
}

/* 新建聊天按钮 */
.new-chat-section {
  padding: 0 16px;
  margin-bottom: 16px;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.new-chat-btn:hover {
  background: var(--brand-primary-dark);
  transform: translateY(-1px);
}

.plus-icon {
  font-size: 16px;
  font-weight: bold;
}

/* 聊天记录区域 */
.conversations-section {
  flex: 1;
  padding: 0 16px;
  overflow-y: auto;
  min-height: 0;
}

.section-header {
  margin-bottom: 12px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 8px 12px;
}

.search-icon {
  font-size: 14px;
  color: var(--text-secondary);
}

.search-input {
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  flex: 1;
}

.search-input::placeholder {
  color: var(--text-placeholder);
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
}

.conversation-item:hover {
  background: var(--bg-hover);
}

.conversation-item.active {
  background: var(--bg-selected);
  color: var(--brand-primary);
}

.conversation-icon {
  font-size: 14px;
  margin-right: 10px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.conversation-text {
  font-size: 13px;
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-item.active .conversation-text {
  color: var(--brand-primary);
  font-weight: 500;
}

.conversation-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.nav-item:hover {
  background: var(--bg-hover);
}

.nav-item.active {
  background: var(--brand-primary);
  color: white;
}

.nav-item.active .nav-text {
  color: white;
}

.nav-icon {
  font-size: 16px;
  margin-right: 12px;
  width: 20px;
  text-align: center;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.new-badge {
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 8px;
  margin-left: auto;
}

/* 历史记录区域 */
.history-section {
  flex: 1;
  padding: 0 16px;
  overflow-y: auto;
}

.history-group {
  margin-bottom: 24px;
}

.history-title {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-left: 4px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
  group: true;
}

.history-item:hover {
  background: #f3f4f6;
}

.history-item.active {
  background: var(--bg-selected);
  color: var(--brand-primary);
}

.history-icon {
  font-size: 14px;
  margin-right: 10px;
  color: #6b7280;
  flex-shrink: 0;
}

.history-text {
  font-size: 13px;
  color: #374151;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item.active .history-text {
  color: var(--brand-primary);
  font-weight: 500;
}

.delete-btn {
  opacity: 0;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 16px;
  padding: 2px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #f3f4f6;
  color: #ef4444;
}

.show-all-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-top: 8px;
}

.show-all-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

/* 底部菜单 */
.bottom-menu {
  padding: 16px;
  border-top: 1px solid var(--border-light);
  margin-top: auto;
}

.bottom-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.bottom-item:hover {
  background: var(--bg-hover);
}

.bottom-item:last-child {
  margin-bottom: 0;
}

.bottom-icon {
  font-size: 16px;
  margin-right: 12px;
  width: 20px;
  text-align: center;
  color: var(--text-secondary);
}

.bottom-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

/* 滚动条样式 */
.history-section::-webkit-scrollbar {
  width: 4px;
}

.history-section::-webkit-scrollbar-track {
  background: transparent;
}

.history-section::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.history-section::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    flex-direction: row;
    padding: 0 16px;
  }
  
  .user-profile,
  .nav-menu,
  .history-section,
  .bottom-menu {
    display: none;
  }
  
  .sidebar-header {
    padding: 12px 0;
  }
}
</style>