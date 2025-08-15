<template>
	<el-dialog v-model="visible" title="提示词库" width="720px" :close-on-click-modal="false">
		<div class="toolbar">
			<el-input v-model="keyword" placeholder="搜索提示词" clearable />
			<el-button type="primary" @click="createPrompt">新增</el-button>
		</div>
		<el-table :data="filteredPrompts" height="420">
			<el-table-column prop="name" label="名称" width="180" show-overflow-tooltip />
			<el-table-column prop="content" label="内容" show-overflow-tooltip />
			<el-table-column label="操作" width="180">
				<template #default="{ row, $index }">
					<el-button size="small" @click="apply(row)">应用</el-button>
					<el-button size="small" @click="edit($index)">编辑</el-button>
					<el-button size="small" type="danger" @click="remove($index)">删除</el-button>
				</template>
			</el-table-column>
		</el-table>
		<template #footer>
			<el-button @click="close">关闭</el-button>
		</template>
	</el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useChatStore } from '../../store/chat';

const store = useChatStore();
const visible = computed({
	get: () => store.isPromptsOpen,
	set: (v: boolean) => (store.isPromptsOpen = v as any)
});
const keyword = ref('');

type Prompt = { name: string; content: string };
const prompts = ref<Prompt[]>([]);

// 读取/持久化
const load = () => {
	try {
		const raw = localStorage.getItem('prompts') || '[]';
		prompts.value = JSON.parse(raw);
	} catch { prompts.value = []; }
};
const save = () => localStorage.setItem('prompts', JSON.stringify(prompts.value));
load();

const filteredPrompts = computed(() =>
	prompts.value.filter(p =>
		!keyword.value || p.name.includes(keyword.value) || p.content.includes(keyword.value)
	)
);

function createPrompt() {
	prompts.value.unshift({ name: '新提示词', content: '在此填写系统提示词...' });
	save();
}
function edit(index: number) {
	const p = prompts.value[index];
	const name = prompt('名称', p.name) || p.name;
	const content = prompt('内容', p.content) || p.content;
	prompts.value[index] = { name, content };
	save();
}
function remove(index: number) {
	prompts.value.splice(index, 1);
	save();
}
function apply(p: Prompt) {
	const tab = store.currentTab;
	if (!tab) return;
	tab.systemPrompt = p.content;
	store.saveTabsToStorage();
	visible.value = false;
}
function close() { visible.value = false; }

watch(() => store.isPromptsOpen, (v) => v && load());
</script>

<style scoped>
.toolbar { display:flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-sm); align-items: center; }
.toolbar :deep(.el-input__wrapper) { background: var(--bg-primary); border: 1px solid var(--border-color); box-shadow: none; }
.toolbar :deep(.el-button--primary) { background: var(--primary-color); border-color: var(--primary-color); }

/* 表格主题统一 */
:deep(.el-table) { background: var(--bg-primary); color: var(--text-primary); }
:deep(.el-table th) { background: var(--bg-secondary); color: var(--text-primary); font-weight: 600; }
:deep(.el-table td) { border-bottom: none; }
:deep(.el-table tr:hover > td) { background: var(--bg-secondary); }

/* 内容列允许换行 */
:deep(.el-table .cell) { white-space: normal; word-break: break-word; line-height: 1.6; }
</style>


