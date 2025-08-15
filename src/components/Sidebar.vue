<template>
  <div class="sidebar">
    <!-- 侧边栏头部 -->
    <div class="sidebar-header">
      <div class="app-logo">
        <div class="logo-icon" aria-hidden="true"></div>
        <span class="logo-text">ChatLLM</span>
        <span class="pro-badge" title="已激活专业版">PRO</span>
      </div>
    </div>

    <!-- 用户信息区域 -->
    <div class="user-profile" @click="store.openUserProfile">
      <div class="user-avatar">
        <img v-if="store.userAvatar" :src="store.userAvatar" alt="avatar" loading="lazy" decoding="async" />
        <span v-else class="avatar-text">{{ store.userInitial }}</span>
      </div>
      <div class="user-info">
        <div class="user-name">{{ store.user.name }}</div>
        <div class="user-email">{{ store.user.email }}</div>
      </div>
      <div class="dropdown-arrow" :class="{ open: userExpanded }" @click.stop="toggleUserExpanded">▼</div>
    </div>

    <transition name="fold">
      <div v-if="userExpanded" class="user-panel">
        <div class="panel-row">
          <div class="panel-label">主题</div>
          <div class="panel-actions">
            <button class="chip" :class="{ active: currentTheme === 'light' }" @click.stop="setTheme('light')">浅色</button>
            <button class="chip" :class="{ active: currentTheme === 'dark' }" @click.stop="setTheme('dark')">深色</button>
            <button class="chip" :class="{ active: currentTheme === 'auto' }" @click.stop="setTheme('auto')">自动</button>
          </div>
        </div>
        <div class="panel-row">
          <div class="panel-label">语言</div>
          <div class="panel-actions">
            <button class="chip" :class="{ active: currentLanguage === 'zh-CN' }" @click.stop="setLang('zh-CN')">中文</button>
            <button class="chip" :class="{ active: currentLanguage === 'en-US' }" @click.stop="setLang('en-US')">English</button>
          </div>
        </div>
        <div class="panel-row">
          <div class="panel-label">模型</div>
          <div class="panel-actions model-line">
            <AppSelect
              v-model="providerName"
              size="small"
              :options="providerList.map(p => ({ label: p.name, value: p.name, title: p.name }))"
              placeholder="Provider"
              aria-label="选择服务商"
              @change="onProviderChange"
            />
            <AppSelect
              v-model="modelId"
              size="small"
              :disabled="!models.length"
              :options="models.map((m:any) => ({ label: (m.name || m.id || m), value: (m.id || m), title: (m.name || m.id || m) }))"
              placeholder="Model"
              aria-label="选择模型"
              @change="onModelChange"
            />
          </div>
        </div>
        <div class="panel-row">
          <div class="panel-label">常用</div>
          <div class="panel-actions wrap">
            <button v-for="p in favoriteProviders" :key="p" class="chip" @click.stop="quickSelectProvider(p)">{{ p }}</button>
            <button v-for="m in recentModels" :key="m" class="chip" @click.stop="quickSelectModel(m)">{{ m }}</button>
          </div>
        </div>
        <div class="panel-row panel-links">
          <button class="link-btn" @click.stop="openSettings">设置</button>
          <button class="link-btn" @click.stop="openPrompts">提示词库</button>
          <button class="link-btn" @click.stop="openPlugins">插件</button>
        </div>
        <div class="panel-row">
          <div class="panel-label">工作区</div>
          <div class="panel-actions model-line">
            <AppSelect
              v-model="activeSpaceId"
              size="small"
              :options="spacesList.map((s:any)=>({ label: s.name, value: s.id, title: s.name }))"
              placeholder="选择工作区"
              aria-label="选择工作区"
              @change="onSpaceChange"
            />
            <button class="chip" @click.stop="createWorkspace">新建</button>
          </div>
        </div>
        <div class="panel-row">
          <div class="panel-label">知识库</div>
          <div class="panel-actions">
            <button class="chip" @click.stop="openKnowledge">导入</button>
            <button class="chip" @click.stop="searchKnowledge">搜索</button>
            <button class="chip" @click.stop="clearKnowledge">清空</button>
          </div>
        </div>
      </div>
    </transition>

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
      
      <div :class="['nav-item', { active: activeNavItem === 'image-generation' }]" @click="handleNavClick('image-generation')">
        <div class="nav-icon">🎨</div>
        <span class="nav-text">AI绘图</span>
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
          <button 
            @click="store.openHistorySearch()"
            class="advanced-search-btn"
            title="高级历史搜索"
          >
            📝
          </button>
        </div>
      </div>
      
      <div class="conversation-list">
        <div
          v-for="tab in store.tabs"
          :key="tab.name"
          @click="store.handleTabChange(tab.name)"
          :class="['conversation-item', { active: store.activeTab === tab.name }]"
        >
          <div class="conversation-header">
            <div class="conversation-icon">{{ getCategoryIcon(tab.category) }}</div>
            <span class="conversation-text">{{ getTabDisplayTitle(tab) }}</span>
            <div class="conversation-actions">
              <button 
                @click.stop="store.removeTab(tab.name)" 
                class="delete-btn" 
                v-if="store.tabs.length > 1"
              >×</button>
            </div>
          </div>
          <div class="conversation-meta" v-if="tab.category && tab.category !== 'other'">
            <span class="category-badge" :style="{ background: getCategoryColor(tab.category) }">
              {{ getCategoryDisplayName(tab.category) }}
            </span>
            <div class="tags-container" v-if="tab.tags && tab.tags.length > 0">
              <span v-for="tag in tab.tags.slice(0, 2)" :key="tag" class="tag-chip">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部菜单 -->
    <div class="bottom-menu">
      <div class="bottom-item" @click="openSettings">
        <div class="bottom-icon">⚙️</div>
        <span class="bottom-text">设置</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppSelect from './common/AppSelect.vue';
// import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useChatStore } from '../store/chat';
import type { ChatTab } from '../store/chat';
import { themeManager } from '../utils/themeManager';
import { clearAll as ragClearAll } from '../services/rag/store';
import { switchLanguage, getCurrentLanguage } from '../locales';

const store = useChatStore();
// const { t } = useI18n();

// 当前激活的导航项
const activeNavItem = ref('home');
const userExpanded = ref(false);
const toggleUserExpanded = () => { userExpanded.value = !userExpanded.value; };

const currentTheme = computed(() => themeManager.getCurrentTheme());
const setTheme = (mode: 'light'|'dark'|'auto') => themeManager.setTheme(mode as any);
const currentLanguage = computed(() => getCurrentLanguage());
const setLang = (c: 'zh-CN'|'en-US') => switchLanguage(c);

const providerList = computed(() => store.providers || []);
const providerName = computed({ get: () => store.currentTab?.provider || '', set: (v: string) => { if (store.currentTab) store.currentTab.provider = v; }});
const models = computed(() => store.currentTab?.models || []);
const modelId = computed({ get: () => store.currentTab?.model || '', set: (v: string) => { if (store.currentTab) { store.currentTab.model = v; store.saveTabsToStorage?.(); } }});
const onProviderChange = async () => { try { await store.fetchModels(); } catch {} };
const onModelChange = () => { try { store.saveTabsToStorage?.(); } catch {} };
// 快捷入口（用于面板按钮）
const openPrompts = () => store.openPrompts();
const openPlugins = () => store.openPlugins();

// 常用 Provider 与最近模型（本地存储）
const favoriteProviders = ref<string[]>([]);
try {
  const arr = JSON.parse(localStorage.getItem('favoriteProviders') || '[]');
  if (Array.isArray(arr)) favoriteProviders.value = arr as string[];
} catch {}
const recentModels = ref<string[]>([]);
try {
  const arr2 = JSON.parse(localStorage.getItem('recentModels') || '[]');
  if (Array.isArray(arr2)) recentModels.value = arr2 as string[];
} catch {}
const persistFavs = () => { try { localStorage.setItem('favoriteProviders', JSON.stringify(favoriteProviders.value.slice(0,8))); } catch {} };
const persistRecents = () => { try { localStorage.setItem('recentModels', JSON.stringify(recentModels.value.slice(0,8))); } catch {} };
const quickSelectProvider = async (p: string) => { providerName.value = p; await onProviderChange(); };
const quickSelectModel = (m: string) => { modelId.value = m; onModelChange(); };
// 记录使用
watch(providerName, (v) => { if (v && !favoriteProviders.value.includes(v)) { favoriteProviders.value.unshift(v); persistFavs(); } });
watch(modelId, (v) => { if (v) { const i = recentModels.value.indexOf(v); if (i>=0) recentModels.value.splice(i,1); recentModels.value.unshift(v); persistRecents(); } });

// 工作区
const spacesList = computed(() => store.spaces || []);
const activeSpaceId = computed({ get: () => (store.activeSpace || ''), set: (_v: string) => { /* 仅为联动显示 */ } });
const onSpaceChange = (value: string | number | undefined) => {
  try {
    const id = value != null ? String(value) : '';
    if (id) store.switchSpace?.(id);
  } catch {}
};
const createWorkspace = () => {
  const name = prompt('新建工作区名称');
  if (!name) return;
  try {
    const id = `space-${Date.now().toString(16)}`;
    store.spaces.push({ id, name, color: 'blue', shortcut: '', systemPrompt: '', tabs: [] });
    // 简单持久化
    try { localStorage.setItem('workSpaces', JSON.stringify(store.spaces)); } catch {}
  } catch {}
};

// 知识库快捷
const openKnowledge = () => { store.isKnowledgeOpen = true; };
const searchKnowledge = () => { store.isKnowledgeOpen = true; };
const clearKnowledge = async () => {
  if (!confirm('确认清空本地知识库？该操作不可恢复。')) return;
  try { await ragClearAll(); (window as any).ElMessage?.success?.('已清空'); } catch {}
};
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

// 分类相关的辅助方法
const getCategoryIcon = (category?: string) => {
  const icons = {
    work: '💼',
    study: '📚', 
    creative: '🎨',
    technical: '💻',
    daily: '🏠',
    other: '💬'
  };
  return icons[category as keyof typeof icons] || '💬';
};

const getCategoryDisplayName = (category?: string) => {
  const names = {
    work: '工作',
    study: '学习',
    creative: '创作', 
    technical: '技术',
    daily: '日常',
    other: '其他'
  };
  return names[category as keyof typeof names] || '其他';
};

const getCategoryColor = (category?: string) => {
  const colors = {
    work: '#409EFF',
    study: '#67C23A',
    creative: '#E6A23C', 
    technical: '#F56C6C',
    daily: '#909399',
    other: '#C0C4CC'
  };
  return colors[category as keyof typeof colors] || '#C0C4CC';
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
      // 打开提示词库
      store.openPrompts();
      break;
      
    case 'plugins':
      // 打开插件管理
      store.openPlugins();
      break;
      
    case 'image-generation':
      // 打开AI绘图
      store.openImageGeneration();
      break;
  }
};

// 已移除“套餐/登出”相关逻辑

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
  width:24px;
  height:24px;
  border-radius:6px;
  background: conic-gradient(from 45deg, #f59e0b, #ef4444, #8b5cf6, #10b981, #f59e0b);
  box-shadow: 0 1px 2px rgba(0,0,0,0.18);
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-right: 8px;
}

.pro-badge {
  background: linear-gradient(135deg,#ff8a00 0%,#ffbf3c 100%);
  color: #1f2937;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border: 1px solid rgba(255,255,255,0.35);
}

/* 用户信息区域 */
.user-profile {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  margin: 4px 16px 16px;
  border-radius: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
}

.user-profile:hover { background: var(--bg-hover); transform: translateY(-1px); }

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
  transform: translateY(1px);
}
.dropdown-arrow.open { transform: rotate(180deg) translateY(-1px); }

/* 折叠面板 */
.user-panel {
  margin: 0 16px 16px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--bg-surface);
}
.panel-row { display:flex; align-items:center; justify-content: space-between; gap:8px; padding:6px 0; }
.panel-label { font-size:12px; color: var(--text-tertiary); min-width:44px; }
.panel-actions { display:flex; gap:8px; flex:1; }
.panel-actions.wrap { flex-wrap: wrap; }
.panel-actions.model-line :deep(.el-select) { 
  min-width: 120px;
  flex: 1; 
}

/* 确保下拉选项文本不被截断 */
.panel-actions.model-line :deep(.el-select .el-input__inner) {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

/* 下拉选项容器增加最小宽度 */
.panel-actions.model-line :deep(.el-select-dropdown) {
  min-width: 200px !important;
}

/* 下拉选项文本完整显示 */
.panel-actions.model-line :deep(.el-select-dropdown .el-select-dropdown__item) {
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
  padding-right: 20px;
}

.option-line { white-space: nowrap; overflow: visible; text-overflow: unset; }
.chip { padding:4px 8px; border:1px solid var(--border-light); background: var(--bg-container); border-radius:8px; cursor:pointer; font-size:12px; color: var(--text-secondary); }
.chip.active { border-color: var(--brand-primary); color: var(--brand-primary); background: var(--bg-hover); }
.panel-links { justify-content: flex-start; }
.link-btn { background: transparent; border: none; color: var(--text-secondary); font-size: 12px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.link-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* 折叠动画 */
.fold-enter-from, .fold-leave-to { opacity: 0; transform: translateY(-4px); }
.fold-enter-active, .fold-leave-active { transition: all .15s ease; }

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

.advanced-search-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  font-size: 14px;
}

.advanced-search-btn:hover {
  background: var(--bg-hover);
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conversation-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  position: relative;
}

.conversation-header {
  display: flex;
  align-items: center;
}

.conversation-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 24px; /* 与icon对齐 */
  margin-top: 2px;
}

.category-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  color: white;
  font-weight: 500;
  text-shadow: 0 1px 1px rgba(0,0,0,0.2);
}

.tags-container {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tag-chip {
  font-size: 9px;
  padding: 1px 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text-secondary);
  max-width: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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