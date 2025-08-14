<template>
  <div 
    ref="messagesContainer" 
    class="messages-container"
    @scroll="handleScroll"
  >
    <!-- 消息列表 -->
    <div class="messages-list">
      <!-- 加载更多按钮 -->
      <div v-if="hasMoreMessages" class="load-more">
        <button 
          @click="loadMoreMessages" 
          :disabled="isLoadingMore"
          class="load-more-btn"
        >
          {{ isLoadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>

      <!-- 消息项 -->
      <MessageItem
        v-for="message in displayMessages"
        :key="message.id"
        :message="message"
        :is-highlighted="highlightedMessageId === message.id"
        :show-avatar="shouldShowAvatar(message)"
        :show-timestamp="shouldShowTimestamp(message)"
        @retry="handleRetry"
        @delete="handleDelete"
        @copy="handleCopy"
        @edit="handleEdit"
      />

      <!-- 正在生成指示器 -->
      <div v-if="isGenerating" class="generating-indicator">
        <div class="generating-dot"></div>
        <div class="generating-dot"></div>
        <div class="generating-dot"></div>
      </div>

      <!-- 滚动到底部按钮 -->
      <Transition name="fade">
        <button
          v-if="showScrollToBottom"
          @click="scrollToBottom"
          class="scroll-to-bottom"
          title="滚动到底部"
        >
          ↓
        </button>
      </Transition>
    </div>

    <!-- 搜索高亮覆盖层 -->
    <div v-if="searchQuery" class="search-overlay">
      <div class="search-results">
        找到 {{ searchResultsCount }} 条结果
        <button @click="clearSearch" class="search-close">×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useTabsStore } from '../../stores/useTabsStore';
import { useMessagesStore } from '../../stores/useMessagesStore';
import { useChat } from '../../composables/useChat';
import { useSearch } from '../../composables/useSearch';
import { Message, MessageId } from '../../types';
import MessageItem from './MessageItem.vue';

// Props
const props = withDefaults(defineProps<{
  pageSize?: number;
  autoScroll?: boolean;
  showTimestamps?: boolean;
  enableVirtualScroll?: boolean;
}>(), {
  pageSize: 50,
  autoScroll: true,
  showTimestamps: true,
  enableVirtualScroll: false,
});

// Emits
const emit = defineEmits<{
  messageRetry: [messageId: MessageId];
  messageDelete: [messageId: MessageId];
  messageEdit: [messageId: MessageId, newContent: string];
  scroll: [{ scrollTop: number; scrollHeight: number; clientHeight: number }];
}>();

// Stores
const tabsStore = useTabsStore();
const messagesStore = useMessagesStore();
const { activeTab } = storeToRefs(tabsStore);

// Composables
const { isGenerating, retryMessage, deleteMessage } = useChat();
const { 
  searchQuery, 
  searchResultsCount, 
  highlightedMessageId, 
  clearSearch 
} = useSearch();

// Refs
const messagesContainer = ref<HTMLElement>();

// State
const isLoadingMore = ref(false);
const showScrollToBottom = ref(false);
const currentPage = ref(1);
const lastScrollTop = ref(0);

// Computed
const messages = computed(() => {
  if (!activeTab.value) return [];
  return messagesStore.getMessages(activeTab.value.id);
});

const displayMessages = computed(() => {
  // 分页显示消息
  if (props.enableVirtualScroll) {
    return messages.value; // 虚拟滚动时显示所有消息
  }
  
  const startIndex = Math.max(0, messages.value.length - (currentPage.value * props.pageSize));
  return messages.value.slice(startIndex);
});

const hasMoreMessages = computed(() => {
  return messages.value.length > displayMessages.value.length;
});

const isAtBottom = computed(() => {
  if (!messagesContainer.value) return true;
  
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  return scrollHeight - scrollTop - clientHeight < 100;
});

// Methods
const shouldShowAvatar = (message: Message): boolean => {
  const messageIndex = messages.value.findIndex(m => m.id === message.id);
  if (messageIndex === 0) return true;
  
  const prevMessage = messages.value[messageIndex - 1];
  return prevMessage.role !== message.role;
};

const shouldShowTimestamp = (message: Message): boolean => {
  if (!props.showTimestamps) return false;
  
  const messageIndex = messages.value.findIndex(m => m.id === message.id);
  if (messageIndex === 0) return true;
  
  const prevMessage = messages.value[messageIndex - 1];
  const timeDiff = message.timestamp - prevMessage.timestamp;
  
  // 如果超过5分钟，显示时间戳
  return timeDiff > 5 * 60 * 1000;
};

const handleScroll = () => {
  if (!messagesContainer.value) return;
  
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;
  
  // 发送滚动事件
  emit('scroll', { scrollTop, scrollHeight, clientHeight });
  
  // 更新显示滚动到底部按钮的状态
  showScrollToBottom.value = scrollHeight - scrollTop - clientHeight > 100;
  
  // 检查是否需要自动加载更多
  if (scrollTop < 100 && hasMoreMessages.value && !isLoadingMore.value) {
    loadMoreMessages();
  }
  
  lastScrollTop.value = scrollTop;
};

const loadMoreMessages = async () => {
  if (isLoadingMore.value || !hasMoreMessages.value) return;
  
  try {
    isLoadingMore.value = true;
    currentPage.value++;
    
    // 保持滚动位置
    await nextTick();
    if (messagesContainer.value) {
      const newScrollTop = messagesContainer.value.scrollHeight - lastScrollTop.value;
      messagesContainer.value.scrollTop = newScrollTop;
    }
  } finally {
    isLoadingMore.value = false;
  }
};

const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  });
};

const scrollToMessage = (messageId: MessageId) => {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageElement && messagesContainer.value) {
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

const handleRetry = async (messageId: MessageId) => {
  try {
    await retryMessage(messageId);
    emit('messageRetry', messageId);
  } catch (error) {
    console.error('重试消息失败:', error);
  }
};

const handleDelete = async (messageId: MessageId) => {
  try {
    await deleteMessage(messageId);
    emit('messageDelete', messageId);
  } catch (error) {
    console.error('删除消息失败:', error);
  }
};

const handleCopy = (message: Message) => {
  navigator.clipboard.writeText(message.content);
  // 这里可以显示复制成功的提示
};

const handleEdit = (messageId: MessageId, newContent: string) => {
  emit('messageEdit', messageId, newContent);
};

// 监听新消息自动滚动
watch(
  () => messages.value.length,
  (newLength, oldLength) => {
    if (newLength > oldLength && props.autoScroll && isAtBottom.value) {
      scrollToBottom();
    }
  }
);

// 监听生成状态变化
watch(isGenerating, (generating) => {
  if (generating && props.autoScroll) {
    scrollToBottom();
  }
});

// 监听标签切换
watch(
  () => activeTab.value?.id,
  () => {
    // 重置分页状态
    currentPage.value = 1;
    nextTick(() => {
      scrollToBottom(false);
    });
  }
);

// 生命周期
onMounted(() => {
  // 初始滚动到底部
  scrollToBottom(false);
  
  // 设置消息容器引用到 store
  messagesStore.messagesContainer = messagesContainer.value;
});

onUnmounted(() => {
  messagesStore.messagesContainer = null;
});

// 暴露方法给父组件
defineExpose({
  scrollToBottom,
  scrollToMessage,
  loadMoreMessages,
});
</script>

<style scoped>
.messages-container {
  flex: 1;
  overflow-y: auto;
  scroll-behavior: smooth;
  position: relative;
}

.messages-list {
  position: relative;
  min-height: 100%;
  padding: 16px;
}

.load-more {
  text-align: center;
  padding: 16px;
  margin-bottom: 16px;
}

.load-more-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:hover:not(:disabled) {
  background: var(--bg-hover);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.generating-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 16px 0;
  margin-left: 48px; /* AI消息的左边距 */
}

.generating-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-color);
  animation: pulse 1.4s ease-in-out infinite both;
}

.generating-dot:nth-child(1) { animation-delay: -0.32s; }
.generating-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes pulse {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.scroll-to-bottom {
  position: fixed;
  bottom: 100px;
  right: 24px;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  z-index: 10;
}

.scroll-to-bottom:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.search-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 5;
}

.search-results {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px;
  padding: 8px 12px;
  background: var(--primary-color);
  color: white;
  border-radius: 6px;
  font-size: 14px;
}

.search-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
  font-size: 18px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .messages-list {
    padding: 8px;
  }
  
  .scroll-to-bottom {
    bottom: 80px;
    right: 16px;
    width: 36px;
    height: 36px;
    font-size: 14px;
  }
}
</style>
