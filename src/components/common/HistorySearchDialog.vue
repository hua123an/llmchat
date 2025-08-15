<template>
  <el-dialog 
    v-model="visible" 
    title="📝 历史会话检索" 
    width="80%" 
    max-width="800px"
    :close-on-click-modal="false"
    class="history-search-dialog"
  >
    <div class="search-container">
      <!-- 搜索输入框 -->
      <div class="search-input-wrapper">
        <el-input
          v-model="searchQuery"
          placeholder="搜索历史对话内容..."
          clearable
          @input="performSearch"
          class="search-input"
          size="large"
          aria-label="搜索历史对话内容"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- 筛选选项 -->
      <div class="filter-options">
        <el-select v-model="categoryFilter" placeholder="按分类筛选" clearable size="small" @change="performSearch" popper-class="wide-select-popper" :fit-input-width="false" aria-label="按分类筛选">
          <el-option :label="$t('historySearch.allCategories')" value="" />
          <el-option v-for="cat in categories" :key="cat.value" :label="cat.label" :value="cat.value">
            <div :title="cat.label">{{ cat.label }}</div>
          </el-option>
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="small"
          @change="performSearch"
        />
        <el-button type="primary" size="small" @click="performAdvancedSearch" :aria-label="$t('historySearch.advancedSearch')">{{ $t('historySearch.advancedSearch') }}</el-button>
      </div>

      <!-- 搜索结果 -->
      <div class="search-results">
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>
        
        <div v-else-if="searchResults.length === 0 && searchQuery" class="no-results">
          <el-empty description="未找到相关对话" />
        </div>
        
        <div v-else-if="searchResults.length > 0" class="results-list">
          <div class="results-header">
            找到 {{ searchResults.length }} 条相关对话
          </div>
          
          <div 
            v-for="result in paginatedResults" 
            :key="result.tabName + result.messageId"
            class="result-item"
            @click="jumpToMessage(result)"
          >
            <div class="result-header">
              <div class="result-title">
                <span class="category-icon">{{ getCategoryIcon(result.category) }}</span>
                <span class="tab-title">{{ result.tabTitle }}</span>
                <span v-if="result.category && result.category !== 'other'" 
                      class="category-badge" 
                      :style="{ background: getCategoryColor(result.category) }">
                  {{ getCategoryDisplayName(result.category) }}
                </span>
              </div>
              <div class="result-meta">
                <span class="message-time">{{ formatTime(result.timestamp) }}</span>
                <span class="message-role" :class="result.role">{{ result.role === 'user' ? '用户' : 'AI' }}</span>
              </div>
            </div>
            
            <div class="result-content">
              <div v-html="result.highlightedContent"></div>
            </div>
            
            <div class="result-tags" v-if="result.tags && result.tags.length > 0">
              <el-tag v-for="tag in result.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
            </div>
          </div>

          <!-- 分页 -->
          <div class="pagination-container" v-if="searchResults.length > pageSize">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="searchResults.length"
              layout="prev, pager, next, jumper"
              background
              small
            />
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useChatStore } from '../../store/chat';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';

const store = useChatStore();

const visible = computed({
  get: () => store.isHistorySearchOpen || false,
  set: (value: boolean) => {
    // 需要在 store 中添加这个状态
    (store as any).isHistorySearchOpen = value;
  }
});

// 搜索相关
const searchQuery = ref('');
const categoryFilter = ref('');
const dateRange = ref<[Date, Date] | null>(null);
const loading = ref(false);
const searchResults = ref<SearchResult[]>([]);

// 分页
const currentPage = ref(1);
const pageSize = 10;
const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return searchResults.value.slice(start, end);
});

// 分类选项
const categories = [
  { label: '💼 工作', value: 'work' },
  { label: '📚 学习', value: 'study' },
  { label: '🎨 创作', value: 'creative' },
  { label: '💻 技术', value: 'technical' },
  { label: '🏠 日常', value: 'daily' }
];

// 搜索结果类型
interface SearchResult {
  tabName: string;
  tabTitle: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  highlightedContent: string;
  timestamp: number;
  category?: string;
  tags?: string[];
}

// 执行搜索
const performSearch = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }

  loading.value = true;
  currentPage.value = 1;

  setTimeout(() => {
    try {
      const results: SearchResult[] = [];
      const query = searchQuery.value.toLowerCase();

      store.tabs.forEach(tab => {
        // 分类筛选
        if (categoryFilter.value && tab.category !== categoryFilter.value) {
          return;
        }

        tab.messages.forEach(message => {
          // 日期筛选
          if (dateRange.value) {
            const messageDate = new Date(message.timestamp);
            const [startDate, endDate] = dateRange.value;
            if (messageDate < startDate || messageDate > endDate) {
              return;
            }
          }

          // 内容匹配
          const content = message.content.toLowerCase();
          if (content.includes(query)) {
            // 高亮显示匹配的内容
            const highlightedContent = highlightMatches(message.content, query);
            
            results.push({
              tabName: tab.name,
              tabTitle: getTabDisplayTitle(tab),
              messageId: message.id,
              role: message.role,
              content: message.content,
              highlightedContent,
              timestamp: message.timestamp,
              category: tab.category,
              tags: tab.tags
            });
          }
        });
      });

      // 按时间倒序排列
      results.sort((a, b) => b.timestamp - a.timestamp);
      
      searchResults.value = results;
    } catch (error) {
      console.error('Search failed:', error);
      ElMessage.error('搜索失败');
    } finally {
      loading.value = false;
    }
  }, 100);
};

// 高级搜索
const performAdvancedSearch = () => {
  // 可以扩展为更复杂的搜索逻辑
  performSearch();
};

// 高亮匹配文本
const highlightMatches = (text: string, query: string): string => {
  if (!query) return text;
  
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  const highlighted = text.replace(regex, '<mark class="search-highlight">$1</mark>');
  
  // 截取前后文本显示
  const maxLength = 150;
  if (highlighted.length > maxLength) {
    const index = highlighted.toLowerCase().indexOf(query.toLowerCase());
    const start = Math.max(0, index - 50);
    const end = Math.min(highlighted.length, start + maxLength);
    return (start > 0 ? '...' : '') + highlighted.slice(start, end) + (end < highlighted.length ? '...' : '');
  }
  
  return highlighted;
};

// 转义正则表达式字符
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// 跳转到具体消息
const jumpToMessage = (result: SearchResult) => {
  // 切换到对应的标签页
  store.handleTabChange(result.tabName);
  
  // 高亮对应的消息
  store.highlightedMessageId = result.messageId;
  
  // 关闭对话框
  visible.value = false;
  
  // 滚动到消息位置（延迟执行确保DOM更新）
  setTimeout(() => {
    const messageElement = document.querySelector(`[data-message-id="${result.messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // 3秒后清除高亮
      setTimeout(() => {
        store.highlightedMessageId = null;
      }, 3000);
    }
  }, 100);
  
  ElMessage.success(`已跳转到"${result.tabTitle}"`);
};

// 辅助方法
const getTabDisplayTitle = (tab: any): string => {
  if (tab.messages.length > 0) {
    const firstUserMessage = tab.messages.find((m: any) => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
    }
  }
  return `新聊天 ${store.tabs.indexOf(tab) + 1}`;
};

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

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }
};

// 监听搜索查询变化
watch(searchQuery, () => {
  if (searchQuery.value.trim()) {
    performSearch();
  } else {
    searchResults.value = [];
  }
});

// 重置页码当筛选条件改变时
watch([categoryFilter, dateRange], () => {
  currentPage.value = 1;
});
</script>

<style scoped>
.history-search-dialog {
  --search-highlight-bg: #ffe564;
  --search-highlight-color: #333;
}

.search-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
}

.search-input-wrapper {
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  z-index: 10;
}

.filter-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.loading-container {
  padding: 20px;
}

.no-results {
  padding: 40px 20px;
  text-align: center;
}

.results-header {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  padding: 0 4px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-primary);
}

.result-item:hover {
  border-color: var(--brand-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.category-icon {
  font-size: 16px;
}

.tab-title {
  font-weight: 500;
  color: var(--text-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  color: white;
  font-weight: 500;
  text-shadow: 0 1px 1px rgba(0,0,0,0.2);
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.message-role {
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.message-role.user {
  background: #e3f2fd;
  color: #1976d2;
}

.message-role.assistant {
  background: #f3e5f5;
  color: #7b1fa2;
}

.result-content {
  line-height: 1.5;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.result-content :deep(.search-highlight) {
  background: var(--search-highlight-bg);
  color: var(--search-highlight-color);
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 500;
}

.result-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
</style>
