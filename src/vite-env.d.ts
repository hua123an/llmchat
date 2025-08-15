/// <reference types="vite/client" />

interface ElectronAPI {
  getProviders: () => Promise<any[]>;
  getModels: (providerName: string) => Promise<any[]>;
  sendMessage: (providerName: string, model: string, messages: any[], userMessageId: string, assistantMessageId: string, attachments?: any[], webSearchEnabled?: boolean, webSearchOptions?: { search_context_size?: 'low' | 'medium' | 'high' }) => Promise<void>;
  onMessage: (callback: (event: any, ...args: any[]) => void) => void;
  onMessageUsage: (callback: (event: any, ...args: any[]) => void) => void;
  onMessageAnnotations: (callback: (event: any, ...args: any[]) => void) => void;
  onCaptureRequest: (callback: (event?: any) => void) => void;
  onOpenSettings?: (callback: (event?: any) => void) => void;
  webSearch: (query: string, options?: any) => Promise<any[]>;
  fetchReadable: (url: string) => Promise<string>;
  translateText: (text: string, target: string, source?: string) => Promise<{ ok: boolean; text?: string; message?: string }>;
  saveProviders: (providers: { name: string; baseUrl: string }[]) => Promise<{ ok: boolean; message?: string }>;
  setProviderKey: (providerName: string, apiKey: string) => Promise<{ ok: boolean; message?: string }>;
  removeProviderKey: (providerName: string) => Promise<{ ok: boolean; message?: string }>;
  hasProviderKey: (providerName: string) => Promise<{ hasKey: boolean }>;
  getProviderKeyPreview: (providerName: string) => Promise<{ preview: string | null; message?: string }>;
  testProvider: (providerName: string) => Promise<{ ok: boolean; message?: string }>;
  migrateLlmconfigNow: () => Promise<{ ok: boolean; count?: number; message?: string }>;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  onAutoUpdate: (callback: (event: any, ...args: any[]) => void) => void;
  setAutoUpdateConfig: (cfg: { autoCheck?: boolean; autoDownload?: boolean; channel?: string }) => Promise<{ ok: boolean; message?: string }>;
  fetchRemoteUpdateMeta: (url: string) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
