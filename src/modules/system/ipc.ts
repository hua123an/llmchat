// 统一的渲染进程 IPC 包装，避免到处直接访问 window.electronAPI
// 便于后续替换/降级为 Web 环境实现

type ProviderInfo = { name: string; baseUrl: string };
type ModelInfo = { id: string; name?: string };

function api(): any {
  const w = (typeof window !== 'undefined' ? (window as any) : undefined);
  const a = w?.electronAPI;
  if (!a) {
    // 非 Electron 环境：提供最小降级实现
    return {
      getProviders: async () => [],
      getModels: async () => [],
      testProvider: async () => ({ ok: false, message: 'not-electron' }),
      sendMessage: async () => {},
      onMessage: () => {},
      onMessageUsage: () => {},
      onMessageAnnotations: () => {},
      embedTexts: async () => [],
      generateImage: async () => ({ success: false, error: 'not-electron' }),
    };
  }
  return a;
}

export async function getProviders(): Promise<ProviderInfo[]> {
  return await api().getProviders();
}

export async function saveProviders(list: ProviderInfo[]): Promise<{ ok: boolean; message?: string }> {
  return await api().saveProviders(list);
}

export async function getModels(providerName: string): Promise<ModelInfo[]> {
  return await api().getModels(providerName);
}

export async function testProvider(providerName: string): Promise<{ ok: boolean; message?: string }> {
  return await api().testProvider(providerName);
}

export async function sendMessage(
  providerName: string,
  model: string,
  messages: any[],
  userMessageId: string,
  assistantMessageId: string,
  attachments?: Array<{ name: string; mime: string; size: number; dataUrl?: string; textSnippet?: string; fullText?: string }>,
  webSearchEnabled?: boolean,
  webSearchOptions?: any,
): Promise<void> {
  await api().sendMessage(providerName, model, messages, userMessageId, assistantMessageId, attachments, webSearchEnabled, webSearchOptions);
}

// 事件注册：返回一个无操作的卸载函数，保持统一 API
export function onMessage(handler: (event: any, data: any) => void): () => void {
  api().onMessage(handler);
  return () => {};
}

export function onMessageUsage(handler: (event: any, data: any) => void): () => void {
  api().onMessageUsage(handler);
  return () => {};
}

export function onMessageAnnotations(handler: (event: any, data: any) => void): () => void {
  api().onMessageAnnotations(handler);
  return () => {};
}

export async function embedTexts(providerName: string, texts: string[], options?: { model?: string }): Promise<number[][]> {
  return await api().embedTexts(providerName, texts, options);
}

export async function generateImage(request: any, providerName: string, apiKey: string): Promise<any> {
  return await api().generateImage(request, providerName, apiKey);
}

export async function getAppVersion(): Promise<string> { return await api().getAppVersion(); }
export async function toggleDevtools(): Promise<void> { return await api().toggleDevtools?.(); }

export function updaterOn(handler: (event: any, payload: any) => void): void {
  api().onAutoUpdate?.(handler);
}

// Updater helpers (provide both alias names to适配现有 preload 暴露)
export async function updaterCheck(): Promise<void> { return (await api().updaterCheck?.()) ?? (await api().checkForUpdates?.()); }
export async function updaterDownload(): Promise<void> { return (await api().updaterDownload?.()) ?? (await api().downloadUpdate?.()); }
export async function updaterQuitAndInstall(): Promise<void> { return (await api().updaterQuitAndInstall?.()) ?? (await api().quitAndInstall?.()); }
export async function updaterSetConfig(cfg: { autoCheck?: boolean; autoDownload?: boolean; channel?: string }): Promise<any> {
  return (await api().setAutoUpdateConfig?.(cfg)) ?? (await api().updaterSetConfig?.(cfg));
}
export async function checkLatestVersion(): Promise<any> { return await api().checkLatestVersion?.(); }
export async function fetchRemoteUpdateMeta(baseUrl: string): Promise<any> { return await api().fetchRemoteUpdateMeta?.(baseUrl); }

// Providers & keys
export async function hasProviderKey(providerName: string): Promise<{ ok?: boolean; hasKey: boolean }> {
  return await api().hasProviderKey?.(providerName);
}
export async function getProviderKeyPreview(providerName: string): Promise<{ preview: string | null; message?: string }> {
  return await api().getProviderKeyPreview?.(providerName);
}
export async function setProviderKey(providerName: string, apiKey: string): Promise<{ ok: boolean; message?: string }> {
  return await api().setProviderKey?.(providerName, apiKey);
}
export async function removeProviderKey(providerName: string): Promise<{ ok: boolean; message?: string }> {
  return await api().removeProviderKey?.(providerName);
}
export async function refreshOllamaModels(baseUrl?: string): Promise<any> { return await api().refreshOllamaModels?.(baseUrl); }
export async function migrateLlmconfigNow(): Promise<any> { return await api().migrateLlmconfigNow?.(); }

// Web utils
export async function fetchReadable(url: string): Promise<string> { return await api().fetchReadable?.(url); }
export async function translateText(text: string, target: string, source?: string): Promise<any> {
  return await api().translateText?.(text, target, source);
}
export async function webSearch(query: string, options?: any): Promise<any> { return await api().webSearch?.(query, options); }

// Optional events from main
export function onCaptureRequest(handler: () => void): void { api().onCaptureRequest?.(handler); }
export function onOpenSettings(handler: () => void): void { api().onOpenSettings?.(handler); }


