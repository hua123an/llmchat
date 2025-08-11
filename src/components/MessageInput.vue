<template>
  <div class="message-input-container">
    <!-- 顶部控制栏 - 包含之前的ChatHeader功能 -->
    <div class="controls-bar">
      <div class="provider-controls">
        <el-select 
          v-model="currentProvider" 
          :placeholder="isLoadingProviders ? t('chat.placeholders.loadingProviders') : t('chat.placeholders.selectProvider')" 
          @change="handleProviderChange" 
          class="provider-select"
          :loading="isLoadingProviders">
          <el-option 
            v-for="provider in localProviders" 
            :key="provider.name" 
            :label="formatProviderName(provider.name)" 
            :value="provider.name">
          </el-option>
          <!-- 如果没有数据且不在加载中，显示错误提示 -->
          <el-option 
            v-if="localProviders.length === 0 && !isLoadingProviders" 
            :label="t('chat.placeholders.loadingProviders')" 
            value="" 
            disabled>
          </el-option>
        </el-select>
        
        <el-select 
          v-model="currentModel" 
          :placeholder="t('chat.placeholders.selectModel')" 
          :disabled="!currentProvider" 
          :loading="currentProviderModels.isLoading"
          class="model-select"
        >
          <el-option v-for="model in currentProviderModels.data" :key="model.id" :label="model.name || model.id" :value="model.id"></el-option>
          <el-option v-if="currentProviderModels.data.length === 0 && !currentProviderModels.isLoading" :label="'No models available'" value="" disabled></el-option>
        </el-select>
        

      </div>
      
      <div class="right-controls">
        <div class="usage-display">
          <div class="usage-item">
            <span class="usage-icon">🔢</span>
            <span class="usage-text">{{ store.totalUsage.total_tokens }}</span>
            <span class="usage-label">{{ t('chat.tokenInfo.tokens') }}</span>
          </div>
        </div>
        

      </div>
    </div>
    
    <!-- 主输入区域 -->
    <div class="input-wrapper">
      <div class="input-content" @paste="handlePaste">
        <input
          ref="fileInputRef"
          type="file"
          multiple
          accept="image/*,text/*,.md,.markdown,.mdx,.mdc,.txt,.csv,.json,.yaml,.yml,.xml,.ini,.cfg,.log,.py,.js,.jsx,.ts,.tsx,.java,.go,.rs,.rb,.php,.c,.cc,.cpp,.h,.hh,.hpp,.cs,.kt,.kts,.swift,.scala,.sh,.bash,.zsh,.bat,.ps1,.sql,.toml,.gradle,.m,.mm,.r,.pl,.lua,.dart,.pdf,.doc,.docx"
          @change="handleFileSelect"
          style="display: none;"
        />
        <!-- 附件预览浮层：悬停输入框上方 -->
        <transition name="fade">
          <div v-if="attachedFiles.length" class="attachments-floating" @wheel.stop>
            <template v-for="(f, i) in attachedFiles" :key="f.id">
              <div v-if="f.dataUrl && f.mime?.startsWith('image/')" class="image-tile" @click="openPreview(f)">
                <img :src="f.dataUrl" alt="attachment" />
                <button class="tile-remove" @click.stop="removeAttachmentById(f.id)" aria-label="remove">×</button>
              </div>
              <div v-else class="attachment-chip" @click="openPreview(f)">
                <span class="name">{{ f.name }}</span>
                <button class="remove" @click.stop="removeAttachment(i)" aria-label="remove">×</button>
              </div>
            </template>
          </div>
        </transition>
        
        <!-- 输入框 -->
        <el-input
          v-model="store.userInput"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 6 }"
          :placeholder="t('chat.placeholders.askAnything')"
          class="message-textarea"
          @keydown="handleKeyDown"
          resize="none"
          ref="textareaRef"
        />
        
        <!-- 右侧功能按钮 -->
        <div class="input-actions">
          <button class="action-button" @click="triggerFileInput" :title="'Upload attachments'">📎</button>
          <button class="action-button" v-if="canOCR" @click="runOCRForImages" :title="'OCR'">🔤</button>
                <!-- 联网搜索开关 - 支持OpenRouter和Moonshot -->
      <div v-if="isWebSearchSupported" class="web-search-container">
        <div class="web-search-switch" :title="webSearchEnabled ? '关闭联网搜索' : '开启联网搜索'">
          <input
            type="checkbox"
            id="webSearchToggle"
            v-model="webSearchEnabled"
            class="switch-input"
          />
          <label for="webSearchToggle" class="switch-label">
            <span class="switch-button"></span>
            <span class="switch-icon">🌐</span>
          </label>
        </div>
        <!-- API状态指示器 -->
        <div 
          v-if="apiStatus && webSearchEnabled" 
          class="api-status-indicator"
          :class="{ 'healthy': apiStatus.healthy, 'unhealthy': !apiStatus.healthy }"
          :title="apiStatus.message"
        >
          <span class="status-dot"></span>
        </div>
      </div>
          <!-- 不支持联网搜索的服务商提示 -->
    <div v-else-if="currentProvider" class="web-search-disabled-hint" title="联网搜索功能仅在OpenRouter、Moonshot、智谱AI、302AI和讯飞星火（Pro/Max/Ultra版本）可用">
      <span class="disabled-icon">🌐</span>
      <span class="disabled-text">联网搜索不可用</span>
    </div>
          <button 
            @click="handleSendMessage"
            :disabled="!store.userInput.trim() || !currentProvider || isSending"
            class="send-button"
            :class="{ 'has-content': store.userInput.trim() }"
            :aria-label="t('chat.sendButton')"
            :title="t('chat.sendButton')"
          >
            <!-- 纸飞机图标（Material Send 图标） -->
            <svg class="send-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2L2 14z" />
            </svg>
          </button>
        </div>
      </div>
      

    </div>
  </div>
  <AttachmentPreview v-model="previewOpen" :attachment="previewAtt" @import="handleImportToKB" />
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChatStore } from '../store/chat';
// recognizeImage 已在上方导入一次，避免重复导入
// import type { Attachment } from '../store/chat';
import { fileToAttachment } from '../services/attachments';
import AttachmentPreview from './common/AttachmentPreview.vue';
import { importAttachmentAsDoc } from '../services/rag/import';
import { ElMessage } from 'element-plus';
import { recognizeImage } from '../services/ocr';
import { useChatMutation } from '../services/router/modelRouter';

const store = useChatStore();
const { t } = useI18n();

// 本地化显示 Provider 名称
const formatProviderName = (provider?: string) => {
  if (!provider) return '';
  const key = provider.toLowerCase();
  const translationKey = `providers.${key}`;
  const name = t(translationKey);
  // 如果翻译key和返回值相同，说明没有找到翻译，返回原始值
  return name === translationKey ? provider : name;
};
const textareaRef = ref();
const fileInputRef = ref<HTMLInputElement>();
const chatMutation = useChatMutation();
const isSending = computed(() => (chatMutation as any).isPending?.value ?? false);

// 使用 store 附件
const attachedFiles = computed(() => store.currentTab?.attachments || []);

// 安全的计算属性
const currentProvider = computed({
  get: () => store.currentTab?.provider || '',
  set: (value: string) => {
    if (store.currentTab) {
      store.currentTab.provider = value;
    }
  }
});

const currentModel = computed({
  get: () => store.currentTab?.model || '',
  set: (value: string) => {
    if (store.currentTab) {
      store.currentTab.model = value;
    }
  }
});

// 已移除 currentModels - 现在直接使用 currentProviderModels.data

// 重构：使用本地ref存储providers，确保响应式
const localProviders = ref<Array<{name: string, baseUrl: string}>>([]);
const isLoadingProviders = ref(false);

// 从store同步providers到本地
const syncProviders = async () => {
  if (isLoadingProviders.value) return; // 防止重复加载
  
  try {
    isLoadingProviders.value = true;
    // 使用store的loadProviders方法
    const success = await store.loadProviders();
    
    if (success && store.providers && Array.isArray(store.providers) && store.providers.length > 0) {
      localProviders.value = [...store.providers];
    } else {
      localProviders.value = [];
    }
  } catch (error) {
    // 静默处理错误，避免控制台噪音
    localProviders.value = [];
  } finally {
    isLoadingProviders.value = false;
  }
};

// 监听store变化并同步
watch(() => store.providers, (newProviders) => {
  if (Array.isArray(newProviders) && newProviders.length > 0) {
    localProviders.value = [...newProviders];
  }
}, { immediate: true, deep: true });

// 处理键盘事件
const handleKeyDown = async (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    await handleSendMessage();
  }
};

// 发送消息 - 使用 TanStack Mutation
const handleSendMessage = async () => {
  if (!store.userInput.trim() || !currentProvider.value || isSending.value) {
    return;
  }

  // 预算预警
  try {
    const raw = localStorage.getItem('appSettings');
    const cfg = raw ? JSON.parse(raw) : {};
    const budget = Number(cfg.budgetToken || 0);
    const warnPct = Number(cfg.warnPercent || 80);
    if (budget > 0) {
      const used = store.totalUsage.total_tokens;
      const threshold = Math.floor((budget * warnPct) / 100);
      if (used >= threshold) {
        const key = `budgetWarn_${threshold}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          (window as any).ElMessage?.warning?.(t('notifications.budgetWarn'));
        }
      }
    }
  } catch {}

  try {
    // 创建消息对
    const messagePair = store.createMessagePair(webSearchEnabled.value);
    if (!messagePair) return;

    const { userMessage, assistantMessage, currentProvider: provider, currentModel: model } = messagePair;
    
    // 立即添加到UI
    store.currentTab!.messages.push(userMessage);
    store.userInput = '';
    store.scrollToBottom();
    store.currentTab!.messages.push(assistantMessage);

    // 准备有效负载
    const payload = await store.prepareMessagePayload(userMessage, assistantMessage, webSearchEnabled.value);
    if (!payload) return;

    // 清空附件
    store.currentTab!.attachments = [];

    // 读取搜索策略
    let webOpts: any = { search_context_size: 'medium' };
    try {
      const raw = localStorage.getItem('appSettings');
      const cfg = raw ? JSON.parse(raw) : {};
      webOpts.search_context_size = cfg.searchContextSize || 'medium';
      webOpts.max_results = Number(cfg.searchMaxResults || 10);
      webOpts.timeout_sec = Number(cfg.searchTimeoutSec || 10);
      webOpts.retry = Number(cfg.searchRetry || 1);
      webOpts.concurrency = Number(cfg.searchConcurrency || 2);
      webOpts.weights = cfg.searchWeights || { google:4, bing:3, baidu:2, duck:1 };
    } catch {}

    // 使用 TanStack Mutation 发送
    await chatMutation.mutateAsync({
      provider,
      model,
      messages: payload.messagesToSend,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      attachments: payload.attachmentsToSend,
      webSearchEnabled: webSearchEnabled.value,
      webSearchOptions: webOpts
    });

    // 发送后重新聚焦
    await nextTick();
    if (textareaRef.value) {
      textareaRef.value.focus();
    }
  } catch (error: any) {
    console.error('发送消息失败:', error);
    
    // 处理特定错误
    const message = String(error?.message || '');
    if (/image input not supported/i.test(message)) {
      const tip = t('errors.imageNotSupported') || '当前模型不支持图像输入，请切换到支持多模态的模型，或移除图片后重试。';
      const assistant = store.currentTab!.messages.find(m => m.role === 'assistant' && !m.content);
      if (assistant) {
        assistant.content = tip;
        store.saveTabsToStorage();
      }
    } else {
      // 其他错误显示通用错误信息
      const assistant = store.currentTab!.messages.find(m => m.role === 'assistant' && !m.content);
      if (assistant) {
        assistant.content = t('errors.generic') || '发送失败，请重试。';
        store.saveTabsToStorage();
      }
    }
  }
};



// 文件附件功能
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const pushAttachmentOnce = (att: any) => {
  if (!att) return;
  if (!store.currentTab) return;
  if (!store.currentTab.attachments) store.currentTab.attachments = [];
  const exists = store.currentTab.attachments.some(a => (
    (a.dataUrl && a.dataUrl === att.dataUrl) ||
    (a.name === att.name && a.size === att.size && a.mime === att.mime)
  ));
  if (!exists) {
    if (store.currentTab.attachments.length >= 5) {
      (window as any).ElMessage?.warning?.('Too many attachments (max 5)');
      return;
    }
    store.currentTab.attachments.push(att);
  }
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    const newFiles = Array.from(target.files);
    for (const f of newFiles) {
      const att = await fileToAttachment(f);
      pushAttachmentOnce(att);
    }
    
    // 更新输入框内容（提示有附件）
    // 不再把附件提示写回输入框，避免输入框内容被覆盖或异常
  }
  
  // 重置文件输入
  if (target) {
    target.value = '';
  }
};

const removeAttachment = (index: number) => {
  if (!store.currentTab?.attachments) return;
  store.currentTab.attachments.splice(index, 1);
};

const removeAttachmentById = (id: string) => {
  if (!store.currentTab?.attachments) return;
  const idx = store.currentTab.attachments.findIndex(a => a.id === id);
  if (idx >= 0) store.currentTab.attachments.splice(idx, 1);
};

  // 支持粘贴图片/文件到输入框作为附件
  const handlePaste = async (e: ClipboardEvent) => {
    try {
      const dt = e.clipboardData; if (!dt) return;
      const items = dt.items; if (!items || items.length === 0) return;
      let attached = false;
      for (const it of Array.from(items)) {
        if (it.kind === 'file') {
          const file = it.getAsFile();
          if (file) {
            const att = await fileToAttachment(file);
            pushAttachmentOnce(att);
            attached = true;
          }
        }
      }
      // 如果有粘贴的文件，阻止把二进制数据直接粘到文本框
      if (attached) e.preventDefault();
    } catch {}
  };

// 已合并为统一附件按钮

// moved to services/attachments.ts

// 使用响应式变量存储当前的模型数据
const currentProviderModels = ref<{ data: { id: string; name?: string }[], isLoading: boolean, error: any }>({ data: [], isLoading: false, error: null });

// 监听 provider 变化并更新模型
watch(() => currentProvider.value, async (newProvider, _oldProvider) => {
  if (!newProvider) {
    currentProviderModels.value = { data: [], isLoading: false, error: null };
    return;
  }
  
  currentProviderModels.value.isLoading = true;
  currentProviderModels.value.error = null;
  
  try {
    // 直接调用 store 方法获取模型，暂时回退到原始方法确保稳定性
    await store.fetchModels();
    
    // 从 store 获取更新后的模型
    const models = store.currentTab?.models || [];
    
    currentProviderModels.value = {
      data: models,
      isLoading: false,
      error: null
    };
  } catch (error) {
    currentProviderModels.value = {
      data: [],
      isLoading: false,
      error: error
    };
    
    // 显示用户友好的错误消息
    (window as any).ElMessage?.error?.(`获取模型列表失败`);
  }
}, { immediate: true });

// 监听模型数据变化，自动选择第一个模型
watch(() => currentProviderModels.value.data, (newModels) => {
  if (newModels && newModels.length > 0 && store.currentTab && !store.currentTab.model) {
    store.currentTab.models = newModels;
    store.currentTab.model = newModels[0].id;
    store.saveTabsToStorage?.();
  }
}, { immediate: true });

// 处理provider变化 - 现在由 watcher 自动处理
const handleProviderChange = async () => {
  // watcher 会自动处理模型加载，这里只需要清空当前模型
  if (store.currentTab) {
    store.currentTab.model = '';
  }
  
  // 如果切换到不支持联网搜索的服务商，自动关闭联网搜索
  if (!isWebSearchSupported.value && webSearchEnabled.value) {
    webSearchEnabled.value = false;
          ElMessage.info('已自动关闭联网搜索，该功能仅在OpenRouter、Moonshot、智谱AI、302AI和讯飞星火（Pro/Max/Ultra版本）可用');
  }
};

onMounted(async () => {
  // 确保store已初始化
  if (!store.providers) {
    console.warn('Store not properly initialized, waiting...');
    await nextTick();
  }
  
  // 直接同步providers数据
  await syncProviders();
  
  // 如果仍然没有数据，尝试通过store加载
  if (localProviders.value.length === 0) {
    try {
      await store.loadInitialData();
      // 再次尝试同步
      await syncProviders();
    } catch (error) {
      console.error('❌ Fallback failed:', error);
    }
  }
  
  // 模型加载现在由 provider watcher 自动处理
  
  // 自动聚焦到输入框
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
    }
  });
  
  // 监听来自托盘/全局快捷键的截图请求（按设置开关生效）
  try {
    window.electronAPI.onCaptureRequest(async () => {
      // 全能按钮方案：收到全局截图请求时，直接弹出文件选择（只允许图片）
      if (!fileInputRef.value) return;
      const originalAccept = fileInputRef.value.accept;
      fileInputRef.value.accept = 'image/*';
      fileInputRef.value.click();
      setTimeout(() => { if (fileInputRef.value) fileInputRef.value.accept = originalAccept; }, 0);
    });
    // 打开设置快捷键（来自主进程 globalShortcut）
    window.electronAPI?.onOpenSettings?.(() => {
      // 触发 UI 打开设置对话框
      store.isSettingsOpen = true;
    });
  } catch {}
});

// 预览对话框
const previewOpen = ref(false);
const previewAtt = ref<any>(null);
const openPreview = (att: any) => { previewAtt.value = att; previewOpen.value = true; };

const handleImportToKB = async () => {
  try {
    const att = previewAtt.value;
    if (!att) return;
    await importAttachmentAsDoc(att);
    ElMessage.success(t('knowledge.importSuccess'));
  } catch (e: any) {
    if (e?.code === 'NO_TEXT') {
      ElMessage.warning(t('knowledge.notTextAttachment'));
    } else {
      ElMessage.error(t('knowledge.importFailure'));
    }
  }
};

const canOCR = computed(() => {
  const files = attachedFiles.value as any[];
  return Array.isArray(files) && files.some(f => typeof f?.mime === 'string' && f.mime.startsWith('image/'));
});

// 删除未使用的计算属性

// 检测是否支持联网搜索的服务商（OpenRouter + Moonshot + 智谱AI + 302AI）
const isWebSearchSupported = computed(() => {
  const provider = currentProvider.value?.toLowerCase();
  const currentModel = store.currentTab?.model?.toLowerCase() || '';
  
  if (!provider) return false;
  
  // OpenRouter、Moonshot、智谱AI、302AI 支持联网搜索
  if (provider.includes('openrouter') || provider.includes('moonshot') || provider.includes('zhipu') || provider.includes('302ai')) {
    return true;
  }
  
  // 讯飞星火 支持联网搜索（仅Pro、Max、4.0Ultra版本）
  if (provider.includes('spark')) {
    // 只有特定版本支持联网搜索：Pro (generalv3), Max (generalv2), 4.0Ultra (generalv3.5)
    // 也包括带有pro、max、ultra字样的模型如pro-128k、max-32k
    return currentModel.includes('generalv3') || // Spark Pro
           currentModel.includes('generalv2') || // Spark Max
           currentModel.includes('generalv3.5') || // Spark 4.0 Ultra
           currentModel.includes('pro') || // pro-128k等
           currentModel.includes('max') || // max-32k等
           currentModel.includes('ultra'); // ultra系列
  }
  
  return false;
});

const runOCRForImages = async () => {
  try {
    // 语言在 recognizeImage 内部自动读取
    const images = (attachedFiles.value as any[]).filter(f => f.mime?.startsWith('image/') && f.dataUrl);
    if (images.length === 0) return;
    // 逐个做 OCR，将结果追加到输入框
    let all = '';
    for (const img of images) {
      const res = await fetch(img.dataUrl).then(r => r.blob()).then(b => new File([b], img.name, { type: img.mime }));
      const text = await recognizeImage(res as File);
      all += `\n\n[OCR:${img.name}]\n${text}`;
    }
    store.userInput = (store.userInput || '') + all;
    ElMessage.success('OCR completed');
  } catch (e) {
    ElMessage.error('OCR failed');
  }
};

// 联网搜索开关 - 简化逻辑，移除前缀依赖
const webSearchEnabled = ref(false);

// API服务状态
const apiStatus = ref<{healthy: boolean; message: string} | null>(null);

// 检查API服务状态
const checkAPIStatus = async () => {
  try {
    const status = await (window as any).electronAPI?.checkSearchAPIStatus?.();
    if (status) {
      apiStatus.value = {
        healthy: status.healthy,
        message: status.message
      };
    }
  } catch (error) {
    console.warn('检查API状态失败:', error);
  }
};

// 组件挂载时检查API状态
onMounted(() => {
  checkAPIStatus();
});
</script>

<style scoped>
.message-input-container {
  width: 100%;
  background: transparent;
}

/* 单层：强力移除外层样式（覆盖全局layout.css的.input-wrapper） */
.message-input-container .input-wrapper {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  box-shadow: none !important;
}

.message-input-container .input-wrapper:hover,
.message-input-container .input-wrapper:focus-within {
  border: none !important;
  box-shadow: none !important;
}

.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.provider-controls {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.provider-select,
.model-select {
  min-width: 140px;
}



.provider-select :deep(.el-input__wrapper),
.model-select :deep(.el-input__wrapper) { background: var(--input-bg); border: none; border-radius: 8px; box-shadow: none; }

.provider-select :deep(.el-input__inner),
.model-select :deep(.el-input__inner) {
  color: var(--text-primary);
  font-size: 13px;
}



.right-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

/* Agent选择器样式 */
.agent-selector-container {
  display: flex;
  align-items: center;
}

.selected-agent {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.selected-agent:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.agent-avatar {
  font-size: 16px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reset-agent-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.reset-agent-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.select-agent-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.select-agent-btn .btn-icon {
  font-size: 16px;
}

.usage-display {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.usage-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: all 0.2s ease;
  animation: fadeInUp 0.3s ease-out;
}

.usage-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-hover);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.usage-icon {
  font-size: 12px;
}

.usage-text {
  font-family: monospace;
  font-weight: 600;
  font-size: 11px;
}

.usage-label {
  font-size: 10px;
  color: var(--text-tertiary);
}

.system-prompt-input {
  flex: 1;
  min-width: 200px;
}

.system-prompt-input :deep(.el-input__wrapper) { background: var(--bg-primary); border: none; border-radius: 8px; box-shadow: none; }

.system-prompt-input :deep(.el-input__inner) {
  color: #333333;
  font-size: 13px;
}

.system-prompt-input :deep(.el-input-group__append) {
  background: #f8f9fa;
  border-color: #e5e5e5;
  border-radius: 0 8px 8px 0;
}

.prompt-button {
  background: transparent !important;
  border: none !important;
  color: #666666 !important;
  font-size: 12px;
  font-weight: 500;
}

.theme-button {
  background: var(--bg-primary);
  border: none;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  flex-shrink: 0;
}

.theme-button:hover {
  background: #f8f9fa;
  border-color: #d0d0d0;
}

.input-wrapper {
  position: relative; /* 用作内部按钮的定位上下文 */
}

.input-wrapper:focus-within {
  /* 单层设计：去掉外层聚焦样式，由内层textarea负责视觉反馈 */
}

.input-content {
  position: relative;
}

/* 移除左侧附件按钮样式 */

.message-textarea {
  width: 100%;
}

/* 单层视觉：把边框、圆角、背景赋给 textarea 内层 */
.message-textarea :deep(.el-input__wrapper) {
  border: none;
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.message-textarea :deep(.el-textarea__inner) {
  background: var(--input-bg);
  border: none;
  border-radius: 16px;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.5;
  padding: 12px 44px 12px 40px; /* 预留左右按钮空间（按钮更小） */
  resize: none;
  outline: none;
  box-shadow: none;
}

.message-textarea :deep(.el-textarea__inner)::placeholder {
  color: #999999;
  font-size: 15px;
}

.input-actions {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  font-size: 16px;
  color: #666666;
}

.action-button:hover {
  background: #f8f9fa;
}

.action-button.recording {
  background: #ff4444;
  color: #ffffff;
  animation: pulse 1.5s infinite;
}

/* 联网搜索开关样式 */
/* 联网搜索容器样式 */
.web-search-container {
  display: flex;
  align-items: center;
  gap: 4px;
}

.web-search-switch {
  position: relative;
  display: inline-block;
}

.switch-input {
  display: none;
}

.switch-label {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.switch-label:hover {
  background: #d0d0d0;
}

.switch-input:checked + .switch-label {
  background: #4CAF50;
}

.switch-input:checked + .switch-label:hover {
  background: #45a049;
}

.switch-button {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.switch-input:checked + .switch-label .switch-button {
  transform: translateX(26px);
}

.switch-icon {
  position: absolute;
  font-size: 12px;
  z-index: 1;
  transition: opacity 0.3s ease;
}

/* API状态指示器样式 */
.api-status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: help;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: api-pulse 2s infinite;
}

.api-status-indicator.healthy .status-dot {
  background: #10b981;
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
}

.api-status-indicator.unhealthy .status-dot {
  background: #ef4444;
  box-shadow: 0 0 4px rgba(239, 68, 68, 0.4);
}

@keyframes api-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* 联网搜索禁用提示样式 */
.web-search-disabled-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 12px;
  cursor: help;
  opacity: 0.6;
}

.disabled-icon {
  font-size: 12px;
  opacity: 0.5;
}

.disabled-text {
  font-size: 10px;
  color: var(--text-secondary);
  white-space: nowrap;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.send-button {
  background: transparent; /* 移除背景 */
  border: none;
  border-radius: 8px; /* 再小一点 */
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:hover:not(:disabled) { background: transparent; transform: translateY(-1px); }

.send-button.has-content {
  background: transparent;
  color: var(--primary-color);
}

.send-button.has-content:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}



.btn-icon {
  font-size: 13px;
}

.btn-text {
  font-weight: 500;
}

/* 发送图标尺寸与对齐优化 */
.send-icon {
  display: block;
  width: 16px;
  height: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .controls-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .provider-controls {
    justify-content: space-between;
  }
  
  .right-controls {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .usage-display {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .usage-item {
    font-size: 10px;
    padding: 3px 6px;
  }
  
  .usage-text {
    font-size: 10px;
  }
  
  .usage-label {
    font-size: 9px;
  }
  

}

@media (max-width: 480px) {
  .controls-bar {
    gap: 8px;
  }
  
  .provider-controls {
    flex-direction: column;
    gap: 8px;
  }
  

  
  .right-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .input-wrapper {
    padding: 8px;
  }
  
  .input-content {
    margin-bottom: 6px;
  }
  

}
.attachments-preview { display:flex; gap:6px; flex-wrap:wrap; margin: 4px 40px 8px 40px; }
.attachments-floating { position: absolute; left: 12px; right: 12px; bottom: 52px; display:flex; gap:8px; flex-wrap:wrap; padding:8px; background: var(--bg-secondary); border:none; border-radius:12px; box-shadow: none; z-index: 3; }
.attachment-chip { display:flex; align-items:center; gap:6px; padding:4px 8px; background: var(--bg-tertiary); border: none; border-radius: 12px; font-size:12px; cursor:pointer; }
.attachment-chip .name { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.attachment-chip .remove { background: transparent; border: none; cursor: pointer; font-size: 14px; color: #999; }

.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.chip-thumb { width: 24px; height: 24px; border-radius: 4px; object-fit: cover; border: none; }

.image-tile { position: relative; width: 56px; height: 56px; border-radius: 8px; overflow: hidden; background: #00000010; border: none; }
.image-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tile-remove { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,.5); color: #fff; border: none; font-size: 12px; line-height: 18px; text-align: center; cursor: pointer; }
.tile-remove:hover { background: rgba(0,0,0,.7); }
</style>