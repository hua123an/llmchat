<template>
  <div class="stats-floating" :class="{ open: isOpen }">
    <button class="toggle-btn" @click="toggle" :title="t('stats.toggle')">
      📈
    </button>
    
    <!-- 居中浮动面板 -->
    <template v-if="isOpen">
      <div class="overlay" @click="toggle"></div>
      <div class="panel">
        <div class="panel-header">
          <span class="title">{{ t('stats.title') }}</span>
          <button class="close-btn" @click="toggle" :title="t('common.close')">×</button>
        </div>
      <div class="panel-body">
        <div class="controls">
          <div class="row-controls">
            <div class="control-item">
              <label>{{ t('stats.scope') }}</label>
              <select v-model="scope">
                <option value="current">{{ t('stats.scopeCurrent') }}</option>
                <option value="all">{{ t('stats.scopeAll') }}</option>
              </select>
            </div>
            <div class="control-item">
              <label>{{ t('stats.dateRange') }}</label>
              <select v-model="preset">
                <option value="today">{{ t('stats.today') }}</option>
                <option value="7d">{{ t('stats.last7d') }}</option>
                <option value="30d">{{ t('stats.last30d') }}</option>
                <option value="custom">{{ t('stats.custom') }}</option>
              </select>
            </div>
            <div class="control-item" v-if="preset==='custom'">
              <label>{{ t('stats.from') }}</label>
              <input type="date" v-model="fromDate" />
            </div>
            <div class="control-item" v-if="preset==='custom'">
              <label>{{ t('stats.to') }}</label>
              <input type="date" v-model="toDate" />
            </div>
            <div class="control-item">
              <label>{{ t('stats.view') }}</label>
              <select v-model="view">
                <option value="table">{{ t('stats.table') }}</option>
                <option value="byModel">{{ t('stats.byModel') }}</option>
                <option value="byProvider">{{ t('stats.byProvider') }}</option>
                <option value="byTab">{{ t('stats.byTab') }}</option>
                <option value="trend">{{ t('stats.trend') }}</option>
              </select>
            </div>
          </div>
          <div class="row-actions">
            <button class="action-btn" @click="exportCSV">{{ t('stats.exportCSV') }}</button>
            <button class="action-btn" @click="exportJSON">{{ t('stats.exportJSON') }}</button>
            <button class="action-btn" @click="copySummary">{{ t('stats.copySummary') }}</button>
            <button class="action-btn danger" @click="clearRange">{{ t('stats.clear') }}</button>
          </div>
        </div>

        <div class="summary">
          <div class="item">
            <div class="label">{{ t('stats.totalTokens') }}</div>
            <div class="value">{{ totalTokens }}</div>
          </div>
          <div class="item">
            <div class="label">{{ t('stats.avgLatency') }}</div>
            <div class="value">{{ avgResponseTimeMs }} ms</div>
          </div>
        </div>

        <div class="table" v-if="view==='table'">
          <div class="row header">
            <div class="cell">#</div>
            <div class="cell">{{ t('stats.model') }}</div>
            <div class="cell">{{ t('stats.provider') }}</div>
            <div class="cell">{{ t('stats.session') }}</div>
            <div class="cell">{{ t('stats.promptTokens') }}</div>
            <div class="cell">{{ t('stats.completionTokens') }}</div>
            <div class="cell">{{ t('stats.responseTime') }}</div>
            
          </div>
          <div class="row" v-for="(s, idx) in filteredStats" :key="s.messageId">
            <div class="cell">{{ idx + 1 }}</div>
            <div class="cell">{{ s.model || '-' }}</div>
            <div class="cell">{{ s.provider || '-' }}</div>
            <div class="cell">{{ s.tabName }}</div>
            <div class="cell">{{ s.promptTokens ?? 0 }}</div>
            <div class="cell">{{ s.completionTokens ?? 0 }}</div>
            <div class="cell">{{ s.responseTimeMs ?? 0 }} ms</div>
            
          </div>
        </div>

        <div v-else class="placeholder-view">
          <div class="hint">{{ t('stats.view') }}: {{ view }} — {{ t('stats.comingSoon') }}</div>
        </div>
      </div>
      </div>
    </template>
  </div>
  
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChatStore } from '../store/chat';
// import removed: currency formatting not used after removing cost

const store = useChatStore();
const { t } = useI18n();

const isOpen = computed(() => store.isStatsOpen);
const toggle = () => store.toggleStats();

type MessageStat = {
  messageId: string;
  model?: string;
  provider?: string;
  tabName?: string;
  promptTokens?: number;
  completionTokens?: number;
  responseTimeMs?: number;
  costUSD: number | null;
};

// 直接根据 store.statsLedger 聚合，保证与统计账本一致
const perMessageStats = computed<MessageStat[]>(() => {
  const ledger = (store as any).statsLedger as Array<any>;
  return (ledger || []).map(e => ({
    messageId: e.id,
    model: e.model,
    provider: e.provider,
    tabName: e.tabName,
    promptTokens: e.promptTokens,
    completionTokens: e.completionTokens,
    responseTimeMs: e.responseTimeMs,
    costUSD: e.costUSD,
  }));
});

// 过滤控制
const scope = ref<'current'|'all'>('current');
const preset = ref<'today'|'7d'|'30d'|'custom'>('7d');
const view = ref<'table'|'byModel'|'byProvider'|'byTab'|'trend'>('table');
const fromDate = ref<string>('');
const toDate = ref<string>('');

const filteredStats = computed<MessageStat[]>(() => {
  const now = Date.now();
  let from = 0, to = now;
  if (preset.value === 'today') {
    const d = new Date();
    d.setHours(0,0,0,0);
    from = d.getTime();
  } else if (preset.value === '7d') {
    from = now - 7*24*3600*1000;
  } else if (preset.value === '30d') {
    from = now - 30*24*3600*1000;
  } else if (preset.value === 'custom') {
    if (fromDate.value) from = new Date(fromDate.value).getTime();
    if (toDate.value) to = new Date(toDate.value).getTime() + 24*3600*1000 - 1;
  }

  if (scope.value === 'all') {
    const list = (store as any).statsLedger as Array<any>;
    return (list || []).filter(e => e.timestamp >= from && e.timestamp <= to).map(e => ({
      messageId: e.id,
      model: e.model,
      provider: e.provider,
      tabName: e.tabName,
      promptTokens: e.promptTokens,
      completionTokens: e.completionTokens,
      responseTimeMs: e.responseTimeMs,
      costUSD: e.costUSD,
    }));
  }

  // current tab
  const list = perMessageStats.value;
  return list.filter(s => {
    const ts = (store.currentTab?.messages.find(m => m.id === s.messageId)?.timestamp) || 0;
    return ts >= from && ts <= to;
  }).map(s => ({ ...s, tabName: store.currentTab?.name || '-' }));
});

// 注意：总 Tokens 统一使用下方基于 filteredStats 的计算

// 费用统计已移除

const avgResponseTimeMs = computed(() => {
  const list = filteredStats.value.map(s => s.responseTimeMs ?? 0).filter(v => v > 0);
  if (list.length === 0) return 0;
  const total = list.reduce((a, b) => a + b, 0);
  return Math.round(total / list.length);
});

// 费用统计已移除

// 导出与复制
import { toCSV, toJSON, downloadFile, copyToClipboard } from '../utils/export';
const exportCSV = () => {
  const filename = `stats_${Date.now()}.csv`;
  downloadFile(filename, toCSV(filteredStats.value as any), 'text/csv;charset=utf-8;');
};
const exportJSON = () => {
  const filename = `stats_${Date.now()}.json`;
  downloadFile(filename, toJSON(filteredStats.value as any), 'application/json;charset=utf-8;');
};
const copySummary = async () => {
  const summary = `${t('stats.totalTokens')}: ${totalTokens.value}\n${t('stats.avgLatency')}: ${avgResponseTimeMs.value} ms`;
  await copyToClipboard(summary);
};

// token 汇总改为基于过滤列表
const totalTokens = computed(() => filteredStats.value.reduce((sum, s) => sum + ((s.promptTokens ?? 0) + (s.completionTokens ?? 0)), 0));

// 清理范围
const clearRange = () => {
  const ok = confirm(t('stats.clear') + '?');
  if (!ok) return;
  const now = Date.now();
  let from = 0, to = now;
  if (preset.value === 'today') {
    const d = new Date(); d.setHours(0,0,0,0); from = d.getTime();
  } else if (preset.value === '7d') {
    from = now - 7*24*3600*1000;
  } else if (preset.value === '30d') {
    from = now - 30*24*3600*1000;
  } else if (preset.value === 'custom') {
    if (fromDate.value) from = new Date(fromDate.value).getTime();
    if (toDate.value) to = new Date(toDate.value).getTime() + 24*3600*1000 - 1;
  }
  (store as any).clearStats({ scope: scope.value === 'all' ? 'all' : 'currentTab', from, to });
};
</script>

<style scoped>
.stats-floating {
  position: fixed;
  right: 16px;
  bottom: 20px;
  z-index: 1000;
}

.stats-floating.open {
  inset: 0;
  right: auto;
  bottom: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: none;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 0;
}

.panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(1000px, 90vw);
  height: min(700px, 85vh);
  overflow: hidden;
  background: var(--bg-primary);
  border: none;
  border-radius: 16px;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  z-index: 1;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: none;
}

.title { font-weight: 600; }

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
}

.panel-body { 
  padding: 12px; 
  flex: 1; 
  overflow: auto; 
}

.controls { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
.row-controls, .row-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.control-item { display: flex; align-items: center; gap: 6px; }
.action-btn { padding: 6px 10px; border: none; background: var(--bg-secondary); border-radius: 6px; cursor: pointer; }
.action-btn.danger { color: #ef4444; }

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.summary .item {
  padding: 8px 10px;
  background: var(--bg-secondary);
  border: none;
  border-radius: 8px;
}

.label { color: var(--text-secondary); font-size: 12px; }
.value { color: var(--text-primary); font-weight: 600; margin-top: 4px; }

.table { width: 100%; }
/* 修复费用列被挤下去：原来只定义了7列，但表格有8列 */
.row { display: grid; grid-template-columns: 40px 1fr 1fr 1fr 1fr 1fr 1fr minmax(100px, 1fr); gap: 8px; padding: 8px; align-items: center; }
.row.header { font-weight: 600; color: var(--text-secondary); }
.row:not(.header) { border-top: none; }
.cell { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

@media (max-width: 640px) {
  .panel { 
    width: min(95vw, 400px); 
    height: min(90vh, 600px); 
  }
  .summary { grid-template-columns: 1fr; }
  /* 移动端同样补齐8列，并给费用列保留最小宽度 */
  .row { grid-template-columns: 32px 1fr 1fr 1fr 1fr 1fr 1fr minmax(90px, 1fr); }
}
</style>

