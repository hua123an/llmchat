<template>
  <el-dialog
    v-model="store.isAgentSelectorOpen"
:title="t('agent.selectAgent')"
    width="900px"
    :before-close="handleClose"
    class="agent-selector-dialog"
    center
    append-to-body
    :modal="true"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
  >
    <div class="agent-selector-content">
      
      <!-- 当前选中的Agent -->
      <div v-if="localizedSelectedAgent" class="current-agent">
        <div class="current-agent-header">
          <h3>{{ t('agent.currentAgent') }}</h3>
          <el-button 
            type="danger" 
            size="small" 
            plain 
            @click="store.resetAgent"
          >
            {{ t('common.reset') }}
          </el-button>
        </div>
        <div class="agent-card current">
          <div class="agent-avatar">{{ localizedSelectedAgent.avatar }}</div>
          <div class="agent-info">
            <h4>{{ localizedSelectedAgent.name }}</h4>
            <p>{{ localizedSelectedAgent.description }}</p>
          </div>
        </div>
      </div>

      <!-- 分类筛选 -->
      <div class="category-filter">
        <el-button 
          v-for="category in categories" 
          :key="category.id"
          :type="selectedCategory === category.id ? 'primary' : ''"
          size="small"
          @click="selectedCategory = category.id"
        >
          {{ category.icon }} {{ category.name }}
        </el-button>
      </div>

      <!-- Agent网格 -->
      <div class="agents-grid">
        <div 
          v-for="agent in filteredAgents" 
          :key="agent.id"
          :class="[
            'agent-card',
            { 'selected': store.selectedAgent?.id === agent.id }
          ]"
          @click="selectAgent(agent)"
        >
          <div class="agent-header">
            <div class="agent-avatar">{{ agent.avatar }}</div>
            <div class="agent-meta">
              <h4>{{ agent.name }}</h4>
              <span class="agent-category">{{ getCategoryName(agent.category) }}</span>
            </div>
          </div>
          
          <p class="agent-description">{{ agent.description }}</p>
          
          <div class="agent-capabilities">
            <span 
              v-for="capability in agent.capabilities.slice(0, 3)" 
              :key="capability"
              class="capability-tag"
            >
              {{ capability }}
            </span>
            <span v-if="agent.capabilities.length > 3" class="more-tag">
              +{{ agent.capabilities.length - 3 }}
            </span>
          </div>

          <div class="agent-examples">
            <h5>{{ t('agent.examples') }}</h5>
            <ul>
              <li v-for="example in agent.examples.slice(0, 2)" :key="example">
                "{{ example }}"
              </li>
            </ul>
          </div>

          <div class="agent-footer">
            <div class="model-recommendation">
              <el-tag size="small" type="info">
                {{ t('agent.recommended') }}: {{ formatProviderName(agent.modelRecommendation) }}
              </el-tag>
            </div>
            <el-button 
              type="primary" 
              size="small"
              @click.stop="selectAgent(agent)"
            >
              {{ t('agent.buttons.select') }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('agent.buttons.cancel') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChatStore } from '../store/chat';
import type { Agent } from '../store/chat';
import { getLocalizedAgents, getLocalizedAgent } from '../utils/agentI18n';

const store = useChatStore();
const { t, locale: i18nLocale } = useI18n();

const selectedCategory = ref('all');

// 获取本地化的当前选中Agent（随语言切换而更新）
const localizedSelectedAgent = computed(() => {
  // 依赖语言，保证切换语言时重新计算
  void i18nLocale.value; // 触发依赖以响应语言切换
  return store.selectedAgent ? getLocalizedAgent(store.selectedAgent) : null;
});

const categories = computed(() => [
  { id: 'all', name: t('agent.categories.all'), icon: '🔍' },
  { id: 'general', name: t('agent.categories.general'), icon: '🤖' },
  { id: 'programming', name: t('agent.categories.programming'), icon: '💻' },
  { id: 'design', name: t('agent.categories.design'), icon: '🎨' },
  { id: 'data', name: t('agent.categories.data'), icon: '📊' },
  { id: 'writing', name: t('agent.categories.writing'), icon: '✍️' }
]);

const filteredAgents = computed(() => {
  // 依赖语言，保证切换语言时重新计算
  void i18nLocale.value; // 触发依赖以响应语言切换
  let agents;
  if (selectedCategory.value === 'all') {
    agents = store.agents.filter(agent => agent.isActive);
  } else {
    agents = store.agents.filter(agent => 
      agent.isActive && agent.category === selectedCategory.value
    );
  }
  return getLocalizedAgents(agents);
});

const getCategoryName = (categoryId: string) => {
  const id = (categoryId || '').toString().toLowerCase();
  const category = categories.value.find(c => c.id === id);
  if (category) return category.name;
  const key = `agent.categories.${id}`;
  const translated = t(key);
  return translated || id;
};

const selectAgent = (agent: Agent) => {
  store.selectAgent(agent);
};

const handleClose = () => {
  store.closeAgentSelector();
};

// 本地化显示 Provider 名称（统一从 i18n 获取）
const formatProviderName = (provider?: string) => {
  if (!provider) return '';
  const key = provider.toLowerCase();
  const translationKey = `providers.${key}`;
  const name = t(translationKey);
  // 如果翻译key和返回值相同，说明没有找到翻译，返回原始值
  return name === translationKey ? provider : name;
};
</script>

<style scoped>
.agent-selector-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  background: var(--bg-primary) !important;
  border: none !important;
}

.agent-selector-dialog :deep(.el-dialog__header) {
  background: var(--agent-selector-bg);
  color: white;
  border-bottom: none;
  padding: 20px 24px;
}

.agent-selector-dialog :deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
}

.agent-selector-content {
  padding: 0;
  max-height: 70vh;
  overflow-y: auto;
  background: var(--bg-primary);
}

.current-agent {
  background: var(--bg-tertiary);
  padding: 20px 24px;
  border-bottom: none;
}

.current-agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.current-agent-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
}

.category-filter {
  padding: 20px 24px;
  border-bottom: none;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.agents-grid {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.agent-card {
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  background: var(--agent-card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.agent-card:hover { border-color: transparent; box-shadow: none; transform: translateY(0); }

.agent-card.selected { border-color: transparent; background: var(--agent-selected-bg); }

.agent-card.current { border-color: transparent; background: var(--agent-selected-bg); cursor: default; }

.agent-card.current:hover {
  transform: none;
}

.agent-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.agent-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.agent-meta h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.agent-category {
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: 12px;
}

.agent-description {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
  margin: 12px 0;
}

.agent-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0;
}

.capability-tag {
  background: var(--primary-light);
  color: var(--primary-color);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.more-tag {
  background: var(--bg-hover);
  color: var(--text-tertiary);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.agent-examples {
  margin: 12px 0;
}

.agent-examples h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 600;
}

.agent-examples ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.agent-examples li {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
  font-style: italic;
}

.agent-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: none;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>