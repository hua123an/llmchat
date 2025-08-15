<template>
  <div class="code-block">
    <pre><code>{{ code }}</code></pre>
    <button class="copy" @click="handleCopy" :title="t('common.copy')">📋</button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { copyToClipboard } from '../../services/clipboard';
const props = defineProps<{ code: string }>();
const { t } = useI18n();
const handleCopy = async () => { await copyToClipboard(props.code || ''); };
</script>

<style scoped>
.code-block { position: relative; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--spacing-md); box-shadow: var(--shadow-sm); }
.copy { position: absolute; right: 8px; top: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); border-radius: var(--radius-sm); padding: 4px 8px; cursor: pointer; color: var(--text-secondary); transition: all 0.2s ease; }
.copy:hover { background: var(--bg-hover); border-color: var(--border-hover); box-shadow: var(--shadow-sm); color: var(--text-primary); }
pre { margin: 0; overflow: auto; }
code { color: var(--text-primary); font-family: 'Fira Code', 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.6; }
</style>


