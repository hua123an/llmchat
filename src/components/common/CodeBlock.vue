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
.code-block { position: relative; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; }
.copy { position: absolute; right: 8px; top: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); border-radius: 6px; padding: 2px 6px; cursor: pointer; }
pre { margin: 0; overflow: auto; }
</style>


