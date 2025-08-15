<template>
  <pre class="json"><code>{{ pretty }}</code></pre>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ value: any }>();
const pretty = computed(() => {
  try { return JSON.stringify(props.value, null, 2); } catch { return String(props.value); }
});
</script>

<style scoped>
.json { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--spacing-md); overflow: auto; box-shadow: var(--shadow-sm); color: var(--text-primary); font-family: 'Fira Code','Consolas','Monaco',monospace; font-size: 13px; line-height: 1.6; }
</style>


