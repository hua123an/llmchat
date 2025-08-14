<template>
  <div class="providers-floating" :class="{ open: isOpen }">
    <button class="floating-toggle" v-if="!isOpen" @click="toggle" :title="isOpen ? t('common.close') : t('settings.providers.title')">⚙️</button>
    <div class="overlay" v-if="isOpen" @click="toggle"></div>
    <div class="panel" v-if="isOpen">
      <div class="panel-header">
        <span class="title">{{ t('settings.providers.title') }}</span>
        <div class="header-actions">
          <el-button type="primary" size="small" @click="addProvider">{{ t('settings.providers.add') }}</el-button>
          <button class="close-btn" @click="toggle" :title="t('common.close')">×</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="providers-table">
          <div class="thead sticky">
            <div class="th name">{{ t('settings.providers.name') }}</div>
            <div class="th baseurl">Base URL</div>
            <div class="th key">API Key</div>
            <div class="th actions">{{ t('settings.providers.actions') }}</div>
          </div>
          <div class="tbody">
            <div class="tr" v-for="(p, idx) in providerList" :key="idx">
              <div class="td name">
                <el-input v-model="p.name" size="small" @input="saveProvidersDebounced()" placeholder="moonshot"/>
              </div>
              <div class="td baseurl">
                <el-input v-model="p.baseUrl" size="small" @input="saveProvidersDebounced()" placeholder="https://api.example.com/v1"/>
              </div>
              <div class="td key">
                <div class="key-inline">
                  <el-input 
                    v-model="p.__keyInput" 
                    size="small" 
                    :type="p.__showKey ? 'text' : 'password'" 
                    :placeholder="p.__hasKey && !p.__keyInput ? t('settings.providers.keyExists') : t('settings.providers.keyPlaceholder')"
                    @focus="handleKeyInputFocus(p)"
                  />
                  <div class="key-actions">
                    <el-button v-if="p.__hasKey" size="small" @click="toggleKeyVisibility(p)">{{ p.__showKey ? t('common.hide') : t('common.show') }}</el-button>
                    <el-button type="primary" size="small" @click="saveKey(p)" :disabled="!p.__keyInput || p.__keyInput.includes('...')">{{ t('common.save') }}</el-button>
                    <el-button v-if="p.__hasKey" type="danger" size="small" @click="removeKey(p)">{{ t('common.delete') }}</el-button>
                  </div>
                </div>
              </div>
              <div class="td actions">
                <div class="row-actions">
                  <el-button size="small" @click="testProvider(p)">{{ t('settings.providers.test') }}</el-button>
                  <el-button type="danger" size="small" @click="() => { removeProvider(idx); saveProvidersDebounced(); }">{{ t('common.delete') }}</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
        

      </div>
      
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChatStore } from '../store/chat';

const store = useChatStore();
const { t } = useI18n();
const isOpen = ref(false);
const toggle = () => { isOpen.value = !isOpen.value; };

type ProviderItem = { name: string; baseUrl: string; __hasKey?: boolean; __keyInput?: string; __showKey?: boolean };
const providerList = ref<ProviderItem[]>([]);
const reloadProviders = async () => {
  await store.loadProviders();
  providerList.value = (store.providers || []).map((p: any) => ({ name: p.name, baseUrl: p.baseUrl, __hasKey: false, __keyInput: '', __showKey: false }));
  setTimeout(() => providerList.value.forEach(refreshHasKey), 0);
};

const refreshHasKey = async (p: ProviderItem) => {
  try { 
    const res = await (window as any).electronAPI.hasProviderKey(p.name); 
    p.__hasKey = !!res?.hasKey; 
    
    // 如果有密钥，获取并显示（用于回显）
    if (p.__hasKey && !p.__keyInput) {
      try {
        // 调用一个新的 API 来获取 API Key 的前几位和后几位用于显示
        const keyRes = await (window as any).electronAPI.getProviderKeyPreview?.(p.name);
        if (keyRes?.preview) {
          p.__keyInput = keyRes.preview; // 显示类似 "sk-or-v1...abc123" 的格式
          p.__showKey = false; // 默认不显示完整密钥
        }
      } catch {}
    }
  } catch { 
    p.__hasKey = false; 
  }
};
const addProvider = () => providerList.value.push({ name: '', baseUrl: '', __hasKey: false, __keyInput: '', __showKey: false });
const removeProvider = (idx: number) => providerList.value.splice(idx, 1);

const saveProviders = async () => {
  const data = providerList.value.map(({ name, baseUrl }) => ({ name: name.trim(), baseUrl: baseUrl.trim() })).filter(p => p.name && p.baseUrl);
  const res = await (window as any).electronAPI.saveProviders(data);
  if (res?.ok) await store.loadProviders();
};
let timer: any = null;
const saveProvidersDebounced = () => { clearTimeout(timer); timer = setTimeout(saveProviders, 400); };

const saveKey = async (p: ProviderItem) => { 
  if (!p.name || !p.__keyInput || p.__keyInput.includes('...')) {
    return;
  }
  
  try {
    const r = await (window as any).electronAPI.setProviderKey(p.name, p.__keyInput);
    
    if (r?.ok) { 
      await refreshHasKey(p); // 重新刷新状态，会自动显示预览
      (window as any).ElMessage?.success?.(`${p.name} API Key 已保存`);
    } else {
      (window as any).ElMessage?.error?.(`保存 ${p.name} API Key 失败: ${r?.message || '未知错误'}`);
    }
  } catch (error) {
    (window as any).ElMessage?.error?.(`保存 ${p.name} API Key 异常: ${error}`);
  }
};

const removeKey = async (p: ProviderItem) => {
  if (!p.name) return;
  try {
    const r = await (window as any).electronAPI.removeProviderKey(p.name);
    if (r?.ok) {
      p.__hasKey = false;
      p.__keyInput = '';
      p.__showKey = false;
      (window as any).ElMessage?.success?.(`已删除 ${p.name} 的 API Key`);
    } else {
      (window as any).ElMessage?.error?.(`删除 ${p.name} API Key 失败: ${r?.message || '未知错误'}`);
    }
  } catch (error) {
    (window as any).ElMessage?.error?.(`删除 ${p.name} API Key 异常: ${error}`);
  }
};

const toggleKeyVisibility = async (p: ProviderItem) => {
  if (p.__showKey) {
    // 隐藏：显示预览格式
    p.__showKey = false;
    await refreshHasKey(p);
  } else {
    // 显示：获取完整密钥（这里我们暂时用预览格式，因为出于安全考虑不建议完全显示）
    p.__showKey = true;
    // 可以选择显示完整密钥或保持预览格式
    (window as any).ElMessage?.info?.('出于安全考虑，这里显示的是预览格式');
  }
};

const handleKeyInputFocus = (p: ProviderItem) => {
  // 当用户点击输入框时，如果显示的是预览，清空让用户输入新值
  if (p.__keyInput && p.__keyInput.includes('...')) {
    p.__keyInput = '';
  }
};

const testProvider = async (p: ProviderItem) => { if (!p.name) return; await (window as any).electronAPI.testProvider(p.name); };



onMounted(async () => {
  await reloadProviders();
  // 若存在历史配置文件，提供一次性迁移入口（静默执行）
  try {
    const res = await (window as any).electronAPI.migrateLlmconfigNow?.();
    if (res?.ok && (res.count || 0) > 0) {
      await reloadProviders();
      (window as any).ElMessage?.success?.(`已迁移 ${res.count} 条配置`);
    }
  } catch {}
});
</script>

<style scoped>
.providers-floating { position: fixed; right: 128px; bottom: 20px; z-index: 2000; }
.providers-floating.open { inset: 0; right: auto; bottom: auto; display: flex; align-items: center; justify-content: center; }
.floating-toggle { width: 44px; height: 44px; border-radius: 12px; border: none; background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; box-shadow: none; }
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 0; }
.panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(1200px, 90vw); height: min(860px, 90vh); overflow: hidden; background: var(--bg-primary); border: none; border-radius: 16px; box-shadow: 0 25px 40px rgba(0,0,0,0.35); display:flex; flex-direction: column; z-index: 1; }
.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: none; gap: 8px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.panel-body { padding: 12px; overflow: auto; }
.close-btn { background: transparent; border: 0; color: var(--text-secondary); font-size: 18px; cursor: pointer; }

.providers-table .thead, .providers-table .tr {
  display: grid;
  grid-template-columns: 180px minmax(240px, 1fr) minmax(420px, 1.6fr) 180px; /* 扩大 Key 列并保证一行展示 */
  gap: 12px;
  align-items: center;
}
.providers-table .thead { color: var(--text-secondary); font-size: 12px; padding: 6px 0; }
.providers-table .thead.sticky { position: sticky; top: 0; background: var(--bg-primary); z-index: 1; }
.providers-table .tr { padding: 8px 0; border-bottom: none; }
.td.key { white-space: nowrap; }
.key-inline { display: flex; gap: 8px; align-items: center; flex-wrap: nowrap; width: 100%; }
.key-inline :deep(.el-input) { flex: 1 1 auto; min-width: 0; } /* 允许输入框缩放，避免把按钮挤换行 */
.key-actions { display: flex; gap: 12px; flex-wrap: nowrap; white-space: nowrap; align-items: center; }
.key-actions :deep(.el-button) { margin: 0 !important; }
.row-actions { display:flex; gap:12px; justify-content:flex-end; white-space: nowrap; align-items: center; }
.row-actions :deep(.el-button) { margin: 0 !important; }


/* 移除底部空白区 */
</style>

