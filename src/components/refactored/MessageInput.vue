<template>
  <div class="message-input-container">
    <!-- 附件预览区域 -->
    <AttachmentPreview
      v-if="hasAttachments"
      :attachments="attachments"
      @remove="removeAttachment"
      @clear="clearAttachments"
    />

    <!-- 输入区域 -->
    <div class="input-area" :class="{ 'has-attachments': hasAttachments }">
      <!-- 拖拽覆盖层 -->
      <div
        v-if="isDragOver"
        class="drag-overlay"
        @dragenter="handleDragEnter"
        @dragleave="handleDragLeave"
        @dragover="handleDragOver"
        @drop="handleDrop"
      >
        <div class="drag-message">
          <div class="drag-icon">📎</div>
          <div class="drag-text">拖拽文件到这里</div>
        </div>
      </div>

      <!-- 主输入框 -->
      <div class="input-wrapper">
        <textarea
          ref="textareaRef"
          v-model="userInput"
          class="message-textarea"
          :placeholder="placeholder"
          :disabled="isGenerating"
          @keydown="handleKeydown"
          @paste="handlePaste"
          @input="handleInput"
          rows="1"
        />
        
        <!-- 输入框工具栏 -->
        <div class="input-toolbar">
          <!-- 左侧工具 -->
          <div class="toolbar-left">
            <!-- 文件上传 -->
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept="image/*,.pdf,.docx,.txt,.md,.json"
              @change="handleFileSelect"
              style="display: none"
            />
            <button
              class="toolbar-btn"
              :disabled="isGenerating"
              @click="triggerFileUpload"
              title="上传文件"
            >
              📎
            </button>

            <!-- 联网搜索开关 -->
            <button
              class="toolbar-btn"
              :class="{ active: webSearchEnabled }"
              :disabled="isGenerating"
              @click="toggleWebSearch"
              title="联网搜索"
            >
              🌐
            </button>

            <!-- Agent选择 -->
            <button
              class="toolbar-btn"
              :class="{ active: selectedAgent }"
              :disabled="isGenerating"
              @click="openAgentSelector"
              :title="selectedAgent ? `当前: ${selectedAgent.name}` : '选择AI助手'"
            >
              🤖
            </button>
          </div>

          <!-- 右侧工具 -->
          <div class="toolbar-right">
            <!-- Token计数 -->
            <div v-if="estimatedTokens > 0" class="token-count">
              {{ estimatedTokens }} tokens
            </div>

            <!-- 发送按钮 -->
            <button
              class="send-btn"
              :disabled="!canSend"
              @click="handleSend"
              title="发送消息 (Ctrl+Enter)"
            >
              <span v-if="isGenerating" class="loading-spinner">⏳</span>
              <span v-else>发送</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="currentError" class="error-message">
      {{ currentError.message }}
      <button @click="clearError" class="error-close">×</button>
    </div>

    <!-- 预算警告 -->
    <div v-if="shouldShowBudgetWarning" class="budget-warning">
      ⚠️ Token使用量接近预算限制
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useChat } from '../../composables/useChat';
import { useAttachments } from '../../composables/useAttachments';
import { useAgentsStore } from '../../stores/useAgentsStore';
import AttachmentPreview from '../common/AttachmentPreview.vue';

// Props & Emits
const props = withDefaults(defineProps<{
  placeholder?: string;
  maxLength?: number;
}>(), {
  placeholder: '输入你的问题...',
  maxLength: 32000,
});

const emit = defineEmits<{
  send: [content: string, webSearch: boolean];
  focus: [];
  blur: [];
}>();

// Composables
const {
  userInput,
  isGenerating,
  currentError,
  canSend,
  shouldShowBudgetWarning,
  sendMessage,
  clearError,
  estimateTokens,
} = useChat();

const {
  attachments,
  hasAttachments,
  isDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  handleFileSelect,
  removeAttachment,
  clearAttachments,
} = useAttachments();

const agentsStore = useAgentsStore();
const { selectedAgent } = storeToRefs(agentsStore);

// Refs
const textareaRef = ref<HTMLTextAreaElement>();
const fileInputRef = ref<HTMLInputElement>();

// State
const webSearchEnabled = ref(false);

// Computed
const estimatedTokens = computed(() => {
  if (!userInput.value) return 0;
  return estimateTokens(userInput.value);
});

// Methods
const handleSend = async () => {
  if (!canSend.value) return;

  try {
    await sendMessage(webSearchEnabled.value);
    emit('send', userInput.value, webSearchEnabled.value);
    
    // 清空输入并重置高度
    userInput.value = '';
    resetTextareaHeight();
  } catch (error) {
    console.error('发送消息失败:', error);
  }
};

const handleKeydown = (e: KeyboardEvent) => {
  // Ctrl+Enter 发送
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    handleSend();
    return;
  }

  // Enter 换行（但不发送）
  if (e.key === 'Enter' && !e.shiftKey) {
    // 允许正常换行
    nextTick(() => {
      adjustTextareaHeight();
    });
  }

  // Escape 清空输入
  if (e.key === 'Escape') {
    userInput.value = '';
    resetTextareaHeight();
  }
};

const handleInput = () => {
  adjustTextareaHeight();
};

const handlePaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  // 检查是否有文件
  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  if (files.length > 0) {
    e.preventDefault();
    try {
      // 使用附件组合式API处理文件
      await Promise.all(files.map(file => handleFileSelect({ target: { files: [file] } } as any)));
    } catch (error) {
      console.error('粘贴文件失败:', error);
    }
  }
};

const adjustTextareaHeight = () => {
  if (!textareaRef.value) return;

  const textarea = textareaRef.value;
  textarea.style.height = 'auto';
  
  const maxHeight = 200; // 最大高度
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  
  textarea.style.height = `${newHeight}px`;
  textarea.style.overflowY = newHeight >= maxHeight ? 'auto' : 'hidden';
};

const resetTextareaHeight = () => {
  if (!textareaRef.value) return;
  textareaRef.value.style.height = 'auto';
};

const triggerFileUpload = () => {
  fileInputRef.value?.click();
};

const toggleWebSearch = () => {
  webSearchEnabled.value = !webSearchEnabled.value;
};

const openAgentSelector = () => {
  agentsStore.openAgentSelector();
};

const focus = () => {
  textareaRef.value?.focus();
  emit('focus');
};

const blur = () => {
  textareaRef.value?.blur();
  emit('blur');
};

// Watchers
watch(userInput, () => {
  nextTick(() => {
    adjustTextareaHeight();
  });
});

// 暴露方法给父组件
defineExpose({
  focus,
  blur,
});
</script>

<style scoped>
.message-input-container {
  position: relative;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
}

.input-area {
  position: relative;
  padding: 16px;
}

.input-area.has-attachments {
  padding-top: 8px;
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--primary-rgb), 0.1);
  border: 2px dashed var(--primary-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.drag-message {
  text-align: center;
  color: var(--primary-color);
}

.drag-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.drag-text {
  font-size: 16px;
  font-weight: 500;
}

.input-wrapper {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: var(--primary-color);
}

.message-textarea {
  width: 100%;
  min-height: 44px;
  max-height: 200px;
  padding: 12px 16px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.4;
  resize: none;
  font-family: inherit;
}

.message-textarea::placeholder {
  color: var(--text-secondary);
}

.message-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: 0 0 12px 12px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background: var(--primary-color);
  color: white;
}

.token-count {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.send-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: var(--primary-color);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: var(--primary-hover);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 16px 0;
  padding: 8px 12px;
  background: var(--error-bg);
  color: var(--error-color);
  border-radius: 6px;
  font-size: 14px;
}

.error-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  margin-left: 8px;
}

.budget-warning {
  margin: 8px 16px 0;
  padding: 8px 12px;
  background: var(--warning-bg);
  color: var(--warning-color);
  border-radius: 6px;
  font-size: 14px;
}
</style>
