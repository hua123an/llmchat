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
      </div>
    </div>
    <div class="toolbar">
      <el-input v-model="query" placeholder="搜索文档内容" clearable @keyup.enter="handleSearch" />
      <el-button @click="handleSearch">搜索</el-button>
    </div>
    <el-table :data="docs" height="420" style="width: 100%">
      <el-table-column prop="name" label="名称" width="240" />
      <el-table-column prop="size" label="大小" width="120" />
      <el-table-column prop="createdAt" label="时间" width="200">
        <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <el-button size="small" @click="preview(row)">预览</el-button>
          <el-button size="small" type="primary" @click="searchDoc(row)">在此搜索</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { listAllDocs, importText, searchInDoc, clearKnowledgeBase } from '../services/rag';

const docs = ref<Array<{ id:string; name:string; size:number; createdAt:number }>>([]);
const query = ref('');
const importVisible = ref(false);
const importName = ref('');
const importTextValue = ref('');
const resultVisible = ref(false);
const results = ref<any[]>([]);
let lastDocId: string | null = null;

const refresh = async () => { docs.value = await listAllDocs(); };
const openImport = () => { importVisible.value = true; };
const doImport = async () => {
  try {
    const m = await importText(importName.value || '新文档', importTextValue.value || '');
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

onMounted(refresh);
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


