<template>
  <div class="chat-header">
    <el-select v-model="currentProvider" :placeholder="t('chat.placeholders.selectProvider')" @change="store.fetchModels" class="provider-select">
      <el-option v-for="provider in store.providers" :key="provider.name" :label="formatProviderName(provider.name)" :value="provider.name"></el-option>
    </el-select>
    <el-select v-model="currentModel" :placeholder="t('chat.placeholders.selectModel')" :disabled="!currentProvider" class="model-select">
      <el-option v-for="model in currentModels" :key="model.id" :label="model.name || model.id" :value="model.id"></el-option>
    </el-select>
    <div class="usage-display">
      <span class="usage-icon">🔢</span>
      <span class="usage-text">{{ store.totalUsage.total_tokens }}</span>
    </div>
    <el-input v-model="currentSystemPrompt" :placeholder="t('chat.placeholders.systemPrompt')" class="system-prompt-input" />
    <ThemeToggle />
    <el-button size="small" @click="autoRoute" class="route-btn">Auto Route</el-button>
  </div>
  
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChatStore } from '../store/chat';
import ThemeToggle from './ThemeToggle.vue';
import { pickRoute } from '../services/router/modelRouter';
// A/B 测试功能已移除

const store = useChatStore();
const { t } = useI18n();

// 本地化显示 Provider 名称
const formatProviderName = (provider?: string) => {
  if (!provider) return '';
  const key = provider.toLowerCase();
  const translationKey = `providers.${key}`;
  const name = t(translationKey);
  // 如果翻译key和返回值相同，说明没有找到翻译，返回原始值
  return name === translationKey ? provider : name;
};

// 安全的计算属性
const currentProvider = computed({
  get: () => store.currentTab?.provider || '',
  set: (value: string) => {
    if (store.currentTab) {
      store.currentTab.provider = value;
    }
  }
});

const currentModel = computed({
  get: () => store.currentTab?.model || '',
  set: (value: string) => {
    if (store.currentTab) {
      store.currentTab.model = value;
    }
  }
});

const currentSystemPrompt = computed({
  get: () => store.currentTab?.systemPrompt || '',
  set: (value: string) => {
    if (store.currentTab) {
      store.currentTab.systemPrompt = value;
    }
  }
});

const currentModels = computed(() => store.currentTab?.models || []);

// 一键自动路由：根据历史时延选择 provider/model
const autoRoute = () => {
  const providers = store.providers.map(p => ({ name: p.name, models: (store.currentTab?.models || []) }));
  const ledger = (store as any).statsLedger || [];
  const route = pickRoute(providers as any, ledger as any);
  if (store.currentTab && route.provider) {
    store.currentTab.provider = route.provider;
    if (route.model) store.currentTab.model = route.model;
  }
};

// A/B 已移除
</script>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: linear-gradient(135deg, var(--bg-header) 0%, var(--bg-secondary) 100%);
  border-bottom: none;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  flex-wrap: nowrap;
  min-height: 64px;
}

.provider-select,
.model-select {
  min-width: 160px;
  max-width: 200px;
  flex-shrink: 0;
}

.provider-select :deep(.el-input__wrapper),
.model-select :deep(.el-input__wrapper) {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.provider-select :deep(.el-input__wrapper):hover,
.model-select :deep(.el-input__wrapper):hover {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.provider-select :deep(.el-input__inner),
.model-select :deep(.el-input__inner) {
  color: var(--text-primary);
  font-weight: 500;
}

.usage-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: linear-gradient(135deg, var(--info-light) 0%, var(--primary-light) 100%);
  border: 1px solid var(--info-color);
  border-radius: var(--radius-lg);
  color: var(--info-color);
  font-weight: 600;
  font-size: 13px;
  min-width: 80px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.usage-display:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.usage-icon {
  font-size: 14px;
}

.usage-text {
  font-family: 'Monaco', 'Consolas', monospace;
}

.system-prompt-input {
  flex: 1 1 300px;
  max-width: 450px;
  min-width: 200px;
}

.system-prompt-input :deep(.el-input__wrapper) {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.system-prompt-input :deep(.el-input__wrapper):hover {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.system-prompt-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.system-prompt-input :deep(.el-input__inner) {
  color: var(--text-primary);
  font-size: 14px;
}

.system-prompt-input :deep(.el-input__inner)::placeholder {
  color: var(--text-muted);
}

.system-prompt-input :deep(.el-input-group__append) {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
  border: none;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.system-prompt-input :deep(.el-input-group__append):hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.prompt-button {
  background: transparent !important;
  border: none !important;
  color: var(--text-inverse) !important;
  font-weight: 600;
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.prompt-icon {
  font-size: 14px;
}

/* ThemeToggle组件样式 */
:deep(.theme-toggle) {
  flex-shrink: 0;
  margin-left: var(--spacing-sm);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .chat-header {
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
  }
  
  .system-prompt-input {
    max-width: 300px;
    min-width: 150px;
  }
}

@media (max-width: 768px) {
  .chat-header {
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    min-height: auto;
    padding: var(--spacing-sm);
  }
  
  .provider-select,
  .model-select {
    min-width: 120px;
    max-width: 150px;
  }
  
  .usage-display {
    order: 3;
    min-width: 60px;
    font-size: 12px;
  }
  
  .system-prompt-input {
    order: 4;
    flex: 1 1 100%;
    max-width: none;
    margin-top: var(--spacing-xs);
  }
  
  :deep(.theme-toggle) {
    order: 2;
    margin-left: 0;
  }
}

@media (max-width: 480px) {
  .chat-header {
    padding: var(--spacing-xs);
  }
  
  .provider-select,
  .model-select {
    min-width: 100px;
    max-width: 130px;
  }
  
  .usage-display {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: 11px;
  }
}

/* 动画效果 */
.chat-header > * {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .usage-display {
    border-width: 2px;
  }
  
  .provider-select :deep(.el-input__wrapper),
  .model-select :deep(.el-input__wrapper),
  .system-prompt-input :deep(.el-input__wrapper) {
    border-width: 2px;
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .chat-header > *,
  .usage-display,
  .system-prompt-input :deep(.el-input-group__append) {
    animation: none;
    transition: none;
  }
  
  .usage-display:hover,
  .system-prompt-input :deep(.el-input-group__append):hover {
    transform: none;
  }
}
</style>
