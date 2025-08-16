import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export interface ElectronAPI {
  getProviders: () => Promise<any[]>;
  getModels: (providerName: string) => Promise<any[]>;
  sendMessage: (providerName: string, model: string, messages: any[], userMessageId: string, assistantMessageId: string, attachments?: any[], webSearchEnabled?: boolean, webSearchOptions?: { search_context_size?: 'low' | 'medium' | 'high' }) => Promise<void>;
  onMessage: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => void;
  onMessageUsage: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => void;
  onMessageAnnotations: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => void;
  onCaptureRequest: (callback: (event: IpcRendererEvent) => void) => void;
  onOpenSettings?: (callback: (event: IpcRendererEvent) => void) => void;
  webSearch: (query: string, options?: {
    providers?: Array<'bing'|'azure-bing'|'serper'|'google'|'duckduckgo'|'baidu'|'so360'|'sogou'>;
    limit?: number;
    whitelist?: string[];
    blacklist?: string[];
  }) => Promise<any[]>;
  fetchReadable: (url: string) => Promise<string>;
  translateText: (text: string, target: string, source?: string) => Promise<{ ok: boolean; text?: string; message?: string }>;
  
  // 图像生成 API
  generateImage: (request: any, providerName: string, apiKey: string) => Promise<{ success: boolean; images?: any[]; error?: string; usage?: any }>;
  // Devtools
  toggleDevtools: () => Promise<void>;
  // 版本
  getAppVersion: () => Promise<string>;
  
  // Provider 管理 API
  saveProviders: (providers: { name: string; baseUrl: string }[]) => Promise<{ ok: boolean; message?: string }>;
  setProviderKey: (providerName: string, apiKey: string) => Promise<{ ok: boolean; message?: string }>;
  removeProviderKey: (providerName: string) => Promise<{ ok: boolean; message?: string }>;
  hasProviderKey: (providerName: string) => Promise<{ hasKey: boolean }>;
  getProviderKeyPreview: (providerName: string) => Promise<{ preview: string | null; message?: string }>;
  testProvider: (providerName: string) => Promise<{ ok: boolean; message?: string }>;
  migrateLlmconfigNow: () => Promise<{ ok: boolean; count?: number; message?: string }>;
  // Updater
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  onAutoUpdate: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => void;
  setAutoUpdateConfig: (cfg: { autoCheck?: boolean; autoDownload?: boolean; channel?: string }) => Promise<{ ok: boolean; message?: string }>;
  fetchRemoteUpdateMeta: (url: string) => Promise<any>;
  
  // Embeddings
  embedTexts: (providerName: string, texts: string[], options?: { model?: string }) => Promise<number[][]>;

}

contextBridge.exposeInMainWorld('electronAPI', {
  // 返回过滤后的服务商列表（不包含任何 apiKey 字段）
  getProviders: async () => {
    const list = await ipcRenderer.invoke('get-providers');
    try {
      return (list || []).map((p: any) => ({ name: p.name, baseUrl: p.baseUrl }));
    } catch { return []; }
  },
  getModels: (providerName: string) => ipcRenderer.invoke('get-models', providerName),
  sendMessage: (providerName: string, model: string, messages: any[], userMessageId: string, assistantMessageId: string, attachments?: any[], webSearchEnabled?: boolean, webSearchOptions?: { search_context_size?: 'low' | 'medium' | 'high' }) => 
    ipcRenderer.invoke('send-message', providerName, model, messages, userMessageId, assistantMessageId, attachments, webSearchEnabled, webSearchOptions),
  onMessage: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on('message', callback),
  onMessageUsage: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on('message-usage', callback),
  onMessageAnnotations: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on('message-annotations', callback),
  onCaptureRequest: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('tray-capture-request', callback),
  onOpenSettings: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('open-settings', callback),
  webSearch: (query: string, options?: any) => ipcRenderer.invoke('web-search', query, options),
  fetchReadable: (url: string) => ipcRenderer.invoke('fetch-readable', url),
  translateText: (text: string, target: string, source?: string) => ipcRenderer.invoke('translate-text', text, target, source),
  
  // 图像生成
  generateImage: (request: any, providerName: string, apiKey: string) => ipcRenderer.invoke('generate-image', request, providerName, apiKey),
  toggleDevtools: () => ipcRenderer.invoke('devtools-toggle'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkLatestVersion: () => ipcRenderer.invoke('check-latest-version'),
  checkSearchAPIStatus: () => ipcRenderer.invoke('check-search-api-status'),
  
  // Provider 管理 API
  saveProviders: (providers: { name: string; baseUrl: string }[]) => ipcRenderer.invoke('save-providers', providers),
  setProviderKey: (providerName: string, apiKey: string) => ipcRenderer.invoke('set-provider-key', providerName, apiKey),
  removeProviderKey: (providerName: string) => ipcRenderer.invoke('remove-provider-key', providerName),
  hasProviderKey: (providerName: string) => ipcRenderer.invoke('has-provider-key', providerName),
  getProviderKeyPreview: (providerName: string) => ipcRenderer.invoke('get-provider-key-preview', providerName),
  testProvider: (providerName: string) => ipcRenderer.invoke('test-provider', providerName),
  migrateLlmconfigNow: () => ipcRenderer.invoke('migrate-llmconfig-now'),
  // Updater
  checkForUpdates: () => ipcRenderer.invoke('updater-check'),
  downloadUpdate: () => ipcRenderer.invoke('updater-download'),
  quitAndInstall: () => ipcRenderer.invoke('updater-quit-and-install'),
  onAutoUpdate: (callback: (event: IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on('auto-update', callback),
  setAutoUpdateConfig: (cfg: { autoCheck?: boolean; autoDownload?: boolean; channel?: string }) => ipcRenderer.invoke('updater-set-config', cfg),
  fetchRemoteUpdateMeta: (url: string) => ipcRenderer.invoke('fetch-remote-update-meta', url),
  // Embeddings
  embedTexts: (providerName: string, texts: string[], options?: { model?: string }) => ipcRenderer.invoke('embed-texts', providerName, texts, options),
  

});