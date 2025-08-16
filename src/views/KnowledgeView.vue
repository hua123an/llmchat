<template>
  <div class="kb-page">
    <div class="kb-header">
      <h2>知识库</h2>
      <div class="actions">
        <el-button type="primary" @click="openImport">导入文本</el-button>
        <el-popconfirm title="确认清空所有文档？" @confirm="handleClear">
          <template #reference>
            <el-button type="danger" plain>清空</el-button>
          </template>
        </el-popconfirm>
        <el-button @click="openIndexDialog">向量索引</el-button>
      </div>
    </div>
    <div class="toolbar">
      <el-input v-model="query" placeholder="搜索文档内容" clearable @keyup.enter="handleSearch" />
      <el-button @click="handleSearch">搜索</el-button>
      <el-upload
        :show-file-list="false"
        accept=".pdf,.docx,.txt"
        :on-change="onFileSelect"
        :auto-upload="false"
      >
        <el-button>导入文件</el-button>
      </el-upload>
      <el-input v-model="urlToImport" placeholder="输入URL并回车导入" @keyup.enter="importFromUrl" style="max-width:360px" />
      <el-input-number v-model="chunkSize" :min="200" :max="4000" :step="100" style="width:140px" />
      <el-input-number v-model="overlap" :min="0" :max="800" :step="50" style="width:120px" />
    </div>
    <el-table :data="docs" height="420" style="width: 100%">
      <el-table-column prop="name" label="名称" width="240" />
      <el-table-column prop="size" label="大小" width="120" />
      <el-table-column prop="createdAt" label="时间" width="200">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="操作" width="320">
        <template #default="{ row }">
          <el-button size="small" @click="preview(row)">预览</el-button>
          <el-button size="small" type="primary" @click="searchDoc(row)">在此搜索</el-button>
          <el-popconfirm title="删除该文档？" @confirm="() => removeDoc(row.id)">
            <template #reference>
              <el-button size="small" type="danger" plain>删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="importVisible" title="导入文本" width="600px">
      <el-input v-model="importName" placeholder="名称" style="margin-bottom: 8px" />
      <el-input v-model="importTextValue" type="textarea" :rows="10" placeholder="粘贴文本…" />
      <template #footer>
        <el-button @click="importVisible=false">取消</el-button>
        <el-button type="primary" :disabled="!importTextValue.trim()" @click="doImport">导入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resultVisible" title="搜索结果" width="700px">
      <div v-if="results.length===0" class="empty">无结果</div>
      <div v-else class="results">
        <div v-for="(r,i) in results" :key="i" class="result">
          <div class="score">{{ r.score.toFixed(2) }}</div>
          <div class="text">{{ r.chunk.text }}</div>
        </div>
      </div>
    </el-dialog>
    <el-dialog v-model="importing" title="正在导入" width="520px" :close-on-click-modal="false" :show-close="false">
      <div>文档：{{ importingName }}</div>
      <el-progress :percentage="Math.floor((progress.done/progress.total)*100)||0" />
    </el-dialog>

    <el-dialog v-model="indexVisible" title="向量索引" width="520px">
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px">
        <el-select v-model="selectedDocId" placeholder="选择文档">
          <el-option v-for="d in docs" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
        <el-button type="primary" @click="buildIndex">生成索引</el-button>
      </div>
      <div v-if="indexing">正在生成向量... {{ indexProgress }}</div>
      <div style="display:flex; gap:8px; align-items:center; margin-top:8px">
        <el-input v-model="queryText" placeholder="输入查询语句..." @keyup.enter="searchByVector" />
        <el-button @click="searchByVector">相似检索</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { listDocs as listAllDocs, importPlainText as importText, searchDoc as searchInDoc } from '../modules/knowledge/index';
import { getDocChunks, saveVectors, vectorSearch } from '../services/rag';
import { clearAll as clearKnowledgeBase } from '../modules/knowledge/index';
import { deleteDoc } from '../services/rag/store';
import { extractPdfText } from '../services/extractors/pdf';
import { extractDocxText } from '../services/extractors/docx';

const docs = ref<Array<{ id:string; name:string; size:number; createdAt:number }>>([]);
const query = ref('');
const importVisible = ref(false);
const importName = ref('');
const importTextValue = ref('');
const resultVisible = ref(false);
const results = ref<any[]>([]);
let lastDocId: string | null = null;
const urlToImport = ref('');
const chunkSize = ref<number>(800);
const overlap = ref<number>(100);
const importing = ref<boolean>(false);
const importingName = ref<string>('');
const progress = ref<{done:number,total:number}>({done:0,total:1});
const indexVisible = ref(false);
const selectedDocId = ref<string>('');
const indexing = ref(false);
const indexProgress = ref('');
const queryText = ref('');

const refresh = async () => { docs.value = await listAllDocs(); };
const openImport = () => { importVisible.value = true; };
const doImport = async () => {
  try {
    await importText(importName.value || '新文档', importTextValue.value || '');
    importVisible.value = false; importName.value=''; importTextValue.value='';
    ElMessage.success('导入成功');
    await refresh();
  } catch (e:any) {
    ElMessage.error('导入失败: '+(e?.message||''));
  }
};
const handleSearch = async () => {
  if (!query.value.trim() || docs.value.length===0) return;
  const doc = lastDocId ? docs.value.find(d=>d.id===lastDocId) : docs.value[0];
  if (!doc) return;
  const res = await searchInDoc(doc.id, query.value, 8);
  results.value = res; resultVisible.value = true;
};
const searchDoc = async (row:any) => { lastDocId=row.id; await handleSearch(); };
const preview = async (row:any) => { lastDocId=row.id; query.value=''; results.value=[]; resultVisible.value=true; };
const handleClear = async () => { await clearKnowledgeBase(); await refresh(); ElMessage.success('已清空'); };
const removeDoc = async (id:string) => { await deleteDoc(id); await refresh(); ElMessage.success('已删除'); };

const onFileSelect = async (file:any) => {
  try {
    const raw = file?.raw as File;
    if (!raw) return;
    const buf = await raw.arrayBuffer();
    // 使用 worker 导入
    const worker = new Worker(new URL('../workers/importWorker.ts', import.meta.url), { type: 'module' });
    importing.value = true; importingName.value = raw.name; progress.value = {done:0,total:1};
    worker.onmessage = async (e: MessageEvent) => {
      const data: any = e.data;
      if (data?.type === 'progress') {
        progress.value = { done: Number(data.done||0), total: Number(data.total||1) };
      } else if (data?.type === 'done') {
        worker.terminate(); importing.value = false; progress.value = {done:1,total:1};
        await refresh(); ElMessage.success('文件已导入');
      } else if (data?.type === 'error') {
        worker.terminate(); importing.value = false; ElMessage.error('导入失败: '+(data.message||''));
      }
    };
    const ext = (/\.([a-z0-9]+)$/i.exec(raw.name)?.[1] || 'txt');
    const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    worker.postMessage({ type: 'import', task: { docId, name: raw.name.replace(/\.(pdf|docx|txt)$/i,''), ext, arrayBuffer: buf, chunkSize: chunkSize.value, overlap: overlap.value } });
  } catch (e:any) {
    ElMessage.error('导入失败: '+(e?.message||''));
  }
};

const importFromUrl = async () => {
  const u = urlToImport.value.trim(); if (!u) return;
  try {
    const res = await fetch(u);
    const ct = res.headers.get('content-type') || '';
    if (/pdf/i.test(ct)) {
      const buf = await res.arrayBuffer();
      const text = await extractPdfText(buf, 50);
      await importText(u, text);
    } else if (/officedocument\.wordprocessingml\.document|docx/i.test(ct)) {
      const buf = await res.arrayBuffer();
      const text = await extractDocxText(buf);
      await importText(u, text);
    } else if (/text\//i.test(ct)) {
      const text = await res.text();
      await importText(u, text);
    } else {
      const text = await res.text();
      await importText(u, text);
    }
    urlToImport.value = '';
    await refresh();
    ElMessage.success('URL 已导入');
  } catch (e:any) {
    ElMessage.error('URL 导入失败: '+(e?.message||''));
  }
};

// 索引与检索
const openIndexDialog = () => { indexVisible.value = true; if (!selectedDocId.value && docs.value.length) selectedDocId.value = docs.value[0].id; };
const buildIndex = async () => {
  const docId = selectedDocId.value; if (!docId) return;
  try {
    indexing.value = true; indexProgress.value = '加载分块...';
    const chunks = await getDocChunks(docId);
    if (!chunks.length) { ElMessage.warning('该文档暂无分块'); indexing.value=false; return; }
    indexProgress.value = `嵌入 ${chunks.length} 段...`;
    const texts = chunks.map(c => c.text);
    const { embedTexts } = await import('../modules/system/ipc');
    const vectors: number[][] = await embedTexts('aliyun', texts, { model: 'text-embedding-v1' });
    await saveVectors(docId, chunks, vectors.map((v, i) => ({ id: chunks[i].id, vector: v })) as any);
    ElMessage.success('索引已生成');
  } catch (e:any) {
    ElMessage.error('生成索引失败: '+(e?.message||''));
  } finally { indexing.value = false; }
};
const searchByVector = async () => {
  const q = queryText.value.trim(); const docId = selectedDocId.value; if (!q || !docId) return;
  try {
    const { embedTexts } = await import('../modules/system/ipc');
    const vectors: number[][] = await embedTexts('aliyun', [q], { model: 'text-embedding-v1' });
    const vec = (vectors && vectors[0]) || [];
    const res = await vectorSearch(docId, vec, 8);
    results.value = res; resultVisible.value = true;
  } catch (e:any) {
    ElMessage.error('检索失败: '+(e?.message||''));
  }
};

onMounted(refresh);

// 首屏若存在定位锚点，滚动到对应分块（后续可加高亮）
onMounted(async () => {
  try {
    const raw = localStorage.getItem('kbLocate');
    if (!raw) return;
    const anchor = JSON.parse(raw);
    localStorage.removeItem('kbLocate');
    if (anchor?.docId) {
      lastDocId = anchor.docId;
      await handleSearch();
      // 结果中无直接 DOM 分块，先打开结果弹窗供用户查看
    }
  } catch {}
});
</script>

<style scoped>
.kb-page { padding: 16px; }
.kb-header { display:flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.toolbar { display:flex; gap:8px; margin-bottom: 12px; }
.results { display:flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow:auto; }
.result { padding: 10px; background: var(--bg-secondary); border-radius: 8px; }
.result .score { font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; }
.empty { color: var(--text-secondary); }
</style>


