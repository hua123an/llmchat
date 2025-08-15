.row-actions { display: flex; gap: 8px; justify-content: flex-end; }
<template>
  <el-dialog
    v-model="store.isSettingsOpen"
    :title="t('settings.title')"
    width="80%"
    max-width="900px"
    max-height="80vh"
    :before-close="handleClose"
    class="custom-settings-dialog force-update-v2"
    append-to-body
    :modal="true"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
  >
    <div class="settings-content">
      <el-tabs v-model="activeTab" class="settings-tabs">
        
        <!-- 通用设置 -->
        <el-tab-pane :label="t('settings.tabs.general')" name="general">
          <div class="setting-section">
            <h3 class="section-title">{{ t('settings.general.appearance') }}</h3>
            <div class="setting-item">
              <label class="setting-label">{{ t('settings.general.theme') }}</label>
              <el-select v-model="currentTheme" @change="handleThemeChange" class="setting-control" popper-class="wide-select-popper" :fit-input-width="false">
                <el-option
                  v-for="option in themeOptions"
                  :key="option.value"
                  :label="t(option.labelKey)"
                  :value="option.value"
                ></el-option>
              </el-select>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">{{ t('settings.general.language') }}</label>
              <el-select v-model="currentLanguage" @change="handleLanguageChange" class="setting-control" popper-class="wide-select-popper" :fit-input-width="false">
                <el-option 
                  v-for="lang in supportedLanguages" 
                  :key="lang.code" 
                  :label="lang.name" 
                  :value="lang.code"
                ></el-option>
              </el-select>
            </div>
          </div>

          <div class="setting-section">
            <h3 class="section-title">{{ t('settings.general.behavior') }}</h3>
            <div class="setting-item">
              <label class="setting-label">{{ t('settings.general.sendShortcut') }}</label>
              <el-select v-model="sendShortcut" class="setting-control" popper-class="wide-select-popper" :fit-input-width="false">
                <el-option :label="t('shortcut.enter')" value="enter"></el-option>
                <el-option :label="t('shortcut.ctrlEnter')" value="ctrl-enter"></el-option>
              </el-select>
            </div>
            
            <div class="setting-item">
              <label class="setting-label">{{ t('settings.general.autoSave') }}</label>
              <el-switch v-model="autoSave"></el-switch>
            </div>
          </div>
        </el-tab-pane>


        <!-- AI模型配置 -->
        <el-tab-pane :label="t('settings.tabs.models')" name="models">
          <div class="setting-section">
            <h3 class="section-title">{{ t('settings.models.title', 'AI 提供商配置') }}</h3>
            <div class="providers-editor">
              <div class="providers-toolbar">
                <div class="hint">{{ t('settings.providers.description', '配置您的AI服务提供商和API密钥') }}</div>
                <div class="right">
                  <el-button type="primary" size="small" @click="addProvider">
                    {{ t('settings.providers.add', '添加提供商') }}
                  </el-button>
                </div>
              </div>
              
              <div class="providers-table">
                <div class="thead sticky">
                  <div class="th name">{{ t('settings.providers.name', '名称') }}</div>
                  <div class="th baseurl">Base URL</div>
                  <div class="th key">API Key</div>
                  <div class="th actions">{{ t('settings.providers.actions', '操作') }}</div>
                </div>
                <div class="tbody">
                  <div class="tr" v-for="(p, idx) in providerList" :key="idx">
                    <div class="td name">
                      <el-input v-model="p.name" size="small" @input="saveProvidersDebounced()" placeholder="Ollama"/>
                    </div>
                    <div class="td baseurl">
                      <el-input v-model="p.baseUrl" size="small" @input="saveProvidersDebounced()" placeholder="http://localhost:11434"/>
                    </div>
                    <div class="td key">
                      <div class="key-inline">
                        <el-input 
                          v-model="p.__keyInput" 
                          size="small" 
                          :type="p.__showKey ? 'text' : 'password'" 
                          :placeholder="p.__hasKey && !p.__keyInput ? t('settings.providers.keyExists', 'API密钥已设置') : t('settings.providers.keyPlaceholder', '输入API密钥')"
                          @focus="handleKeyInputFocus(p)"
                        />
                        <div class="key-actions">
                          <el-button v-if="p.__hasKey" size="small" @click="toggleKeyVisibility(p)">{{ p.__showKey ? t('common.hide', '隐藏') : t('common.show', '显示') }}</el-button>
                          <el-button type="primary" size="small" @click="saveKey(p)" :disabled="!p.__keyInput || p.__keyInput.includes('...')">{{ t('common.save', '保存') }}</el-button>
                          <el-button v-if="p.__hasKey" type="danger" size="small" @click="removeKey(p)">{{ t('common.delete', '删除') }}</el-button>
                        </div>
                      </div>
                    </div>
                    <div class="td actions">
                      <div class="row-actions">
                        <el-button size="small" @click="testProvider(p)">{{ t('settings.providers.test', '测试') }}</el-button>
                        <el-button type="danger" size="small" @click="() => { removeProvider(idx); saveProvidersDebounced(); }">{{ t('common.delete', '删除') }}</el-button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 快捷键 -->
        <el-tab-pane :label="t('settings.tabs.shortcuts')" name="shortcuts">
          <div class="setting-section">
            <h3 class="section-title">{{ t('settings.shortcuts.title') }}</h3>
            <div class="shortcuts-list">
              <div class="shortcut-item" v-for="shortcut in shortcuts" :key="shortcut.id">
                <span class="shortcut-name">{{ shortcut.name }}</span>
                <span class="shortcut-key">{{ shortcut.key }}</span>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 关于 -->
        <el-tab-pane :label="t('settings.tabs.about')" name="about">
          <div class="setting-section">
            <div class="about-info">
              <div class="app-icon">💬</div>
              <h2 class="app-name">ChatLLM</h2>
              <p class="app-version">{{ t('settings.about.version') }} {{ versionText }}</p>
              <div style="margin-top:12px">
                <el-alert type="info" :closable="false" show-icon>
                  <template #title>
                    <b>2.0.1</b> 更新内容
                  </template>
                  <div>
                    <ul style="margin: 8px 0 0 18px; padding:0; line-height:1.6;">
                      <li>统一下拉组件，Provider/Model/Workspace 全量替换</li>
                      <li>文生图支持进度条与取消按钮</li>
                      <li>补齐 i18n 与 aria-label，提高无障碍</li>
                      <li>修复重复 i18n 键与类型不匹配问题</li>
                    </ul>
                  </div>
                </el-alert>
              </div>
              <p class="app-description">
                {{ t('settings.about.description') }}
              </p>
              
              <div class="about-links">
                <el-button type="primary" @click="openGitHub">
                  <span class="link-icon">🐙</span>
                  GitHub
                </el-button>
                <el-button @click="openDocs">
                  <span class="link-icon">📚</span>
                  {{ t('settings.about.links.docs') }}
                </el-button>
                <el-button @click="checkUpdates">
                  <span class="link-icon">🔄</span>
                  {{ t('settings.about.links.checkUpdates') }}
                </el-button>
                <el-switch v-model="autoCheckUpdate" active-text="启动自检" inactive-text="手动检查" @change="applyUpdateConfig" />
                <el-switch v-model="autoDownloadUpdate" active-text="自动下载" inactive-text="手动下载" @change="applyUpdateConfig" />
                <el-select v-model="updateChannel" class="setting-control" style="width: 120px" @change="applyUpdateConfig" popper-class="wide-select-popper" :fit-input-width="false">
                  <el-option label="stable" value="latest" />
                  <el-option label="beta" value="beta" />
                </el-select>
                <el-input v-model="updateBaseUrl" placeholder="更新源URL (用于说明/强制策略)" style="width: 280px" @change="saveSettings" />
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 搜索设置 -->
        <el-tab-pane label="搜索" name="search">
          <div class="setting-section">
            <h3 class="section-title">联网搜索</h3>
            <div class="setting-item">
              <label class="setting-label">上下文规模</label>
              <el-select v-model="searchContextSize" class="setting-control" @change="saveSettings" popper-class="wide-select-popper" :fit-input-width="false">
                <el-option label="低 (low)" value="low" />
                <el-option label="中 (medium)" value="medium" />
                <el-option label="高 (high)" value="high" />
              </el-select>
            </div>
            <div class="setting-item">
              <label class="setting-label">最大结果数</label>
              <el-input-number v-model="searchMaxResults" :min="3" :max="20" @change="saveSettings" />
            </div>
            <div class="setting-item">
              <label class="setting-label">请求超时 (秒)</label>
              <el-input-number v-model="searchTimeoutSec" :min="3" :max="60" @change="saveSettings" />
            </div>
            <div class="setting-item">
              <label class="setting-label">失败重试次数</label>
              <el-input-number v-model="searchRetry" :min="0" :max="5" @change="saveSettings" />
            </div>
            <div class="setting-item">
              <label class="setting-label">并发度</label>
              <el-input-number v-model="searchConcurrency" :min="1" :max="5" @change="saveSettings" />
            </div>
            <div class="setting-item">
              <label class="setting-label">引擎权重 (google/bing/baidu/ddg)</label>
              <div style="display:flex; gap:8px; align-items:center">
                <el-input-number v-model="wGoogle" :min="0" :max="10" @change="saveSettings" /> G
                <el-input-number v-model="wBing" :min="0" :max="10" @change="saveSettings" /> B
                <el-input-number v-model="wBaidu" :min="0" :max="10" @change="saveSettings" /> Ba
                <el-input-number v-model="wDuck" :min="0" :max="10" @change="saveSettings" /> D
              </div>
            </div>
          </div>
          <div class="setting-section">
            <h3 class="section-title">知识库检索</h3>
            <div class="setting-item">
              <label class="setting-label">启用发送时知识库检索</label>
              <el-switch v-model="enableKBRetrieval" @change="saveSettings" />
            </div>
          </div>
        </el-tab-pane>

        

        <!-- 工具与集成 -->
        <el-tab-pane :label="t('settings.tabs.tools')" name="tools">
          <div class="setting-section">
            <h3 class="section-title">{{ t('tools.ocr') }}</h3>
            <div class="setting-item">
              <label class="setting-label">{{ t('tools.enableOCR') }}</label>
              <el-switch v-model="enableOCR"></el-switch>
            </div>
            <div class="setting-item">
              <label class="setting-label">{{ t('tools.ocrLang') }}</label>
              <el-select v-model="ocrLang" class="setting-control" popper-class="wide-select-popper" :fit-input-width="false">
                <el-option label="English (eng)" value="eng"></el-option>
                <el-option label="中文简体 (chi_sim)" value="chi_sim"></el-option>
              </el-select>
            </div>
          </div>
          <div class="setting-section">
            <h3 class="section-title">{{ t('tools.desktop') }}</h3>
            <div class="setting-item">
              <label class="setting-label">{{ t('tools.enableTray') }}</label>
              <el-switch v-model="enableTray"></el-switch>
            </div>
            <div class="setting-item">
              <label class="setting-label">{{ t('tools.enableGlobalScreenshot') }}</label>
              <el-switch v-model="enableGlobalScreenshot"></el-switch>
            </div>
          </div>
        </el-tab-pane>

        <!-- 语音识别 -->
        <el-tab-pane label="语音识别" name="voice">
          <div class="setting-section">
            <h3 class="section-title">语音听写（STT）</h3>
            <div class="setting-item">
              <label class="setting-label">提供商</label>
              <el-select v-model="sttProvider" class="setting-control" popper-class="wide-select-popper" :fit-input-width="false" @change="saveVoiceSettings">
                <el-option label="浏览器内置（仅HTTPS/Chrome）" value="browser" />
                <el-option label="讯飞听写（WebSocket）" value="xfyun" />
              </el-select>
            </div>
            <div v-if="sttProvider==='xfyun'" class="setting-item">
              <label class="setting-label">AppID</label>
              <el-input v-model="xfyunAppId" class="setting-control" @change="saveVoiceSettings" placeholder="从讯飞控制台获取" />
            </div>
            <div v-if="sttProvider==='xfyun'" class="setting-item">
              <label class="setting-label">API Key</label>
              <el-input v-model="xfyunApiKey" class="setting-control" @change="saveVoiceSettings" placeholder="从讯飞控制台获取" />
            </div>
            <div v-if="sttProvider==='xfyun'" class="setting-item">
              <label class="setting-label">API Secret</label>
              <el-input v-model="xfyunApiSecret" class="setting-control" @change="saveVoiceSettings" placeholder="从讯飞控制台获取" />
            </div>
            <div class="setting-item">
              <label class="setting-label">语言</label>
              <el-select v-model="speechRecognitionLang" class="setting-control" @change="saveVoiceSettings" popper-class="wide-select-popper" :fit-input-width="false">
                <el-option label="中文 (zh-CN)" value="zh-CN" />
                <el-option label="英文 (en-US)" value="en-US" />
              </el-select>
            </div>
            <div class="setting-item">
              <label class="setting-label">连续识别</label>
              <el-switch v-model="speechRecognitionContinuous" @change="saveVoiceSettings" />
            </div>
            <div class="setting-item">
              <label class="setting-label">中间结果</label>
              <el-switch v-model="speechRecognitionInterim" @change="saveVoiceSettings" />
            </div>
          </div>
        </el-tab-pane>

      </el-tabs>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="handleSave">{{ t('common.save') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChatStore } from '../store/chat';
import { ElMessage } from 'element-plus';
import { themeManager } from '../utils/themeManager';
import { supportedLocales, switchLanguage, getCurrentLanguage } from '../locales';
import { listDocs } from '../services/rag/store';
import { voiceService } from '../services/VoiceService';

// 版本号：从构建注入或从 window 兜底
const appVersion = (import.meta as any).env?.APP_VERSION || (typeof window !== 'undefined' ? (window as any).__APP_VERSION__ : '');
if (!appVersion && typeof window !== 'undefined' && (window as any).electronAPI?.getAppVersion) {
  (window as any).electronAPI.getAppVersion().then((v: string) => {
    try { (document.querySelector('.app-version') as HTMLElement).innerText = `${t('settings.about.version')} ${v || ''}` } catch {}
  }).catch(() => {});
}

const store = useChatStore();
const activeTab = ref('general');
const { t } = useI18n();

// 设置项
const currentTheme = computed(() => themeManager.getCurrentTheme());
const themeOptions = computed(() => themeManager.getThemeOptions());
const currentLanguage = ref('zh-CN');

// 支持的语言列表
const supportedLanguages = computed(() => 
  supportedLocales.map(locale => ({
    code: locale.code,
    name: locale.nativeName
  }))
);
const sendShortcut = ref('enter');
const autoSave = ref(true);
const defaultProvider = ref('');
const defaultSystemPrompt = ref(t('settings.ai.defaultSystemPrompt'));
const dataEncryption = ref(true);
const autoCleanup = ref('never');
const docs = ref<Array<{ id: string; name: string; size: number }>>([]);
const budgetToken = ref<number>(0);
const warnPercent = ref<number>(80);
const enableOCR = ref<boolean>(false);
const enableTray = ref<boolean>(true);
const enableGlobalScreenshot = ref<boolean>(true);
const ocrLang = ref<string>('eng');
const autoCheckUpdate = ref<boolean>(true);
const autoDownloadUpdate = ref<boolean>(false);
const updateChannel = ref<string>('latest');
const updateBaseUrl = ref<string>('');
const searchContextSize = ref<'low'|'medium'|'high'>('medium');
const searchMaxResults = ref<number>(10);
const searchTimeoutSec = ref<number>(10);
const searchRetry = ref<number>(1);
const searchConcurrency = ref<number>(2);
const wGoogle = ref<number>(4);
const wBing = ref<number>(3);
const wBaidu = ref<number>(2);
const wDuck = ref<number>(1);
const enableKBRetrieval = ref<boolean>(false);

// 语音设置
const sttProvider = ref<'browser'|'xfyun'>('browser');
const xfyunAppId = ref('');
const xfyunApiKey = ref('');
const xfyunApiSecret = ref('');
const speechRecognitionLang = ref<'zh-CN'|'en-US'>('zh-CN');
const speechRecognitionContinuous = ref(true);
const speechRecognitionInterim = ref(true);

// Provider 管理逻辑
const providerList = ref<Array<{ 
  name: string; 
  baseUrl: string; 
  __keyInput?: string; 
  __hasKey?: boolean; 
  __showKey?: boolean;
}>>([]);

let saveProvidersTimeout: any = null;

// 添加提供商
const addProvider = () => {
  providerList.value.push({
    name: '',
    baseUrl: '',
    __keyInput: '',
    __hasKey: false,
    __showKey: false
  });
};

// 删除提供商
const removeProvider = (index: number) => {
  providerList.value.splice(index, 1);
};

// 防抖保存提供商
const saveProvidersDebounced = () => {
  if (saveProvidersTimeout) clearTimeout(saveProvidersTimeout);
  saveProvidersTimeout = setTimeout(() => {
    saveProviders();
  }, 500);
};

// 保存提供商配置
const saveProviders = async () => {
  try {
    // 过滤掉空的提供商
    const validProviders = providerList.value
      .filter(p => p.name.trim() && p.baseUrl.trim())
      .map(p => ({ name: p.name.trim(), baseUrl: p.baseUrl.trim() }));
    
    const result = await (window as any).electronAPI?.saveProviders?.(validProviders);
    if (result?.ok) {
      ElMessage.success(t('settings.providers.saveSuccess', '提供商配置已保存'));
    } else {
      throw new Error(result?.message || 'Save failed');
    }
  } catch (error: any) {
    console.error('Save providers failed:', error);
    ElMessage.error(t('settings.providers.saveError', '保存失败: ') + error.message);
  }
};

// 保存语音设置
const saveVoiceSettings = () => {
  voiceService.saveSettings({
    sttProvider: sttProvider.value,
    xfyunAppId: xfyunAppId.value,
    xfyunApiKey: xfyunApiKey.value,
    xfyunApiSecret: xfyunApiSecret.value,
    speechRecognitionLang: speechRecognitionLang.value,
    speechRecognitionContinuous: speechRecognitionContinuous.value,
    speechRecognitionInterim: speechRecognitionInterim.value,
  });
};

// 处理API密钥输入焦点
const handleKeyInputFocus = async (provider: any) => {
  if (!provider.__keyInput && provider.__hasKey) {
    // 显示预览
    try {
      const result = await (window as any).electronAPI?.getProviderKeyPreview?.(provider.name);
      if (result?.preview) {
        provider.__keyInput = result.preview;
      }
    } catch (error) {
      console.warn('Failed to get key preview:', error);
    }
  }
};

// 切换密钥可见性
const toggleKeyVisibility = async (provider: any) => {
  if (!provider.__showKey && provider.__hasKey) {
    try {
      const result = await (window as any).electronAPI?.getProviderKeyPreview?.(provider.name);
      if (result?.preview) {
        provider.__keyInput = result.preview;
      }
    } catch (error) {
      console.warn('Failed to get key preview:', error);
    }
  }
  provider.__showKey = !provider.__showKey;
};

// 保存API密钥
const saveKey = async (provider: any) => {
  if (!provider.__keyInput || provider.__keyInput.includes('...')) return;
  
  try {
    const result = await (window as any).electronAPI?.setProviderKey?.(provider.name, provider.__keyInput);
    if (result?.ok) {
      provider.__hasKey = true;
      ElMessage.success(t('settings.providers.keySuccess', 'API密钥已保存'));
      // 更新为预览模式
      const previewResult = await (window as any).electronAPI?.getProviderKeyPreview?.(provider.name);
      if (previewResult?.preview) {
        provider.__keyInput = previewResult.preview;
      }
    } else {
      throw new Error(result?.message || 'Save key failed');
    }
  } catch (error: any) {
    console.error('Save key failed:', error);
    ElMessage.error(t('settings.providers.keyError', '保存密钥失败: ') + error.message);
  }
};

// 删除API密钥
const removeKey = async (provider: any) => {
  try {
    const result = await (window as any).electronAPI?.removeProviderKey?.(provider.name);
    if (result?.ok) {
      provider.__hasKey = false;
      provider.__keyInput = '';
      provider.__showKey = false;
      ElMessage.success(t('settings.providers.keyRemoved', 'API密钥已删除'));
    } else {
      throw new Error(result?.message || 'Remove key failed');
    }
  } catch (error: any) {
    console.error('Remove key failed:', error);
    ElMessage.error(t('settings.providers.removeKeyError', '删除密钥失败: ') + error.message);
  }
};

// 测试提供商连接
const testProvider = async (provider: any) => {
  if (!provider.name.trim()) {
    ElMessage.warning(t('settings.providers.nameRequired', '请输入提供商名称'));
    return;
  }
  
  try {
    const result = await (window as any).electronAPI?.testProvider?.(provider.name);
    if (result?.ok) {
      ElMessage.success(t('settings.providers.testSuccess', '连接测试成功'));
    } else {
      throw new Error(result?.message || 'Test failed');
    }
  } catch (error: any) {
    console.error('Test provider failed:', error);
    ElMessage.error(t('settings.providers.testError', '连接测试失败: ') + error.message);
  }
};

// 加载提供商配置
const loadProviders = async () => {
  try {
    // 加载提供商列表
    const providers = await (window as any).electronAPI?.getProviders?.() || [];
    providerList.value = providers.map((p: any) => ({
      name: p.name || '',
      baseUrl: p.baseUrl || '',
      __keyInput: '',
      __hasKey: false,
      __showKey: false
    }));
    
    // 检查每个提供商的密钥状态
    for (const provider of providerList.value) {
      if (provider.name) {
        try {
          const result = await (window as any).electronAPI?.hasProviderKey?.(provider.name);
          provider.__hasKey = result?.hasKey || false;
        } catch (error) {
          console.warn('Failed to check key for', provider.name, error);
        }
      }
    }
  } catch (error) {
    console.error('Load providers failed:', error);
  }
};

// 快捷键列表
const isMac = navigator.platform.includes('Mac');
const mod = isMac ? '⌘' : 'Ctrl+';
const shortcuts = computed(() => [
  { id: 'new-chat', name: t('shortcuts.newChat'), key: `${mod}N` },
  { id: 'save-chat', name: t('shortcuts.saveChat'), key: `${mod}S` },
  { id: 'search', name: t('shortcuts.search'), key: `${mod}F` },
  { id: 'prompt-library', name: t('shortcuts.promptLibrary'), key: `${mod}P` },
  { id: 'send-message', name: t('shortcuts.sendMessage'), key: isMac ? '⌘+Enter' : 'Ctrl+Enter' },
  { id: 'clear-chat', name: t('shortcuts.clearChat'), key: `${mod}Shift+Delete` },
  { id: 'help', name: t('shortcuts.help'), key: 'F1 / Ctrl+Shift+K' },
  { id: 'close-dialog', name: t('shortcuts.closeDialog'), key: 'Escape' },
  // 新增：工作空间切换
  { id: 'switch-space-1', name: t('shortcuts.switchSpace1'), key: `${mod}1` },
  { id: 'switch-space-2', name: t('shortcuts.switchSpace2'), key: `${mod}2` },
  { id: 'switch-space-3', name: t('shortcuts.switchSpace3'), key: `${mod}3` }
]);

// 主题切换
const handleThemeChange = (newTheme: string) => {
  themeManager.setTheme(newTheme as any);
};

// 语言切换
const handleLanguageChange = (newLanguage: 'zh-CN' | 'en-US') => {
  switchLanguage(newLanguage);
  currentLanguage.value = newLanguage;
};

// 关于功能
const openGitHub = () => {
  window.open('https://github.com/chatllm/chatllm', '_blank');
};

const openDocs = () => {
  window.open('https://chatllm.github.io/docs', '_blank');
};

const checkUpdates = async () => {
  try {
    // 本地自动检测（基于 GitHub 最新版本）
    const latest = await (window as any).electronAPI?.checkLatestVersion?.();
    const current = appVersionRef.value || (await (window as any).electronAPI?.getAppVersion?.());
    const curTag = `v${(current || '').trim()}`;
    if (latest?.tag && latest.tag !== curTag) {
      (window as any).ElMessageBox?.confirm?.(
        (latest?.body || '').slice(0, 2000) || `检测到新版本 ${latest.tag}，是否前往下载？`,
        `发现新版本 ${latest.tag}`,
        { type: 'info' }
      )
      .then(() => window.open(latest.html_url || 'https://github.com/hua123an/llmchat/releases/latest', '_blank'))
      .catch(() => {});
    } else {
      ElMessage.success('当前已是最新版本');
    }
    // 仍然支持内置 autoUpdater 检查
    (window as any).electronAPI?.checkForUpdates?.();
  } catch {
    ElMessage.error(t('settings.messages.loadError'));
  }
};

const applyUpdateConfig = async () => {
  try {
    await (window as any).electronAPI?.setAutoUpdateConfig?.({ autoCheck: autoCheckUpdate.value, autoDownload: autoDownloadUpdate.value, channel: updateChannel.value });
  } catch {}
};

// 监听主进程的自动更新事件
try {
  (window as any).electronAPI?.onAutoUpdate?.(async (_e: any, payload: any) => {
    if (!payload || !payload.type) return;
    switch (payload.type) {
      case 'checking':
        (window as any).ElMessage?.info?.('正在检查更新...');
        break;
      case 'available': {
        const info = payload?.info;
        let notes = payload?.meta?.notes || info?.releaseNotes || '';
        if (!notes) {
          try {
            const base = getUpdateBaseUrl();
            if (base) {
              const meta = await (window as any).electronAPI?.fetchRemoteUpdateMeta?.(base);
              if (meta?.notes) notes = meta.notes;
            }
          } catch {}
        }
        const title = `发现新版本 ${info?.version || ''}`.trim();
        const message = notes ? markdownToHtml(notes) : '是否立即下载并更新？';
        if (autoDownloadUpdate.value) {
          (window as any).ElMessage?.info?.('检测到新版本，已开始自动下载...');
          (window as any).electronAPI?.downloadUpdate?.();
        } else {
          (window as any).ElMessageBox?.confirm?.(message, title || '更新可用', { type: 'info', dangerouslyUseHTMLString: true })
            .then(() => (window as any).electronAPI?.downloadUpdate?.())
            .catch(() => {});
        }
        break;
      }
      case 'no-update':
        (window as any).ElMessage?.success?.('当前已是最新版本');
        break;
      case 'progress':
        // 可加入进度条，这里用信息提示
        (window as any).ElMessage?.info?.(`正在下载更新... ${Math.floor(payload.progress?.percent || 0)}%`);
        break;
      case 'downloaded': {
        const info = payload?.info;
        let notes = payload?.meta?.notes || info?.releaseNotes || '';
        if (!notes) {
          try {
            const base = getUpdateBaseUrl();
            if (base) {
              const meta = await (window as any).electronAPI?.fetchRemoteUpdateMeta?.(base);
              if (meta?.notes) notes = meta.notes;
            }
          } catch {}
        }
        const force = payload?.meta?.force === true;
        const title = `更新完成 ${info?.version || ''}`.trim();
        const message = notes ? markdownToHtml(notes) : '更新已下载，是否现在重启安装？';
        const doInstall = () => (window as any).electronAPI?.quitAndInstall?.();
        if (force) {
          (window as any).ElMessageBox?.alert?.(message, title || '更新完成', { type: 'warning', confirmButtonText: '立即重启安装', dangerouslyUseHTMLString: true })
            .then(() => doInstall())
            .catch(() => doInstall());
        } else {
          (window as any).ElMessageBox?.confirm?.(message, title || '更新完成', { type: 'success', dangerouslyUseHTMLString: true })
          .then(() => (window as any).electronAPI?.quitAndInstall?.())
            .catch(() => {});
        }
        break;
      }
      case 'error':
        (window as any).ElMessage?.error?.('更新失败，请稍后重试');
        break;
    }
  });
} catch {}

// 对话框操作
const handleClose = () => {
  store.isSettingsOpen = false;
};

const handleSave = () => {
  // 保存设置到localStorage
  const settings = {
    theme: currentTheme.value,
    language: currentLanguage.value,
    sendShortcut: sendShortcut.value,
    autoSave: autoSave.value,
    defaultProvider: defaultProvider.value,
    defaultSystemPrompt: defaultSystemPrompt.value,
    dataEncryption: dataEncryption.value,
    autoCleanup: autoCleanup.value,
    budgetToken: budgetToken.value,
    warnPercent: warnPercent.value,
    enableOCR: enableOCR.value,
    enableTray: enableTray.value,
    enableGlobalScreenshot: enableGlobalScreenshot.value,
    ocrLang: ocrLang.value,
    searchContextSize: searchContextSize.value,
    searchMaxResults: searchMaxResults.value,
    searchTimeoutSec: searchTimeoutSec.value,
    searchRetry: searchRetry.value,
    searchConcurrency: searchConcurrency.value,
    searchWeights: { google: wGoogle.value, bing: wBing.value, baidu: wBaidu.value, duck: wDuck.value },
    updateBaseUrl: updateBaseUrl.value,
    enableKBRetrieval: enableKBRetrieval.value
  };
  
  localStorage.setItem('appSettings', JSON.stringify(settings));
  ElMessage.success(t('settings.messages.saveSuccess'));
  handleClose();
};

const saveSettings = () => {
  try {
    const raw = localStorage.getItem('appSettings');
    const cfg = raw ? JSON.parse(raw) : {};
    cfg.searchContextSize = searchContextSize.value;
    cfg.searchMaxResults = searchMaxResults.value;
    cfg.updateBaseUrl = updateBaseUrl.value || cfg.updateBaseUrl || '';
    cfg.searchTimeoutSec = searchTimeoutSec.value;
    cfg.searchRetry = searchRetry.value;
    cfg.searchConcurrency = searchConcurrency.value;
    cfg.searchWeights = { google: wGoogle.value, bing: wBing.value, baidu: wBaidu.value, duck: wDuck.value };
    cfg.enableKBRetrieval = enableKBRetrieval.value;
    localStorage.setItem('appSettings', JSON.stringify(cfg));
  } catch {}
};

// 加载设置
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      themeManager.setTheme(settings.theme || 'auto'); // Use themeManager to set theme
      currentLanguage.value = settings.language || 'zh-CN';
      sendShortcut.value = settings.sendShortcut || 'enter';
      autoSave.value = settings.autoSave !== false;
      defaultProvider.value = settings.defaultProvider || '';
      defaultSystemPrompt.value = settings.defaultSystemPrompt || t('settings.ai.defaultSystemPrompt');
      dataEncryption.value = settings.dataEncryption !== false;
      autoCleanup.value = settings.autoCleanup || 'never';
      budgetToken.value = Number(settings.budgetToken || 0);
      warnPercent.value = Number(settings.warnPercent || 80);
      enableOCR.value = !!settings.enableOCR;
      enableTray.value = settings.enableTray !== false;
      enableGlobalScreenshot.value = settings.enableGlobalScreenshot !== false;
      ocrLang.value = settings.ocrLang || 'eng';
      searchContextSize.value = settings.searchContextSize || 'medium';
      searchMaxResults.value = Number(settings.searchMaxResults || 10);
      updateBaseUrl.value = settings.updateBaseUrl || '';
      searchTimeoutSec.value = Number(settings.searchTimeoutSec || 10);
      searchRetry.value = Number(settings.searchRetry || 1);
      searchConcurrency.value = Number(settings.searchConcurrency || 2);
      const sw = settings.searchWeights || {};
      wGoogle.value = Number(sw.google ?? 4);
      wBing.value = Number(sw.bing ?? 3);
      wBaidu.value = Number(sw.baidu ?? 2);
      wDuck.value = Number(sw.duck ?? 1);
      enableKBRetrieval.value = !!settings.enableKBRetrieval;
    }

    // 语音设置独立存储于 voiceSettings
    try {
      const vsRaw = localStorage.getItem('voiceSettings');
      const vs = vsRaw ? JSON.parse(vsRaw) : {};
      sttProvider.value = (vs.sttProvider || 'browser');
      xfyunAppId.value = vs.xfyunAppId || '';
      xfyunApiKey.value = vs.xfyunApiKey || '';
      xfyunApiSecret.value = vs.xfyunApiSecret || '';
      speechRecognitionLang.value = (vs.speechRecognitionLang || 'zh-CN');
      speechRecognitionContinuous.value = (vs.speechRecognitionContinuous ?? true);
      speechRecognitionInterim.value = (vs.speechRecognitionInterim ?? true);
    } catch {}
  } catch (error) {
    console.error(t('settings.messages.loadError'), error);
  }
};

const appVersionEnv = (import.meta as any).env?.APP_VERSION || (typeof window !== 'undefined' ? (window as any).__APP_VERSION__ : '');
const appVersionRef = ref<string>(appVersionEnv || '');
const versionText = computed(() => appVersionRef.value || '');

onMounted(async () => {
  if (!appVersionRef.value && (window as any).electronAPI?.getAppVersion) {
    try { appVersionRef.value = await (window as any).electronAPI.getAppVersion(); } catch {}
  }
  loadSettings();
  // 同步当前语言
  currentLanguage.value = getCurrentLanguage();
  refreshDocs();
  // 加载提供商配置
  loadProviders();
  // 应用一次默认更新配置
  try { applyUpdateConfig(); } catch {}
});

function getUpdateBaseUrl(): string {
  try {
    const raw = localStorage.getItem('appSettings');
    const cfg = raw ? JSON.parse(raw) : {};
    return String(cfg.updateBaseUrl || '').trim();
  } catch { return ''; }
}

// 极简 Markdown 转 HTML（只处理换行与基本强调，避免引入新依赖）
function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  html = html.replace(/^###\s?(.*)$/gm, '<h3>$1</h3>')
             .replace(/^##\s?(.*)$/gm, '<h2>$1</h2>')
             .replace(/^#\s?(.*)$/gm, '<h1>$1</h1>')
             .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
             .replace(/\*(.*?)\*/g, '<i>$1</i>')
             .replace(/`([^`]+)`/g, '<code>$1</code>')
             .replace(/\n/g, '<br/>');
  return html;
}

const refreshDocs = async () => { docs.value = await listDocs(); };
</script>

<style scoped>
/* ===== 现代化设置对话框设计 ===== */
.custom-settings-dialog.el-dialog {
  border-radius: 16px !important;
  background: var(--bg-primary) !important;
  border: none !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  overflow: hidden !important;
  width: 650px !important;
  max-width: 90vw !important;
  max-height: 85vh !important;
}

.custom-settings-dialog .el-dialog__header {
  background: var(--bg-primary) !important;
  border-bottom: none !important;
  padding: 20px 24px !important;
  border-radius: 16px 16px 0 0 !important;
  position: relative !important;
}

.custom-settings-dialog .el-dialog__title {
  color: var(--text-primary) !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  text-shadow: none !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.custom-settings-dialog .el-dialog__title::before {
  content: '⚙️';
  font-size: 20px;
}

.custom-settings-dialog .el-dialog__body {
  background: var(--bg-primary) !important;
  color: var(--text-primary) !important;
  padding: 0 !important;
  max-height: 70vh !important;
  overflow-y: auto !important;
}

.settings-content {
  padding: 0 !important;
  background: var(--bg-primary) !important;
  min-height: 500px !important;
}

/* ===== 现代化标签页设计 ===== */
.custom-settings-dialog .el-tabs__header {
  margin: 0 0 24px 0;
  border-bottom: none;
  background: var(--bg-secondary);
  padding: 4px;
  border-radius: 12px;
  margin: 16px 24px 24px 24px;
}

.custom-settings-dialog .el-tabs__nav-wrap {
  background: transparent;
}

.custom-settings-dialog .el-tabs__item {
  color: var(--text-secondary);
  font-weight: 500;
  padding: 12px 20px;
  border-radius: 8px;
  margin: 2px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  background: transparent;
}

.custom-settings-dialog .el-tabs__item:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
  transform: translateY(-1px);
}

.custom-settings-dialog .el-tabs__item.is-active {
  color: var(--primary-color);
  background: var(--bg-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  font-weight: 600;
}

.custom-settings-dialog .el-tabs__active-bar {
  display: none;
}

/* ===== 现代化设置区域设计 ===== */
.setting-section {
  margin-bottom: 24px;
  padding: 0 24px;
}

.providers-editor { margin: 8px 0 16px; }
.providers-toolbar { display:flex; justify-content: space-between; align-items: center; padding: 8px 0 12px; border-bottom: none; margin-bottom: 8px; gap: 12px; }
.providers-toolbar .hint { color: var(--text-secondary); font-size: 12px; }
.providers-toolbar .right { display: flex; align-items: center; gap: 8px; }
.providers-toolbar .autosave-hint { color: var(--text-secondary); font-size: 12px; }

.providers-table { display: block; width: 100%; }
.providers-table .thead, .providers-table .tr {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) minmax(0, 1.2fr) 140px; /* 更紧凑且可缩放，保证一屏展示 */
  gap: 12px;
  align-items: center;
}
.providers-table .thead { color: var(--text-secondary); font-size: 12px; padding: 6px 0; }
.providers-table .thead.sticky { position: sticky; top: 0; background: var(--bg-primary); z-index: 1; }
.providers-table .tr { padding: 10px 0; border-bottom: 1px dashed var(--border-color); }
.providers-table .th { white-space: nowrap; }
.providers-table .td :deep(.el-input) { width: 100%; }
.providers-table .td :deep(.el-input__wrapper) { background: var(--bg-primary); border: none; width: 100%; }

.key-inline { display: flex; gap: 8px; align-items: center; flex-wrap: nowrap; }
.key-inline :deep(.el-input) { flex: 1 1 auto; min-width: 160px; }
.key-actions { display: flex; gap: 6px; flex-wrap: nowrap; }
.key-actions :deep(.el-button) { padding: 6px 10px; font-size: 12px; border-radius: 6px; }

.custom-settings-dialog .el-tab-pane {
  min-height: 450px;
  max-height: 450px;
  overflow-y: auto;
}

/* ===== 滚动条样式 ===== */
.custom-settings-dialog .el-dialog__body::-webkit-scrollbar,
.custom-settings-dialog .el-tab-pane::-webkit-scrollbar {
  width: 6px;
}

.custom-settings-dialog .el-dialog__body::-webkit-scrollbar-track,
.custom-settings-dialog .el-tab-pane::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}

.custom-settings-dialog .el-dialog__body::-webkit-scrollbar-thumb,
.custom-settings-dialog .el-tab-pane::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.custom-settings-dialog .el-dialog__body::-webkit-scrollbar-thumb:hover,
.custom-settings-dialog .el-tab-pane::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: none;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 16px;
  background: var(--primary-color);
  border-radius: 2px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.setting-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 0;
}

.setting-item:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px -8px rgba(0, 0, 0, 0.2);
}

.setting-item:hover::before {
  opacity: 0.05;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
  flex: 1;
  position: relative;
  z-index: 1;
}

/* ===== 现代化控件设计 ===== */
.setting-control {
  width: 200px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.setting-control :deep(.el-input__wrapper) {
  background: var(--bg-primary);
  border: none;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.setting-control :deep(.el-input__wrapper:hover) {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.setting-control :deep(.el-input__wrapper.is-focus) {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.setting-control :deep(.el-input__inner) {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 14px;
}

.setting-control :deep(.el-select__placeholder) {
  color: var(--text-muted);
}

.setting-control :deep(.el-textarea__inner) {
  background: var(--bg-primary);
  border: none;
  color: var(--text-primary);
  border-radius: 8px;
  font-size: 14px;
}

.setting-control :deep(.el-switch) {
  --el-switch-on-color: var(--primary-color);
  --el-switch-off-color: var(--text-muted);
  transform: scale(1.1);
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: none;
  transition: all 0.2s ease;
}

.shortcut-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
}

.shortcut-name {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.shortcut-key {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 600;
}

.about-info {
  text-align: center;
  padding: 32px 20px;
}

.app-icon {
  font-size: 64px;
  margin-bottom: 20px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.app-name {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-version {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 20px;
  padding: 4px 12px;
  background: var(--bg-secondary);
  border-radius: 12px;
  display: inline-block;
}

.app-description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 32px;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

.about-links {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.about-links :deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  padding: 10px 20px;
}

.about-links :deep(.el-button--primary) {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.about-links :deep(.el-button--primary:hover) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.about-links :deep(.el-button:not(.el-button--primary)) {
  background: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.about-links :deep(.el-button:not(.el-button--primary):hover) {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
}

.link-icon {
  margin-right: 8px;
  font-size: 16px;
}

/* ===== 现代化底部按钮区域 ===== */
.custom-settings-dialog .el-dialog__footer {
  background: var(--bg-primary) !important;
  border-top: none !important;
  padding: 16px 24px !important;
  border-radius: 0 0 16px 16px !important;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.dialog-footer :deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  padding: 10px 24px;
  font-size: 14px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
}

.dialog-footer :deep(.el-button--primary) {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.dialog-footer :deep(.el-button--primary:hover) {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.dialog-footer :deep(.el-button:not(.el-button--primary)) {
  background: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.dialog-footer :deep(.el-button:not(.el-button--primary):hover) {
  background: var(--bg-tertiary);
  border-color: var(--border-hover);
  color: var(--text-primary);
  transform: translateY(-1px);
}

/* Element Plus Select Dropdown 样式 */
.settings-dialog :deep(.el-select-dropdown) {
  background: var(--bg-primary);
  border: none;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
}

.settings-dialog :deep(.el-select-dropdown__item) {
  color: var(--text-primary);
  background: transparent;
}

.settings-dialog :deep(.el-select-dropdown__item:hover) {
  background: var(--bg-secondary);
}

.settings-dialog :deep(.el-select-dropdown__item.is-selected) {
  background: var(--primary-color);
  color: var(--text-white);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-dialog :deep(.el-dialog) {
    width: 95%;
    margin: 20px auto;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 0;
  }
  
  .setting-control {
    width: 100%;
  }
  
  .about-links {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  
  .about-links :deep(.el-button) {
    min-width: 160px;
  }
  
  .shortcuts-list {
    gap: 8px;
  }
  
  .shortcut-item {
    padding: 10px 12px;
  }
}

@media (max-width: 480px) {
  .settings-dialog :deep(.el-dialog) {
    width: 100%;
    margin: 0;
    border-radius: 0;
    height: 100vh;
  }
  
  .settings-dialog :deep(.el-dialog__header) {
    border-radius: 0;
  }
  
  .settings-dialog :deep(.el-dialog__footer) {
    border-radius: 0;
  }
  
  .app-name {
    font-size: 24px;
  }
  
  .app-icon {
    font-size: 48px;
  }
}
</style>