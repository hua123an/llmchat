<template>
  <el-dialog v-model="open" title="A/B Test" width="700px" append-to-body>
    <div class="ab-body">
      <div class="config">
        <div class="row">
          <label class="lbl">Prompt</label>
          <el-input v-model="prompt" type="textarea" :rows="3" />
        </div>
        <div class="row">
          <label class="lbl">Providers</label>
          <div class="prov-list">
            <label v-for="p in providers" :key="p.name" class="prov-item">
              <input type="checkbox" v-model="selected" :value="p.name" /> {{ p.name }}
            </label>
          </div>
        </div>
        <div class="row">
          <label class="lbl">Model (optional, for all)</label>
          <el-input v-model="modelId" />
        </div>
        <div class="row">
          <el-button type="primary" @click="run">Run</el-button>
        </div>
      </div>
      <div class="results" v-if="results.length">
        <div class="res" v-for="r in results" :key="r.provider + r.model">
          <div class="head">{{ r.provider }} / {{ r.model }}</div>
          <pre class="content">{{ r.content }}</pre>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="open = false">Close</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useChatStore } from '../../store/chat';
import { runABTest } from '../../services/abTest';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>();

const store = useChatStore();
const open = ref(props.modelValue);
watch(() => props.modelValue, v => open.value = v);
watch(open, v => emit('update:modelValue', v));

const providers = store.providers || [];
const selected = ref<string[]>(providers.slice(0, 2).map(p => p.name));
const prompt = ref<string>('');
const modelId = ref<string>('');
const results = ref<Array<{ provider: string; model: string; content: string }>>([]);

const run = async () => {
  const cases = selected.value.map(name => ({ provider: name, model: modelId.value || (store.currentTab?.model || '') }));
  results.value = await runABTest(prompt.value || store.userInput || '', cases, store.currentTab?.systemPrompt || undefined);
};
</script>

<style scoped>
.ab-body { display: grid; grid-template-columns: 1fr; gap: 12px; }
.row { display: grid; grid-template-columns: 140px 1fr; gap: 10px; align-items: center; }
.lbl { color: var(--text-secondary); }
.prov-list { display: flex; gap: 12px; flex-wrap: wrap; }
.prov-item { border: none; padding: 4px 8px; border-radius: 6px; }
.results { display: grid; gap: 10px; }
.res { border: none; border-radius: 8px; }
.res .head { padding: 6px 10px; background: var(--bg-secondary); border-bottom: none; font-weight: 600; }
.res .content { padding: 8px 10px; margin: 0; white-space: pre-wrap; }
</style>


