<template>
	<el-dialog v-model="visible" title="插件" width="720px" :close-on-click-modal="false">
		<div class="toolbar">
			<el-button type="primary" @click="discover">发现插件</el-button>
		</div>
		<el-table :data="plugins" height="420">
			<el-table-column prop="name" label="名称" width="200" show-overflow-tooltip />
			<el-table-column prop="description" label="描述" show-overflow-tooltip />
			<el-table-column label="状态" width="160">
				<template #default="{ row }">
					<el-switch v-model="row.enabled" @change="save"/>
				</template>
			</el-table-column>
			<el-table-column label="操作" width="160">
				<template #default="{ row }">
					<el-button size="small" :disabled="!row.enabled" @click="run(row)">运行</el-button>
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
import { ElMessage } from 'element-plus';

const store = useChatStore();
const visible = computed({
	get: () => store.isPluginsOpen,
	set: (v: boolean) => (store.isPluginsOpen = v as any)
});

type PluginItem = { id: string; name: string; description: string; enabled: boolean };
const plugins = ref<PluginItem[]>([]);

// 内置插件清单（可按需扩展）
const defaultPlugins: PluginItem[] = [
  { id: 'web-search', name: '联网搜索', description: '为下一次提问启用联网检索增强', enabled: true },
  { id: 'summarize', name: '总结为要点', description: '将上一条回答提炼成 5 条要点', enabled: true },
  { id: 'translate-en', name: '翻译为英文', description: '把上一条回答翻译成英文，技术术语尽量保留', enabled: true },
  { id: 'rewrite', name: '润色改写', description: '按精简/正式/口语三种风格重写上一条回答', enabled: true },
  { id: 'tldr', name: 'TL;DR 会话摘要', description: '总结当前对话为要点与行动清单', enabled: true },
  { id: 'url-summarize', name: 'URL 抓取总结', description: '输入网址后抓取正文并总结', enabled: false },
  { id: 'doc-quickread', name: '文档速读', description: '解析上传文档并生成摘要目录', enabled: false },
  { id: 'ocr-extract', name: 'OCR 识图', description: '从图片/截图识别文字成可编辑文本', enabled: false },
  { id: 'kb-add', name: '加入知识库', description: '将当前附件/回答加入知识库以便检索', enabled: false },
  { id: 'prompt-apply', name: '从提示词库应用', description: '选择模板应用为系统提示词', enabled: false }
];

const mergeDefaults = () => {
  const existing: Record<string, PluginItem> = {};
  for (const p of plugins.value) existing[p.id] = p;
  for (const d of defaultPlugins) {
    if (existing[d.id]) {
      // 覆盖名称/描述，保留启用状态
      existing[d.id].name = d.name;
      existing[d.id].description = d.description;
    } else {
      plugins.value.push({ ...d });
    }
  }
};

const load = () => {
	try { plugins.value = JSON.parse(localStorage.getItem('plugins') || '[]'); }
	catch { plugins.value = []; }
  // 合并新增的内置插件
  mergeDefaults();
};
const save = () => localStorage.setItem('plugins', JSON.stringify(plugins.value));
load();
watch(() => store.isPluginsOpen, v => { if (v) load(); });

function discover() {
    // 无论是否已有数据，都尝试合并最新内置清单
    mergeDefaults();
    save();
    ElMessage.success('已刷新内置插件列表');
}

function run(p: PluginItem) {
    if (p.id === 'web-search') {
        // 直接走真实联网检索链路：调用 store.sendMessage(true)
        // 由 store.prepareMessagePayload 注入检索结果/直接答案到对话上下文
        if (!store.userInput || !store.userInput.trim()) { ElMessage.warning('请先输入你的问题'); return; }
        visible.value = false;
        setTimeout(() => store.sendMessage(true), 0);
        return;
    }
    if (p.id === 'summarize') {
        const last = store.currentTab?.messages?.slice().reverse().find(m => m.role === 'assistant');
        if (!last || !last.content) { ElMessage.warning('没有可总结的内容'); return; }
        store.userInput = '请把你上一条回答压缩为5条要点，尽量简洁、保留关键信息。';
        visible.value = false;
        setTimeout(() => store.sendMessage(false), 0);
        return;
    }
    if (p.id === 'translate-en') {
        const last = store.currentTab?.messages?.slice().reverse().find(m => m.role === 'assistant');
        if (!last || !last.content) { ElMessage.warning('没有可翻译的内容'); return; }
        // 直接调用本地翻译 API（LibreTranslate 兼容），并将结果作为新的助手消息插入
        import('../../modules/system/ipc').then(m => m.translateText(last.content, 'en', 'auto')).then((res: any) => {
            if (res?.ok) {
                const msg = {
                    id: `msg-${Date.now()}`,
                    role: 'assistant',
                    content: res.text || '',
                    timestamp: Date.now(),
                    model: 'libretranslate',
                    provider: 'translate-api'
                } as any;
                const tab = store.currentTab;
                if (tab) {
                    tab.messages.push(msg);
                    store.saveTabsToStorage();
                    store.scrollToBottom();
                }
                visible.value = false;
            } else {
                ElMessage.error('翻译失败：' + (res?.message || ''));
            }
        }).catch((e: any) => ElMessage.error('翻译异常：' + e?.message));
        return;
    }
    if (p.id === 'rewrite') {
        const last = store.currentTab?.messages?.slice().reverse().find(m => m.role === 'assistant');
        if (!last || !last.content) { ElMessage.warning('没有可改写的内容'); return; }
        store.userInput = '请基于你上一条回答，输出三种改写版本：\n1) 精简版：保留核心信息，越短越好\n2) 正式版：书面、完整、逻辑清晰\n3) 口语版：更亲切、易懂、适合口头表达';
        visible.value = false;
        setTimeout(() => store.sendMessage(false), 0);
        return;
    }
    if (p.id === 'tldr') {
        store.userInput = '请对当前对话进行 TL;DR 总结：\n- 关键要点（不超过5条）\n- 行动清单（可执行的下一步）';
        visible.value = false;
        setTimeout(() => store.sendMessage(false), 0);
        return;
    }
    if (p.id === 'url-summarize') {
        const url = prompt('请输入要抓取的网页URL');
        if (!url) return;
        // 交给后端的 fetch-readable IPC（已存在）
        import('../../modules/system/ipc').then(m => m.fetchReadable(url)).then((content: string) => {
            store.userInput = `请阅读以下网页正文并用要点+引用总结：\n\n${content.slice(0, 8000)}`;
            visible.value = false;
            setTimeout(() => store.sendMessage(false), 0);
        }).catch(() => ElMessage.error('抓取网页失败'));
        return;
    }
    if (p.id === 'doc-quickread') {
        const tab = store.currentTab;
        const att = tab?.attachments && tab.attachments[0];
        if (!att || !(att.fullText || att.textSnippet)) { ElMessage.warning('请先添加可解析的文档(PDF/DOCX/TXT等)'); return; }
        store.userInput = `请阅读以下文档并生成：\n- 摘要(不超过10行)\n- 关键要点(不超过8条)\n- 目录式大纲\n\n文档内容：\n${(att.fullText || att.textSnippet || '').slice(0, 8000)}`;
        visible.value = false;
        setTimeout(() => store.sendMessage(false), 0);
        return;
    }
    if (p.id === 'ocr-extract') {
        // 直接提示使用者添加图片；如需自动OCR，可在发送链里检测图片并调用 ocr 服务
        ElMessage.info('请在输入框的📎添加图片，发送前可选用“总结为要点/润色改写”等插件处理识别结果');
        return;
    }
    if (p.id === 'kb-add') {
        const tab = store.currentTab;
        const att = tab?.attachments && tab.attachments[0];
        if (!att || !(att.fullText || att.textSnippet)) { ElMessage.warning('请先添加文档附件'); return; }
        // 简化版：把文档摘要后入库的指令交由模型完成（可后续接 RAG 入库 API）
        store.userInput = `将以下文档内容提取关键信息并生成可检索条目，格式：标题+摘要+关键词，最后回答“已加入知识库”。\n\n${(att.fullText || att.textSnippet || '').slice(0, 8000)}`;
        visible.value = false;
        setTimeout(() => store.sendMessage(false), 0);
        return;
    }
    if (p.id === 'prompt-apply') {
        store.openPrompts();
        return;
    }
    ElMessage.info('该插件为占位示例，可扩展为调用后端/工具链');
}

function close() { visible.value = false; }
</script>

<style scoped>
.toolbar { display:flex; justify-content:flex-end; margin-bottom: var(--spacing-sm); gap: var(--spacing-sm); }
.toolbar :deep(.el-button--primary) { background: var(--primary-color); border-color: var(--primary-color); }

/* 表格主题统一 */
:deep(.el-table) { background: var(--bg-primary); color: var(--text-primary); }
:deep(.el-table th) { background: var(--bg-secondary); color: var(--text-primary); font-weight: 600; }
:deep(.el-table td) { border-bottom: none; }
:deep(.el-table tr:hover > td) { background: var(--bg-secondary); }

/* 允许换行 */
:deep(.el-table .cell) { white-space: normal; word-break: break-word; line-height: 1.6; }
</style>


