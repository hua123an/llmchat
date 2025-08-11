<template>
  <el-dialog v-model="open" :title="title || '网页预览'" width="60%" top="5vh" :close-on-click-modal="true">
    <div class="preview-body">
      <div v-if="loading" class="loading">正在加载...</div>
      <div v-else class="content" :title="url">{{ content }}</div>
    </div>
    <template #footer>
      <div class="dlg-actions">
        <el-button @click="copy">复制内容</el-button>
        <el-button type="primary" @click="openInBrowser">在浏览器打开</el-button>
        <el-button @click="emit('save')">保存到知识库</el-button>
        <el-button @click="emit('update:modelValue', false)">关闭</el-button>
      </div>
    </template>
  </el-dialog>
  
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { fetchReadable } from '../../services/search/web';
const props = defineProps<{ modelValue: boolean; url: string; title?: string }>();
const emit = defineEmits(['update:modelValue', 'save']);
const open = ref(props.modelValue);
const loading = ref(false);
const content = ref('');

watch(() => props.modelValue, async (v) => {
  open.value = v;
  if (v) await load();
});
watch(open, (v) => emit('update:modelValue', v));

const url = props.url;
const title = props.title;

async function load() {
  try {
    loading.value = true;
    content.value = await fetchReadable(url);
  } finally {
    loading.value = false;
  }
}

function openInBrowser() { window.open(url, '_blank'); }
async function copy() {
  try { await navigator.clipboard.writeText(content.value || ''); } catch {}
}
</script>

<style scoped>
.preview-body { max-height: 65vh; overflow: auto; white-space: pre-wrap; line-height: 1.5; }
.content { font-size: 13px; color: var(--text-primary); }
.loading { color: var(--text-secondary); }
.dlg-actions { display:flex; gap:8px; justify-content:flex-end; }
</style>


