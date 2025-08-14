<template>
  <div class="message-input-container">
    <!-- 简化的输入区域 -->
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
        
        <!-- 附件预览 -->
        <transition name="fade">
          <div v-if="attachedFiles.length" class="attachments-floating">
            <template v-for="(f, i) in attachedFiles" :key="f.id">
              <div v-if="f.dataUrl && f.mime?.startsWith('image/')" class="image-tile" @click="openPreview(f)">
                <img :src="f.dataUrl" alt="attachment" />
                <button class="tile-remove" @click.stop="removeAttachmentById(f.id)">×</button>
              </div>
              <div v-else class="attachment-chip" @click="openPreview(f)">
                <span class="name">{{ f.name }}</span>
                <button class="remove" @click.stop="removeAttachment(i)">×</button>
              </div>
            </template>
          </div>
        </transition>
        
        <!-- 集成的输入框 -->
        <div class="integrated-input-box">
          <!-- 左侧模型选择器 -->
          <div class="model-selector-dropdown">
            <el-dropdown @command="handleModelSelect" trigger="click" class="model-dropdown" placement="top-start">
              <div class="model-selector-button">
                <div class="model-icon">⚡</div>
                <span class="model-name">{{ getModelDisplayName() }}</span>
                <el-icon class="dropdown-icon"><arrow-down /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu class="custom-dropdown-menu">
                  <div class="dropdown-header">
                    <span class="header-icon">🤖</span>
                    <span class="header-text">选择 AI 模型</span>
                  </div>
                  
                  <!-- 二级菜单：提供商和模型 -->
                  <div class="provider-menu">
                    <div 
                      v-for="provider in localProviders" 
                      :key="provider.name"
                      :class="['provider-menu-item', { 
                        active: currentProvider === provider.name,
                        expanded: expandedProvider === provider.name 
                      }]"
                    >
                      <!-- 提供商主菜单项 -->
                      <div class="provider-header">
                        <!-- 提供商信息区域 - 点击切换提供商 -->
                        <div 
                          class="provider-info-clickable"
                          @click="selectProvider(provider.name)"
                        >
                          <div class="provider-icon">{{ getProviderIcon(provider.name) }}</div>
                          <span class="provider-name">{{ formatProviderName(provider.name) }}</span>
                          <span class="provider-badge" v-if="getProviderModelCount(provider.name) > 0">
                            {{ getProviderModelCount(provider.name) }}
                          </span>
                        </div>
                        
                        <!-- 操作区域 -->
                        <div class="provider-actions">
                          <div v-if="currentProvider === provider.name" class="current-indicator">当前</div>
                          <div 
                            :class="['expand-icon', { rotated: expandedProvider === provider.name }]"
                            @click="toggleProvider(provider.name)"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M7 10l5 5 5-5z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 模型子菜单 -->
                      <transition name="expand">
                        <div 
                          v-if="expandedProvider === provider.name && getProviderModels(provider.name).length > 0"
                          class="model-submenu"
                        >
                          <div 
                            v-for="model in getProviderModels(provider.name)" 
                            :key="model.id"
                            @click="selectModel(provider.name, model.id)"
                            :class="['model-submenu-item', { 
                              active: currentProvider === provider.name && currentModel === model.id 
                            }]"
                          >
                            <div class="model-info">
                              <span class="model-name">{{ getModelDisplayName(model.id) }}</span>
                              <span class="model-id">{{ model.id }}</span>
                            </div>
                            <div 
                              v-if="currentProvider === provider.name && currentModel === model.id" 
                              class="selected-icon"
                            >✓</div>
                          </div>
                        </div>
                      </transition>
                    </div>
                  </div>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- 中间输入区域 -->
          <input
            v-model="store.userInput"
            type="text"
            :placeholder="'Clarity 今天能为您做些什么？'"
            class="main-input"
            @keydown="handleKeyDown"
            ref="textareaRef"
          />
          
                           <!-- 右侧操作按钮 -->
                 <div class="input-actions">
                   <div class="token-counter">{{ store.totalUsage.total_tokens }}/25000</div>
                   
                   <!-- 联网搜索开关 -->
                   <button 
                     v-if="isWebSearchSupported"
                     @click="webSearchEnabled = !webSearchEnabled"
                     :class="['action-button', 'web-search-button', { active: webSearchEnabled }]"
                     :title="webSearchEnabled ? '关闭联网搜索' : '开启联网搜索'"
                   >
                     🌐
                   </button>
                   
                   <button class="action-button" @click="triggerFileInput" title="添加附件">
                     📎
                   </button>
                   <button
                     @click="handleSendMessage"
                     :disabled="!store.userInput.trim() || !currentProvider || isSending"
                     class="send-button"
                     :class="{ 'has-content': store.userInput.trim() }"
                     title="发送消息"
                   >
                     <svg class="send-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                       <path d="M2.01 21L23 12 2.01 3 2 10l15 2L2 14z" />
                     </svg>
                   </button>
                 </div>
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
import { ArrowDown } from '@element-plus/icons-vue';
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

// 获取模型显示名称
const getModelDisplayName = (modelId?: string) => {
  const modelName = modelId || currentModel.value;
  if (!modelName) return 'GPT-4o';
  
  // 简化模型名称显示
  if (modelName.includes('gpt-4')) return 'GPT-4o';
  if (modelName.includes('gpt-3.5')) return 'GPT-3.5';
  if (modelName.includes('claude')) return 'Claude';
  if (modelName.includes('gemini')) return 'Gemini';
  if (modelName.includes('moonshot')) return 'Moonshot';
  if (modelName.includes('kimi')) return 'Kimi';
  
  return modelName.slice(0, 10) + (modelName.length > 10 ? '...' : '');
};

// 获取提供商图标
const getProviderIcon = (providerName: string) => {
  const name = providerName.toLowerCase();
  const iconMap: Record<string, string> = {
    'openai': '🤖',
    'anthropic': '🎭',
    'claude': '🎭',
    'google': '🌟',
    'gemini': '💎',
    'moonshot': '🌙',
    'kimi': '🚀',
    'zhipu': '🧠',
    'glm': '🧠',
    'spark': '⚡',
    'xunfei': '⚡',
    'deepseek': '🔍',
    'siliconflow': '🔧',
    'openrouter': '🌐',
    '302ai': '🤝',
    'minimax': '📝',
    'doubao': '🎯',
    'qwen': '📚',
    'baichuan': '🏔️',
    'chatglm': '💬'
  };
  
  // 尝试匹配提供商名称
  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.includes(key)) {
      return icon;
    }
  }
  
  return '🤖'; // 默认图标
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
  if (event.key === 'Enter') {
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

// 监听模型数据变化，自动选择第一个模型并缓存
watch(() => currentProviderModels.value.data, (newModels) => {
  if (newModels && newModels.length > 0) {
    // 缓存模型数据
    if (currentProvider.value) {
      cacheProviderModels(currentProvider.value, newModels);
    }
    
    // 保存到当前标签页
    if (store.currentTab) {
      store.currentTab.models = newModels;
      
      // 如果没有选择模型，自动选择第一个
      if (!store.currentTab.model) {
        store.currentTab.model = newModels[0].id;
      }
      store.saveTabsToStorage?.();
    }
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

// 二级菜单状态管理
const expandedProvider = ref<string>('');

// 直接选择提供商
const selectProvider = async (providerName: string) => {
  currentProvider.value = providerName;
  await handleProviderChange();
  
  // 保存到store
  if (store.currentTab) {
    store.currentTab.provider = providerName;
    // 清空模型选择，让用户重新选择
    store.currentTab.model = '';
    currentModel.value = '';
    store.saveTabsToStorage?.();
  }
  
  // 展开该提供商的模型列表
  expandedProvider.value = providerName;
};

// 切换提供商展开状态（仅展开/收起，不切换提供商）
const toggleProvider = (providerName: string) => {
  if (expandedProvider.value === providerName) {
    expandedProvider.value = '';
  } else {
    expandedProvider.value = providerName;
  }
};

// 选择模型
const selectModel = (providerName: string, modelId: string) => {
  currentProvider.value = providerName;
  currentModel.value = modelId;
  expandedProvider.value = '';
  
  // 如果需要，触发提供商变化
  if (store.currentTab) {
    store.currentTab.provider = providerName;
    store.currentTab.model = modelId;
    store.saveTabsToStorage?.();
  }
};

// 模型缓存
const modelCache = ref<Record<string, { id: string; name?: string }[]>>({});

// 获取特定提供商的模型列表
const getProviderModels = (providerName: string) => {
  if (providerName === currentProvider.value) {
    return currentProviderModels.value.data || [];
  }
  
  // 从缓存中获取
  return modelCache.value[providerName] || [];
};

// 缓存模型数据
const cacheProviderModels = (providerName: string, models: { id: string; name?: string }[]) => {
  modelCache.value[providerName] = models;
};

// 获取提供商的模型数量
const getProviderModelCount = (providerName: string) => {
  const models = getProviderModels(providerName);
  return models.length;
};

// 处理模型/提供商选择（保留兼容性）
const handleModelSelect = (command: string) => {
  const [type, value] = command.split(':');
  
  if (type === 'provider') {
    currentProvider.value = value;
    handleProviderChange();
  } else if (type === 'model') {
    currentModel.value = value;
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
  max-width: 800px;
  margin: 0 auto;
  background: transparent !important;
  border: none !important;
}

.input-wrapper {
  position: relative;
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
}

.input-content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: transparent !important;
  border: none !important;
}

/* 集成输入框样式 */
.integrated-input-box {
  display: flex;
  align-items: center;
  background: var(--bg-container);
  border: none;
  border-radius: 30px;
  padding: 6px 8px 6px 6px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  gap: 8px;
  min-height: 48px;
  position: relative;
  overflow: hidden;
}

/* 暗色主题下的阴影调整 */
[data-theme="dark"] .integrated-input-box {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.integrated-input-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(0, 188, 212, 0.02), rgba(0, 188, 212, 0.01));
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.integrated-input-box:focus-within {
  box-shadow: 0 8px 32px rgba(0, 188, 212, 0.15);
  transform: translateY(-1px);
}

/* 暗色主题下的聚焦阴影 */
[data-theme="dark"] .integrated-input-box:focus-within {
  box-shadow: 0 8px 32px rgba(0, 188, 212, 0.25);
}

.integrated-input-box:focus-within::before {
  opacity: 1;
}

/* 模型选择器下拉框 */
.model-selector-dropdown {
  flex-shrink: 0;
}

.model-dropdown {
  cursor: pointer;
}

.model-selector-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
  min-width: 100px;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 1;
}

/* 暗色主题下的按钮阴影 */
[data-theme="dark"] .model-selector-button {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.model-selector-button:hover {
  background: var(--bg-hover);
  border-color: var(--brand-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 188, 212, 0.1);
}

/* 暗色主题下的悬停阴影 */
[data-theme="dark"] .model-selector-button:hover {
  box-shadow: 0 4px 12px rgba(0, 188, 212, 0.2);
}

.model-icon {
  font-size: 14px;
  color: var(--brand-primary);
  flex-shrink: 0;
}

.model-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
}

.dropdown-icon {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* 自定义下拉菜单样式 */
.custom-dropdown-menu {
  border: none !important;
  border-radius: 16px !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
  padding: 0 !important;
  min-width: 340px !important;
  max-height: 450px;
  overflow-y: auto;
  background: var(--bg-container) !important;
  backdrop-filter: blur(10px);
}

/* 暗色主题下的下拉菜单阴影 */
[data-theme="dark"] .custom-dropdown-menu {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4) !important;
}

/* 下拉菜单头部 */
.dropdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-surface);
}

.header-icon {
  font-size: 18px;
}

.header-text {
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
  letter-spacing: 0.3px;
}

/* 提供商菜单容器 */
.provider-menu {
  padding: 8px;
}

/* 提供商菜单项 */
.provider-menu-item {
  margin-bottom: 4px;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.provider-menu-item:hover {
  border-color: rgba(0, 188, 212, 0.2);
  box-shadow: 0 2px 8px rgba(0, 188, 212, 0.1);
}

.provider-menu-item.active {
  border-color: var(--brand-primary);
  box-shadow: 0 4px 12px rgba(0, 188, 212, 0.2);
}

/* 提供商头部 */
.provider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  transition: all 0.3s ease;
  background: var(--bg-surface);
  position: relative;
}

.provider-header:hover {
  background: var(--bg-hover);
}

.provider-menu-item.active .provider-header {
  background: linear-gradient(135deg, rgba(0, 188, 212, 0.08), rgba(0, 188, 212, 0.04));
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.provider-info-clickable {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.provider-info-clickable:hover {
  background: rgba(0, 188, 212, 0.05);
}

.provider-icon {
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 188, 212, 0.1);
  border-radius: 8px;
  flex-shrink: 0;
}

.provider-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  flex: 1;
}

.provider-badge {
  background: var(--brand-primary);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 8px;
  min-width: 20px;
  text-align: center;
}

.provider-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-indicator {
  background: linear-gradient(135deg, var(--brand-primary), #0db7d1);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 10px;
  letter-spacing: 0.3px;
}

.expand-icon {
  color: var(--text-tertiary);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.expand-icon:hover {
  background: rgba(0, 188, 212, 0.1);
  color: var(--brand-primary);
}

.expand-icon.rotated {
  transform: rotate(180deg);
  color: var(--brand-primary);
}

/* 模型子菜单 */
.model-submenu {
  background: var(--bg-surface);
  border-top: 1px solid var(--border-light);
  padding: 8px 12px 12px;
}

.model-submenu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 2px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.model-submenu-item:hover {
  background: var(--bg-container);
  border-color: var(--border-base);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* 暗色主题下的悬停阴影 */
[data-theme="dark"] .model-submenu-item:hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.model-submenu-item.active {
  background: linear-gradient(135deg, var(--brand-primary), #0db7d1);
  color: white;
  border-color: var(--brand-primary);
  box-shadow: 0 2px 8px rgba(0, 188, 212, 0.3);
}

.model-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-name {
  font-weight: 600;
  font-size: 13px;
  color: inherit;
}

.model-id {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Monaco', monospace;
}

.model-submenu-item.active .model-id {
  color: rgba(255, 255, 255, 0.8);
}

.selected-icon {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 12px;
  font-weight: bold;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 展开/收起动画 */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  max-height: 300px;
  opacity: 1;
  transform: translateY(0);
}

/* 附件预览样式 */
.attachments-floating {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 70px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px;
  background: var(--bg-container);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

/* 暗色主题下的附件浮层阴影 */
[data-theme="dark"] .attachments-floating {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.attachment-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.attachment-chip:hover {
  background: var(--bg-hover);
}

.attachment-chip .name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}

.attachment-chip .remove {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-tertiary);
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.attachment-chip .remove:hover {
  background: #ef4444;
  color: white;
}

.image-tile {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  cursor: pointer;
}

.image-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tile-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.tile-remove:hover {
  background: rgba(0, 0, 0, 0.8);
}

/* 主输入区域 */
.main-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-primary);
  padding: 8px 12px;
  min-height: 20px;
}

.main-input::placeholder {
  color: var(--text-placeholder);
  font-size: 15px;
}

/* 右侧操作区域 */
.input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.token-counter {
  font-size: 10px;
  color: var(--text-secondary);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
  font-weight: 600;
  padding: 4px 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 1;
}

/* 暗色主题下的token计数器阴影 */
[data-theme="dark"] .token-counter {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.action-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 12px;
  transition: all 0.3s ease;
  font-size: 16px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  position: relative;
  z-index: 1;
}

.action-button:hover {
  background: var(--bg-hover);
  color: var(--brand-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 联网搜索按钮特殊样式 */
.web-search-button.active {
  background: linear-gradient(135deg, var(--brand-primary), #0db7d1);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 188, 212, 0.3);
}

.web-search-button.active:hover {
  background: linear-gradient(135deg, #0097a7, #00acc1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 188, 212, 0.4);
}

/* 暗色主题下的按钮悬停阴影 */
[data-theme="dark"] .action-button:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.send-button {
  background: linear-gradient(135deg, var(--brand-primary), #0db7d1);
  color: white;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 16px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
  position: relative;
  z-index: 1;
}

.send-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
  border-radius: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.send-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 188, 212, 0.4);
}

.send-button:hover:not(:disabled)::before {
  opacity: 1;
}

.send-button:disabled {
  background: var(--bg-hover);
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 暗色主题下的禁用按钮阴影 */
[data-theme="dark"] .send-button:disabled {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.send-button:disabled::before {
  display: none;
}

.send-icon {
  display: block;
  width: 16px;
  height: 16px;
}

/* 底部信息栏 */
.bottom-info {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 8px;
}

.token-count {
  font-size: 12px;
  color: #9ca3af;
  font-family: monospace;
  font-weight: 500;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-input-container {
    padding: 0 16px;
  }
  
  .integrated-input-box {
    padding: 4px 6px 4px 4px;
    gap: 6px;
    min-height: 44px;
  }
  
  .model-selector-button {
    padding: 6px 8px;
    min-width: 80px;
    border-radius: 16px;
  }
  
  .model-name {
    font-size: 11px;
    max-width: 50px;
  }
  
  .main-input {
    font-size: 14px;
    padding: 6px 8px;
  }
  
  .main-input::placeholder {
    font-size: 14px;
  }
  
  .token-counter {
    font-size: 9px;
    padding: 3px 6px;
    border-radius: 8px;
  }
  
  .action-button,
  .send-button {
    width: 32px;
    height: 32px;
    padding: 6px;
  }
  
  .web-search-button.active {
    box-shadow: 0 2px 6px rgba(0, 188, 212, 0.25);
  }
  
  .send-button {
    border-radius: 12px;
  }
  
  /* 下拉菜单在平板上的适配 */
  .custom-dropdown-menu {
    min-width: 300px !important;
    max-height: 380px;
  }
  
  .dropdown-header {
    padding: 12px 16px 8px;
  }
  
  .header-text {
    font-size: 13px;
  }
  
  .provider-header {
    padding: 10px 12px;
  }
  
  .provider-name {
    font-size: 13px;
  }
  
  .provider-badge {
    font-size: 9px;
    padding: 1px 4px;
  }
  
  .current-indicator {
    font-size: 9px;
    padding: 2px 6px;
  }
  
  .model-submenu {
    padding: 6px 8px 8px;
  }
  
  .model-submenu-item {
    padding: 6px 8px;
  }
  
  .model-name {
    font-size: 12px;
  }
  
  .model-id {
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .integrated-input-box {
    border-radius: 24px;
    padding: 3px 4px 3px 3px;
    gap: 4px;
    min-height: 40px;
  }
  
  .model-selector-button {
    padding: 4px 6px;
    min-width: 60px;
    border-radius: 12px;
  }
  
  .model-name {
    font-size: 10px;
    max-width: 35px;
  }
  
  .model-icon {
    font-size: 12px;
  }
  
  .dropdown-icon {
    font-size: 10px;
  }
  
  .main-input {
    font-size: 13px;
    padding: 4px 6px;
  }
  
  .main-input::placeholder {
    font-size: 13px;
  }
  
  .action-button,
  .send-button {
    width: 28px;
    height: 28px;
    padding: 4px;
    font-size: 14px;
  }
  
  .web-search-button.active {
    box-shadow: 0 2px 4px rgba(0, 188, 212, 0.2);
  }
  
  .send-button {
    border-radius: 10px;
  }
  
  .token-counter {
    display: none; /* 在小屏幕上隐藏 token 计数器 */
  }
  
  /* 移动端下拉菜单优化 */
  .custom-dropdown-menu {
    min-width: 280px !important;
    max-height: 320px;
    border-radius: 12px !important;
  }
  
  .dropdown-header {
    padding: 10px 12px 6px;
  }
  
  .header-icon {
    font-size: 16px;
  }
  
  .header-text {
    font-size: 12px;
  }
  
  .provider-menu {
    padding: 6px;
  }
  
  .provider-menu-item {
    margin-bottom: 3px;
    border-radius: 8px;
  }
  
  .provider-header {
    padding: 8px 10px;
  }
  
  .provider-icon {
    font-size: 16px;
    width: 20px;
    height: 20px;
  }
  
  .provider-name {
    font-size: 12px;
  }
  
  .provider-badge {
    font-size: 8px;
    padding: 1px 3px;
    min-width: 16px;
  }
  
  .current-indicator {
    font-size: 8px;
    padding: 2px 4px;
  }
  
  .expand-icon svg {
    width: 14px;
    height: 14px;
  }
  
  .model-submenu {
    padding: 4px 6px 6px;
  }
  
  .model-submenu-item {
    padding: 6px 8px;
    border-radius: 6px;
  }
  
  .model-name {
    font-size: 11px;
  }
  
  .model-id {
    font-size: 9px;
  }
  
  .selected-icon {
    width: 16px;
    height: 16px;
    font-size: 10px;
  }
}
</style>