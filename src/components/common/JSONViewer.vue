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
.json { background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; overflow: auto; }
</style>


