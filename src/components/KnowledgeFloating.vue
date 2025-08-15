<template>
  <div class="knowledge-floating" :class="{ open: isOpen }">
    <button class="toggle-btn" @click="toggle" :title="t('knowledge.title')">📚</button>
    <div class="panel" v-if="isOpen">
      <div class="panel-header">
        <span class="title">{{ t('knowledge.title') }}</span>
        <button class="close-btn" @click="toggle" :title="t('common.close')">×</button>
      </div>
      <div class="panel-body">
        <!-- 导入与进度 -->
        <div class="import-card" :class="{ disabled: isImporting }">
          <div class="import-header">
            <div class="import-title">{{ t('knowledge.importText') }}</div>
            <div class="import-actions">
              <input ref="fileInput" type="file" multiple :disabled="isImporting" accept="text/*,.md,.markdown,.mdx,.mdc,.txt,.csv,.json,.yaml,.yml,.xml,.ini,.cfg,.log,.py,.js,.jsx,.ts,.tsx,.java,.go,.rs,.rb,.php,.c,.cc,.cpp,.h,.hh,.hpp,.cs,.kt,.kts,.swift,.scala,.sh,.bash,.zsh,.bat,.ps1,.sql,.toml,.gradle,.m,.mm,.r,.pl,.lua,.dart,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" @change="handleFileSelect" hidden />
              <el-button size="small" type="primary" @click="triggerFile" :disabled="isImporting">{{ t('knowledge.selectFile') }}</el-button>
              <el-button size="small" @click="togglePaste" :disabled="isImporting">{{ showPaste ? t('common.cancel') : t('knowledge.paste') }}</el-button>
              <el-button size="small" type="danger" @click="clearKnowledge" :disabled="isImporting">{{ t('knowledge.clear') }}</el-button>
            </div>
          </div>
          <div class="import-sub">TXT / PDF / DOCX — {{ t('knowledge.or') }} {{ t('knowledge.dragHere') }}</div>
          <div class="dropzone" :class="{ active: isDragging, disabled: isImporting }" @dragover.prevent @dragenter.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop"></div>
          <div v-if="isImporting" class="progress-row">
            <div class="progress-text">{{ progressText }}</div>
            <el-progress :percentage="Math.floor(progress)" :stroke-width="6" />
          </div>
        </div>

        <!-- Paste area -->
        <transition name="fade">
          <div v-if="showPaste" class="paste-area">
            <el-input v-model="pasteText" type="textarea" :autosize="{ minRows: 4, maxRows: 10 }" :placeholder="t('knowledge.importText')" />
            <div class="paste-actions">
              <el-button size="small" type="primary" @click="importPasted">{{ t('knowledge.importToKB') }}</el-button>
            </div>
          </div>
        </transition>

        <!-- Stats + Search -->
        <div class="meta-row">
          <div class="stats">
            <span class="chip">{{ t('knowledge.total') }}: {{ docs.length }}</span>
            <span class="chip">{{ t('knowledge.totalSize') || '总大小' }}: {{ formatBytes(totalBytes) }}</span>
          </div>
          <div class="search">
            <el-input v-model="query" size="small" :placeholder="t('knowledge.search')" clearable />
          </div>
        </div>

        <!-- Doc list -->
        <ul class="doc-list">
          <li v-for="d in filteredDocs" :key="d.id" class="doc-item">
            <div class="doc-name" :title="d.name">{{ d.name }}</div>
            <div class="doc-meta">
              <span class="chip">{{ formatBytes(d.size || 0) }}</span>
              <span class="chip" v-if="d.createdAt">{{ formatTime(d.createdAt) }}</span>
              <button class="link-btn" @click="openDoc(d)">查看/编辑</button>
            </div>
          </li>
          <li v-if="filteredDocs.length === 0" class="empty">{{ t('common.noData') || '暂无数据' }}</li>
        </ul>

        <!-- 文档查看/编辑弹窗 -->
        <el-dialog v-model="editorOpen" :title="currentDoc?.name || 'Document'" width="70%" append-to-body :close-on-click-modal="false" destroy-on-close>
          <div class="editor-wrap">
            <div v-if="editorLoading" class="editor-loading">Loading...</div>
            <el-input v-else v-model="editorContent" type="textarea" :autosize="{minRows: 16, maxRows: 30}" />
          </div>
          <template #footer>
            <el-button @click="editorOpen=false">{{ t('common.cancel') }}</el-button>
            <el-button type="primary" @click="saveDocEdits">{{ t('common.save') }}</el-button>
          </template>
        </el-dialog>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { chunkText } from '../services/rag/chunker';
import { putDoc, listDocs, clearAll, createDoc, appendChunks, getChunksByDoc } from '../services/rag/store';
import { extractPdfText } from '../services/extractors/pdf';
import { extractDocxText } from '../services/extractors/docx';
import { useChatStore } from '../store/chat';

const { t } = useI18n();
const store = useChatStore();
const isOpen = computed(() => (store as any).isKnowledgeOpen === true);
const toggle = () => { (store as any).isKnowledgeOpen = !(store as any).isKnowledgeOpen; };

const docs = ref<Array<{ id: string; name: string; size: number; createdAt?: number }>>([]);
const totalBytes = computed(() => docs.value.reduce((s, d) => s + (d.size || 0), 0));
const query = ref('');
const filteredDocs = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return docs.value;
  return docs.value.filter(d => (d.name || '').toLowerCase().includes(q));
});

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const showPaste = ref(false);
const pasteText = ref('');
// Size limits to avoid OOM in renderer
const MAX_TEXT_SIZE_MB = 2; // md/txt
const MAX_DOC_SIZE_MB = 15; // pdf/docx

// progress state
const isImporting = ref(false);
const progress = ref(0);
const progressText = ref('');
const refreshDocs = async () => { docs.value = await listDocs(); };

const triggerFile = () => fileInput.value?.click();

async function readFileToText(file: File): Promise<string | null> {
  try {
    if (file.type.startsWith('text/') || /\.(md|markdown|mdx|mdc|txt)$/i.test(file.name)) {
      if (file.size > MAX_TEXT_SIZE_MB * 1024 * 1024) {
        (window as any).ElMessage?.warning?.(`Text too large (> ${MAX_TEXT_SIZE_MB}MB), skipped: ${file.name}`);
        return null;
      }
      return await file.text();
    }
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
        (window as any).ElMessage?.warning?.(`PDF too large (> ${MAX_DOC_SIZE_MB}MB), skipped: ${file.name}`);
        return null;
      }
      const buf = await file.arrayBuffer();
      return await extractPdfText(buf, 10);
    }
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(file.name)) {
      if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
        (window as any).ElMessage?.warning?.(`DOCX too large (> ${MAX_DOC_SIZE_MB}MB), skipped: ${file.name}`);
        return null;
      }
      const buf = await file.arrayBuffer();
      return await extractDocxText(buf);
    }
    return null;
  } catch {
    return null;
  }
}

const importFiles = async (files: FileList | File[]) => {
  const arr = Array.from(files);
  let imported = 0;
  isImporting.value = true;
  progress.value = 0;
  progressText.value = '';
  const totalFiles = arr.length;
  for (const file of arr) {
    const text = await readFileToText(file);
    if (!text || text.trim().length === 0) continue;
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    // Create doc meta first
    await createDoc({ id: docId, name: file.name, createdAt: Date.now(), size: (text || '').length });
    // Batched chunk append to speed up writes
    const size = 800, overlap = 100;
    const clean = (text || '').replace(/\r/g, '');
    let i = 0, idx = 0;
    const totalLen = clean.length || 1;
    progressText.value = `${file.name}`;
    const batch: any[] = [];
    while (i < clean.length) {
      const end = Math.min(i + size, clean.length);
      const piece = clean.slice(i, end);
      batch.push({ id: `${docId}:${idx}`, docId, index: idx, text: piece });
      if (batch.length >= 200 || end === clean.length) {
        await appendChunks(batch as any, 200);
        batch.length = 0;
      }
      idx += 1;
      i = end - overlap;
      if (i < 0) i = 0;
      // update progress
      const ratio = Math.min(1, end / totalLen);
      progress.value = Math.min(99, ((imported + ratio) / totalFiles) * 100);
      await new Promise(r => setTimeout(r, 0)); // yield to UI
    }
    imported += 1;
    progress.value = Math.min(100, (imported / totalFiles) * 100);
  }
  await refreshDocs();
  if (imported > 0) {
    (window as any).ElMessage?.success?.(t('knowledge.importSuccess'));
  } else {
    (window as any).ElMessage?.warning?.(t('knowledge.notTextAttachment'));
  }
  isImporting.value = false;
};

const handleFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    try {
      (window as any).ElMessage?.info?.(`Importing ${input.files.length} file(s)...`);
      await importFiles(input.files);
    } catch (err) {
      console.error('Import failed:', err);
      (window as any).ElMessage?.error?.('Import failed');
    }
  }
  if (input) input.value = '';
};

const handleDrop = async (e: DragEvent) => {
  isDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    try {
      (window as any).ElMessage?.info?.(`Importing ${files.length} file(s)...`);
      await importFiles(files);
    } catch (err) {
      console.error('Drop import failed:', err);
      (window as any).ElMessage?.error?.('Import failed');
    }
  }
};

const togglePaste = () => { showPaste.value = !showPaste.value; pasteText.value = ''; };
const importPasted = async () => {
  const text = pasteText.value.trim();
  if (!text) return;
  const docId = `doc-${Date.now()}`;
  const chunks = chunkText(docId, text);
  await putDoc({ id: docId, name: 'pasted.txt', createdAt: Date.now(), size: text.length }, chunks);
  await refreshDocs();
  showPaste.value = false; pasteText.value = '';
  (window as any).ElMessage?.success?.(t('knowledge.importSuccess'));
};

const clearKnowledge = async () => { await clearAll(); await refreshDocs(); };
onMounted(refreshDocs);

const formatTime = (ts: number) => {
  try { return new Date(ts).toLocaleString(); } catch { return '' }
};

// 查看/编辑
const editorOpen = ref(false);
const editorContent = ref('');
const currentDoc = ref<{ id: string; name: string } | null>(null);
const editorLoading = ref(false);
const openDoc = async (d: {id: string; name: string}) => {
  currentDoc.value = { id: d.id, name: d.name } as any;
  editorOpen.value = true;
  editorLoading.value = true;
  try {
    const chunks = await getChunksByDoc(d.id);
    const list = (chunks || []).sort((a,b)=>a.index-b.index);
    const pieces: string[] = [];
    const batch = 1000; // 每批组装1000个chunk，仅在最后一次性赋值，避免反复触发大文本的响应式更新
    let i = 0;
    const buildNext = () => {
      const end = Math.min(i + batch, list.length);
      for (let k = i; k < end; k++) pieces.push(list[k].text);
      i = end;
      if (i < list.length) {
        setTimeout(buildNext, 0); // 让出主线程，避免卡顿
      } else {
        editorContent.value = pieces.join('');
        editorLoading.value = false;
      }
    };
    buildNext();
  } catch {
    editorLoading.value = false;
  }
};
const saveDocEdits = async () => {
  if (!currentDoc.value) return;
  const text = editorContent.value || '';
  const chunks = chunkText(currentDoc.value.id, text);
  await putDoc({ id: currentDoc.value.id, name: currentDoc.value.name, createdAt: Date.now(), size: text.length }, chunks);
  await refreshDocs();
  editorOpen.value = false;
  (window as any).ElMessage?.success?.(t('common.success') || 'Saved');
};

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < sizes.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
}
</script>

<style scoped>
.knowledge-floating { position: fixed; right: 72px; bottom: 20px; z-index: 1000; }
.toggle-btn { width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-secondary); display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow: var(--shadow-sm); }
.toggle-btn:hover { background: var(--bg-hover); color: var(--text-primary); box-shadow: var(--shadow-md); }
.panel { position: absolute; right: 0; bottom: 56px; width: 600px; max-height: 78vh; overflow: auto; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
.panel-header { display:flex; align-items:center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-color); }
.title { font-weight: 600; color: var(--text-primary); }
.close-btn { width:28px; height:28px; border-radius:8px; border:1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-secondary); cursor:pointer; }
.close-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.panel-body { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.import-card { border: 1px solid var(--border-color); background: var(--bg-secondary); border-radius: var(--radius-md); padding: 10px; box-shadow: var(--shadow-sm); }
.import-card.disabled { opacity: .6; pointer-events: none; }
.import-header { display:flex; align-items:center; justify-content: space-between; gap: 8px; }
.import-title { font-weight: 600; }
.import-actions { display:flex; gap: 8px; }
.import-sub { color: var(--text-tertiary); font-size: 12px; margin: 6px 0; }
.dropzone { border: 1px dashed var(--border-color); border-radius: var(--radius-md); background: var(--bg-primary); padding: 18px; text-align: center; }
.dropzone.active { border-color: var(--primary-color); background: rgba(0,0,0,0.04); }
.dropzone.disabled { opacity: .6; pointer-events: none; }
.progress-row { display:flex; flex-direction: column; gap:6px; margin-top: 10px; }
.progress-text { color: var(--text-secondary); font-size: 12px; }
.paste-area { margin: 10px 0 12px; display:flex; flex-direction: column; gap:8px; }
.meta-row { display:flex; align-items:center; justify-content: space-between; gap:10px; }
.stats { display:flex; gap:8px; }
.doc-list { list-style:none; padding:0; margin:0; display:flex; flex-direction: column; gap:6px; }
.doc-item { display:flex; align-items:center; justify-content: space-between; padding: 8px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-secondary); }
.doc-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 8px; }
.doc-meta { display:flex; gap:6px; }
.chip { font-size: 12px; color: var(--text-secondary); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 999px; padding: 2px 8px; }
.link-btn { border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); padding: 4px 8px; border-radius: var(--radius-sm); cursor: pointer; }
.link-btn:hover { background: var(--bg-hover); }
.editor-wrap :deep(.el-textarea__inner) { background: var(--bg-primary); color: var(--text-primary); border: none; }
.empty { color: var(--text-tertiary); text-align: center; padding: 12px 0; }
@media (max-width: 640px) { .panel { width: calc(100vw - 32px); right: -8px; } }
</style>


