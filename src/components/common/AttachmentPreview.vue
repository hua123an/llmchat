<template>
  <el-dialog v-model="visible" :title="att?.name || 'Attachment'" width="60%" append-to-body>
    <div v-if="att">
      <div v-if="att.dataUrl && att.mime?.startsWith('image/')" class="img-wrap">
        <img :src="att.dataUrl" :alt="att.name" loading="lazy" decoding="async" />
      </div>
      <div v-else class="text-wrap">
        <pre class="text">{{ att.textSnippet || '[No Preview]' }}</pre>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('import')">{{ t('knowledge.importToKB') }}</el-button>
        <el-button type="primary" @click="visible=false">{{ t('common.close') }}</el-button>
      </div>
    </template>
  </el-dialog>
  </template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Attachment } from '../../store/chat';

const { t } = useI18n();
const props = defineProps<{ modelValue: boolean; attachment?: Attachment | null }>();
const emit = defineEmits(['update:modelValue','import']);
const visible = ref(props.modelValue);
const att = ref(props.attachment || null);

watch(() => props.modelValue, v => visible.value = v);
watch(() => visible.value, v => emit('update:modelValue', v));
watch(() => props.attachment, v => att.value = v || null);
</script>

<style scoped>
.img-wrap { display:flex; justify-content:center; }
.img-wrap img { max-width: 100%; border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); }
.text-wrap { max-height: 60vh; overflow: auto; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: var(--spacing-md); background: var(--bg-primary); box-shadow: var(--shadow-sm); }
.text { white-space: pre-wrap; word-wrap: break-word; color: var(--text-primary); }
</style>


