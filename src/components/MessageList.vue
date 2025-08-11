<template>
  <div class="messages-container">
    <div class="messages" ref="messagesContainer" @scroll="handleScroll">
      
      <!-- 消息列表 -->
      <div v-if="store.currentTab && store.currentTab.messages && store.currentTab.messages.length > 0" class="message-list">
        <div 
          v-for="message in visibleMessages" 
          :key="message.id" 
          :id="message.id" 
          :class="[
            'message-wrapper', 
            `message-${message.role}`, 
            { 'highlighted': store.highlightedMessageId === message.id }
          ]"

        >
          <!-- 用户消息 -->
          <div v-if="message.role === 'user'" class="user-message">
            <div class="user-content">
              <div class="message-bubble user-bubble">
                <template v-if="Array.isArray(message.richContent) && message.richContent.length">
                  <div class="rich-block">
                    <template v-for="(part, idx) in message.richContent" :key="idx">
                      <div v-if="part.type==='text'" class="rich-text" v-html="renderTextWithLinks(part.text || '')"></div>
                      <img v-else-if="part.type==='image_url' && part.image_url?.url" :src="part.image_url.url" class="rich-image" />
                    </template>
                  </div>
                </template>
                <template v-else-if="isCodeBlock(message.content)">
                  <CodeBlock :code="stripBackticks(message.content)" />
                </template>
                <template v-else>
                  <div class="rich-text" v-html="renderTextWithLinks(message.content)"></div>
                </template>
                <div class="bubble-actions">
                  <MessageActions
                    :message-role="message.role"
                    :is-retrying="isMessageRetrying(message.id)"
                    @copy="copyMessage(message.content)"
                    @delete="deleteMessage(message.id)"
                    @retry="retryMessage(message)"
                  />
                </div>
              </div>
            </div>
            <div class="user-avatar">
              <img v-if="store.userAvatar" :src="store.userAvatar" alt="avatar" />
              <span v-else class="avatar-text">{{ store.userInitial }}</span>
            </div>
          </div>
          
          <!-- AI助手消息 -->
          <div v-else class="assistant-message">
            <div class="assistant-avatar">
              <div class="avatar-icon">🤖</div>
            </div>
            <div class="assistant-content">
              <div class="message-bubble assistant-bubble">
                <div v-if="message.content.trim()" class="message-text">
                  <template v-if="isCodeBlock(message.content)">
                    <CodeBlock :code="stripBackticks(message.content)" />
                  </template>
                  <template v-else>
                    <div v-html="renderTextWithLinks(message.content)"></div>
                  </template>
                  <!-- OpenRouter 搜索注释 -->
                  <div v-if="Array.isArray(message.searchAnnotations) && message.searchAnnotations.length" class="search-annotations">
                    <div class="annotation-header">
                      <span class="annotation-icon">🌐</span>
                      <span class="annotation-title">搜索来源</span>
                    </div>
                    <div class="annotation-list">
                      <div v-for="(annotation, idx) in message.searchAnnotations" :key="idx" class="annotation-item">
                        <div class="annotation-index">{{ idx + 1 }}</div>
                        <div class="annotation-content">
                          <div class="annotation-title-text">{{ annotation.url_citation.title || '搜索结果' }}</div>
                          <a :href="annotation.url_citation.url" target="_blank" rel="noopener noreferrer" class="annotation-url">{{ annotation.url_citation.url }}</a>
                          <button class="preview-btn" @click.prevent="openPreviewFor(annotation.url_citation.url, annotation.url_citation.title)">预览</button>
                          <button class="preview-btn" @click.prevent="savePageToKB(annotation.url_citation.url, annotation.url_citation.title)">入库</button>
                          <div v-if="annotation.url_citation.content" class="annotation-preview">{{ annotation.url_citation.content.slice(0, 150) }}...</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="Array.isArray(message.citations) && message.citations.length" class="citations">
                    <div class="cite-header">
                      <span class="cite-icon">🔗</span>
                      <span class="cite-title">参考来源</span>
                    </div>
                    <div class="cite-list">
                      <div v-for="c in message.citations" :key="c.index" class="cite-item">
                        <div class="cite-index">{{ c.index }}</div>
                        <div class="cite-content">
                          <div class="cite-text">{{ c.title || '来源页面' }}</div>
                          <a :href="c.url" target="_blank" rel="noopener noreferrer" class="cite-url">{{ c.url }}</a>
                          <button class="preview-btn" @click.prevent="openPreviewFor(c.url, c.title)">预览</button>
                          <button class="preview-btn" @click.prevent="savePageToKB(c.url, c.title)">入库</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="bubble-actions">
                    <MessageActions
                      :message-role="message.role"
                      :is-loading="isMessageLoading(message)"
                      :is-retrying="isMessageRetrying(message.id)"
                      :can-cancel="true"
                      @copy="copyMessage(message.content)"
                      @delete="deleteMessage(message.id)"
                      @retry="retryMessage(message)"
                      @cancel="cancelMessage"
                    />
                  </div>
                </div>
                <div v-else class="thinking-indicator">
                  <span class="thinking-text">{{ t('messages.thinking') }}</span>
                  <span class="thinking-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                  </span>
                </div>
              </div>
                 <div v-if="message.usage || message.responseTime || message.model || message.provider" class="message-info">
                <div v-if="message.provider" class="info-item">
                  <span class="info-icon">🌐</span>
                  <span class="info-text">{{ formatProviderName(message.provider) }}</span>
                </div>
                <div v-if="message.model" class="info-item">
                  <span class="info-icon">🤖</span>
                  <span class="info-text">{{ formatModelName(message.model) }}</span>
                </div>
                <div v-if="message.responseTime" class="info-item">
                  <span class="info-icon">⏱️</span>
                  <span class="info-text">{{ formatResponseTime(message.responseTime) }}</span>
                </div>
                <div v-if="message.usage" class="info-item">
                  <span class="info-icon">🔢</span>
                  <span class="info-text">{{ message.usage.total_tokens }} {{ t('chat.tokenInfo.tokens') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 - 类似Grok的欢迎界面 -->
      <div v-else class="empty-state">
        <div class="empty-content">
          <div class="empty-icon">💬</div>
          <div class="empty-title">{{ t('chat.emptyState') }}</div>
          <div class="empty-description">{{ t('messages.quickActions.deepThink') }} · {{ t('messages.quickActions.imageEdit') }}</div>
          
          
          
          <!-- 底部状态信息 -->
          <div class="status-info">
            <div class="status-item">
              <span class="status-icon">✓</span>
              <span class="status-text">{{ t('common.info') }}</span>
            </div>
            
            <div class="status-item">
              <span class="status-icon">🔒</span>
              <span class="status-text">{{ t('settings.ai.security') }}</span>
            </div>
            
            <div class="status-item">
              <span class="status-icon">👥</span>
              <span class="status-text">ChatLLM</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 加载更多指示器 -->
      <div v-if="isLoadingMore" class="loading-indicator">
        <div class="loading-spinner"></div>
        <span>{{ t('messages.loadingHistory') }}</span>
      </div>
      
    </div>
  </div>
  
  <!-- 网页预览对话框 -->
  <WebPreviewDialog v-model="previewOpen" :url="previewUrl" :title="previewTitle" @save="savePageToKB(previewUrl, previewTitle)" />
</template>

<script setup lang="ts">
import { useChatStore } from '../store/chat';
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
// 费用统计已移除
import CodeBlock from './common/CodeBlock.vue';
import MessageActions from './common/MessageActions.vue';
import WebPreviewDialog from './common/WebPreviewDialog.vue';
import { copyToClipboard } from '../services/clipboard';
import { useChatMutation } from '../services/router/modelRouter';
import { fetchReadable } from '../services/search/web';
import { chunkText } from '../services/rag/chunker';
import { createDoc, appendChunks } from '../services/rag/store';

const store = useChatStore();
const { t } = useI18n();
const chatMutation = useChatMutation();
const previewOpen = ref(false);
const previewUrl = ref('');
const previewTitle = ref('');
const openPreviewFor = (url: string, title?: string) => { previewUrl.value = url; previewTitle.value = title || ''; previewOpen.value = true; };
const savePageToKB = async (url: string, title?: string) => {
  try {
    const text = await fetchReadable(url);
    if (!text || text.length < 50) {
      (window as any).ElMessage?.warning?.('该页面无可用正文，未入库');
      return;
    }
    const docId = `web-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    await createDoc({ id: docId, name: title || url, createdAt: Date.now(), size: text.length });
    const chunks = chunkText(docId, text);
    await appendChunks(chunks, 200);
    (window as any).ElMessage?.success?.('已保存到知识库');
  } catch (e) {
    (window as any).ElMessage?.error?.('保存失败');
  }
};

// TanStack Mutation 状态
const currentlyRetryingMessageId = ref<string | null>(null);

// 检查消息是否正在加载中（基于内容是否为空）
const isMessageLoading = (message: any) => {
  return message.role === 'assistant' && !message.content && chatMutation.isPending.value;
};

// 检查消息是否正在重试中
const isMessageRetrying = (messageId: string) => {
  return currentlyRetryingMessageId.value === messageId && chatMutation.isPending.value;
};

// 快捷按钮已移除

// 格式化函数
const formatResponseTime = (ms: number) => {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    return `${(ms / 60000).toFixed(1)}m`;
  }
};

// 消息操作与代码块辅助
const isCodeBlock = (content: string) => /^```[\s\S]*```\s*$/.test(content || '');
const stripBackticks = (content: string) => (content || '').replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```\s*$/, '');
const copyMessage = async (text: string) => { await copyToClipboard(text || ''); };

// 将纯文本安全地转换为带可点击链接的HTML
const escapeHTML = (text: string) => (
  (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
);

const escapeAttr = (text: string) => (
  (text || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
);

const renderTextWithLinks = (text: string) => {
  const escaped = escapeHTML(text || '');
  // 更严格的 URL 匹配（避免把后续中文一起吞进去）
  // 仅允许 RFC3986 常见字符，排除中文与全角标点
  const urlRegex = /(https?:\/\/[A-Za-z0-9\-._~%:/?#\[\]@!$&'()*+,;=]+|www\.[A-Za-z0-9\-._~%:/?#\[\]@!$&'()*+,;=]+)/gi;

  const withLinks = escaped.replace(urlRegex, (raw) => {
    // 处理结尾标点（中英文）不纳入链接
    let url = raw;
    let trailing = '';
    const trailingRegex = /[\)\]\*＞》】）>、，。,;；!！?？:：]+$/;
    while (trailingRegex.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }
    const href = url.startsWith('http') ? url : `https://${url}`;
    const safeHref = escapeAttr(href);
    const safeText = url; // 已经过 escapeHTML 处理后的片段
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${safeText}</a>${trailing}`;
  });

  // 保留换行
  return withLinks.replace(/\n/g, '<br/>');
};
const deleteMessage = (id: string) => {
  const tab = store.currentTab; if (!tab) return;
  const idx = tab.messages.findIndex(m => m.id === id);
  if (idx >= 0) { tab.messages.splice(idx, 1); store.persistState?.(); }
};
const retryMessage = async (message: any) => {
  const tab = store.currentTab; 
  if (!tab || currentlyRetryingMessageId.value) return;

  try {
    currentlyRetryingMessageId.value = message.id;
    
    // 删除紧随其后的助手消息
    const userIdx = tab.messages.findIndex(m => m.id === message.id);
    if (userIdx >= 0) {
      const nextAssistantIdx = tab.messages.slice(userIdx + 1).findIndex(m => m.role === 'assistant');
      if (nextAssistantIdx >= 0) {
        tab.messages.splice(userIdx + 1 + nextAssistantIdx, 1);
      }
    }
    
    // 恢复用户输入和附件
    store.userInput = message.content || '';
    if (Array.isArray(message.attachmentsSnapshot) && message.attachmentsSnapshot.length) {
      tab.attachments = message.attachmentsSnapshot.map((a: any) => ({ ...a }));
    }

    // 创建新的消息对
    const webSearchEnabled = message.webSearchEnabled || false;
    const messagePair = store.createMessagePair(webSearchEnabled);
    if (!messagePair) return;

    const { userMessage, assistantMessage, currentProvider: provider, currentModel: model } = messagePair;
    
    // 添加新消息到UI
    store.userInput = '';
    store.scrollToBottom();
    tab.messages.push(assistantMessage);

    // 准备有效负载
    const payload = await store.prepareMessagePayload(userMessage, assistantMessage, webSearchEnabled);
    if (!payload) return;

    // 清空附件
    tab.attachments = [];

    // 使用 TanStack Mutation 重试
    await chatMutation.mutateAsync({
      provider,
      model,
      messages: payload.messagesToSend,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      attachments: payload.attachmentsToSend,
      webSearchEnabled
    });
  } catch (error: any) {
    console.error('重试消息失败:', error);
    
    // 错误处理
    const message_str = String(error?.message || '');
    const assistant = tab.messages.find(m => m.role === 'assistant' && !m.content);
    if (assistant) {
      if (/image input not supported/i.test(message_str)) {
        assistant.content = t('errors.imageNotSupported') || '当前模型不支持图像输入，请切换到支持多模态的模型，或移除图片后重试。';
      } else {
        assistant.content = t('errors.generic') || '重试失败，请重试。';
      }
      store.saveTabsToStorage();
    }
  } finally {
    currentlyRetryingMessageId.value = null;
  }
};

// 取消当前请求
const cancelMessage = () => {
  // TanStack Query 的取消功能需要结合 AbortController
  // 这里我们先简单重置状态，实际的取消需要在 mutation 中实现
  if (chatMutation.reset) {
    chatMutation.reset();
  }
  currentlyRetryingMessageId.value = null;
};

const formatModelName = (model: string) => {
  if (model.includes('moonshot')) return 'Moonshot';
  if (model.includes('gpt')) return 'GPT';
  if (model.includes('claude')) return 'Claude';
  if (model.includes('deepseek')) return 'DeepSeek';
  if (model.includes('zhipu')) return 'ChatGLM';
  if (model.includes('qwen')) return 'Qwen';
  
  const parts = model.split('-');
  return parts[0] || model;
};

const formatProviderName = (provider: string) => {
  if (!provider) return '';
  const key = provider.toLowerCase();
  const translationKey = `providers.${key}`;
  const name = t(translationKey);
  // 如果翻译key和返回值相同，说明没有找到翻译，返回原始值
  return name === translationKey ? provider : name;
};
const messagesContainer = ref<HTMLDivElement | null>(null);

// 费用统计已移除

// 性能优化：消息分页
const PAGE_SIZE = 50;
const currentPage = ref(1);
const isLoadingMore = ref(false);
const hasMoreMessages = computed(() => {
  if (!store.currentTab) return false;
  return store.currentTab.messages.length > currentPage.value * PAGE_SIZE;
});

const visibleMessages = computed(() => {
  if (!store.currentTab) return [];
  return store.currentTab.messages.slice(0, currentPage.value * PAGE_SIZE);
});

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 处理滚动事件（用于懒加载）
const handleScroll = async () => {
  if (!messagesContainer.value || isLoadingMore.value || !hasMoreMessages.value) return;
  
  const { scrollTop } = messagesContainer.value;
  
  // 如果滚动到顶部附近，加载更多消息
  if (scrollTop < 100) {
    await loadMoreMessages();
  }
};

// 加载更多消息
const loadMoreMessages = async () => {
  if (isLoadingMore.value || !hasMoreMessages.value) return;
  
  try {
    isLoadingMore.value = true;
    
    // 模拟加载延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    
    currentPage.value++;
  } finally {
    isLoadingMore.value = false;
  }
};

// 重置分页
const resetPagination = () => {
  currentPage.value = 1;
  isLoadingMore.value = false;
};

// 监听消息变化
watch(() => store.currentTab?.messages, () => {
  resetPagination();
  scrollToBottom();
}, { deep: true });

// 监听当前标签页变化
watch(() => store.currentTab, () => {
  resetPagination();
  scrollToBottom();
});

// 监听高亮消息
watch(() => store.highlightedMessageId, (messageId) => {
  if (messageId) {
    nextTick(() => {
      const element = document.getElementById(messageId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }
});

// 支持 URL 锚点 #msg-xxx 初始定位
onMounted(() => {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#msg-')) {
    const id = hash.slice(1);
    nextTick(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
});

// 组件挂载时滚动到底部
onMounted(() => {
  scrollToBottom();
  if (messagesContainer.value) {
    store.messagesContainer = messagesContainer.value;
  }
});
  
// 预览对话框
</script>

<style scoped>
.messages-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
  justify-content: center;
  align-items: center;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  background: var(--bg-secondary) !important;
  width: 100%;
  height: 100%;
}

.messages:has(.empty-state) {
  justify-content: center;
}

.message-list {
  width: 100%;
  /* 让消息占据整个可用宽度，便于用户消息贴近右侧 */
  max-width: none;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-wrapper {
  width: 100%;
  animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-wrapper.highlighted {
  animation: highlightPulse 2s ease-out;
}

@keyframes highlightPulse {
  0%, 100% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(59, 130, 246, 0.1);
    border-radius: 12px;
  }
}

/* 用户消息样式 */
.user-message {
  display: flex !important;
  justify-content: flex-end !important; /* 右对齐 */
  align-items: flex-start !important;
  margin-bottom: 8px;
  gap: 12px;
  flex-direction: row !important;
  /* 占满一行，并把自身推到最右侧 */
  width: 100%;
  margin-left: auto;
}

.user-bubble {
  background: var(--chat-user-bg);
  color: var(--text-primary);
  border-radius: 18px;
  padding: 12px 16px;
  max-width: 70%;
  min-width: fit-content;
  word-wrap: break-word;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.4;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 右侧用户内容区（保持文本在头像左边） */
.user-content {
  order: 1;
}

/* 用户头像（右侧显示） */
.user-avatar {
  order: 2;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* AI助手消息样式 */
.assistant-message {
  display: flex !important;
  justify-content: flex-start !important;
  align-items: flex-start !important;
  gap: 12px;
  margin-bottom: 8px;
  flex-direction: row !important;
  width: 100%;
}

.assistant-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
}

.avatar-icon {
  font-size: 16px;
}

.assistant-content { flex: 1; max-width: 70%; }

.assistant-bubble {
  background: var(--chat-assistant-bg);
  color: var(--text-primary);
  border: none;
  border-radius: 18px;
  padding: 12px 16px;
  word-wrap: break-word;
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.4;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.message-bubble {
  display: inline-block;
  position: relative;
}

.message-bubble a {
  color: var(--primary-color);
  text-decoration: none;
  word-break: break-all;
}

.message-bubble a:hover {
  text-decoration: underline;
}

.bubble-actions {
  margin-top: 6px;
  display: flex;
  gap: 6px;
}

.message-info {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: all 0.2s ease;
}

.info-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

.info-icon {
  font-size: 12px;
}

.info-text {
  font-family: monospace;
  font-weight: 600;
  font-size: 11px;
}

/* AI思考中动画 */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-style: italic;
  padding: 4px 0;
}

.thinking-text {
  font-size: 14px;
  font-weight: 400;
}

.thinking-dots {
  display: flex;
  gap: 3px;
  align-items: center;
}

.thinking-dots .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--text-tertiary);
  display: inline-block;
  animation: thinking 1.4s infinite ease-in-out both;
}

.thinking-dots .dot:nth-child(1) {
  animation-delay: -0.32s;
}

.thinking-dots .dot:nth-child(2) {
  animation-delay: -0.16s;
}

.thinking-dots .dot:nth-child(3) {
  animation-delay: 0s;
}

@keyframes thinking {
  0%, 80%, 100% {
    transform: scale(0.3);
    opacity: 0.3;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.message-text {
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* 搜索注释样式 */
.search-annotations { 
  margin-top: 12px; 
  padding: 12px; 
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
}

.annotation-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.annotation-icon {
  font-size: 14px;
}

.annotation-title {
  font-size: 13px;
  color: var(--text-primary);
}

.annotation-list { 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
}

.annotation-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.annotation-item:hover {
  background: var(--bg-hover);
}

.annotation-index {
  background: #1890ff;
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 6px;
  border-radius: 4px;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.annotation-content {
  flex: 1;
  min-width: 0;
}

.annotation-title-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.annotation-url {
  font-size: 11px;
  color: var(--primary-color);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  margin-bottom: 4px;
}

.annotation-url:hover {
  text-decoration: underline;
}

.annotation-preview {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin-top: 4px;
}

.citations { 
  margin-top: 12px; 
  padding: 12px; 
  background: var(--bg-tertiary);
  border: none;
  border-radius: 8px;
}

.cite-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}

.cite-icon {
  font-size: 14px;
}

.cite-title {
  font-size: 13px;
  color: var(--text-primary);
}

.cite-list { 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
}

.cite-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.cite-item:hover {
  background: var(--bg-hover);
}

.cite-index {
  background: var(--primary-color);
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 6px;
  border-radius: 4px;
  min-width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.cite-content {
  flex: 1;
  min-width: 0;
}

.cite-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cite-url {
  font-size: 11px;
  color: var(--primary-color);
  text-decoration: none;
  word-break: break-all;
  line-height: 1.3;
}

.cite-url:hover {
  text-decoration: underline;
}

.rich-block { display:flex; flex-direction: column; gap: 8px; }
.rich-image { max-width: 360px; border-radius: 8px; border: none; }
.rich-text { white-space: pre-wrap; }

/* 响应式设计 */
@media (max-width: 768px) {
  .message-info {
    gap: 6px;
  }
  
  .info-item {
    font-size: 10px;
    padding: 3px 6px;
  }
  
  .info-text {
  font-size: 10px;
  }
  
  .info-icon {
    font-size: 11px;
  }
  
  .thinking-text {
    font-size: 12px;
  }
  
  .thinking-dots .dot {
    width: 4px;
    height: 4px;
  }
}

.empty-state {
  flex: 1;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: transparent !important;
  text-align: center;
  min-height: 100vh;
}

.empty-content {
  text-align: center;
  max-width: 600px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
  opacity: 0.8;
}

.empty-title {
  font-size: 32px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 12px;
}

.empty-description {
  font-size: 16px;
  color: #666666;
  margin-bottom: 32px;
  line-height: 1.5;
}

.feature-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.feature-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-primary);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  color: var(--text-primary);
}

.feature-btn:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
  transform: translateY(-1px);
}

.feature-icon {
  font-size: 16px;
}

.feature-text {
  font-weight: 500;
}

.status-info {
  display: flex;
  gap: 24px;
  justify-content: center;
  flex-wrap: wrap;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #888888;
}

.status-icon {
  font-size: 14px;
}

.status-text {
  font-weight: 500;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  color: #666666;
  font-size: 14px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e5e5;
  border-top: 2px solid #666666;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 滚动条样式 */
.messages::-webkit-scrollbar {
  width: 6px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .messages {
    padding: 20px 16px;
  }
  
  .empty-title {
    font-size: 28px;
  }
  
  .empty-description {
    font-size: 14px;
  }
  
  .feature-buttons {
    gap: 8px;
  }
  
  .feature-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .status-info {
    gap: 16px;
  }
  
  .status-item {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .messages {
    padding: 16px 12px;
  }
  
  .empty-title {
    font-size: 24px;
  }
  
  .feature-buttons {
    flex-direction: column;
    align-items: center;
  }
  
  .feature-btn {
    min-width: 150px;
  }
  
  .status-info {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
}
</style>