<template>
  <div class="actions">
    <button class="btn" :title="t('common.copy')" @click="$emit('copy')">📋</button>
    <button class="btn" :title="t('common.delete')" @click="$emit('delete')">🗑️</button>
    
    <!-- 根据消息状态显示不同按钮 -->
    <template v-if="messageRole === 'assistant'">
      <!-- 如果是加载中的助手消息，显示取消按钮 -->
      <button 
        v-if="isLoading" 
        class="btn btn-cancel" 
        :title="t('common.cancel')" 
        @click="$emit('cancel')"
        :disabled="!canCancel"
      >
        ⏹️
      </button>
      <!-- 如果是已完成或失败的助手消息，显示重试按钮 -->
      <button 
        v-else 
        class="btn btn-retry" 
        :title="t('chat.retry')" 
        @click="$emit('retry')"
        :disabled="isRetrying"
      >
        <span v-if="isRetrying" class="spinner">⟳</span>
        <span v-else>↻</span>
      </button>
    </template>
    <!-- 用户消息只显示重试按钮 -->
    <template v-else>
      <button 
        class="btn btn-retry" 
        :title="t('chat.retry')" 
        @click="$emit('retry')"
        :disabled="isRetrying"
      >
        <span v-if="isRetrying" class="spinner">⟳</span>
        <span v-else>↻</span>
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface Props {
  messageRole?: 'user' | 'assistant';
  isLoading?: boolean;
  isRetrying?: boolean;
  canCancel?: boolean;
}

withDefaults(defineProps<Props>(), {
  messageRole: 'user',
  isLoading: false,
  isRetrying: false,
  canCancel: true,
});

defineEmits<{ 
  (e: 'copy'): void; 
  (e: 'delete'): void; 
  (e: 'retry'): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
</script>

<style scoped>
.actions { display: inline-flex; gap: 6px; }
.btn { border: 1px solid var(--border-color); background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 4px 6px; cursor: pointer; transition: all 0.2s ease; font-size: 14px; display: flex; align-items: center; justify-content: center; min-width: 24px; min-height: 24px; box-shadow: var(--shadow-sm); }

.btn:hover:not(:disabled) { 
  background: var(--bg-hover); 
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-cancel {
  border-color: #ef4444;
  color: #ef4444;
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
}

.btn-retry { border-color: var(--primary-color); color: var(--primary-color); }

.btn-retry:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.1);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>


