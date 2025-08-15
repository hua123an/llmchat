import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import { autoUpdater } from 'electron-updater';
import OpenAI from 'openai';
import path from 'node:path';
import fs from 'node:fs';
import Store from 'electron-store';
// 移除tiktoken依赖以提升性能
import { fileURLToPath } from 'node:url';
import SecureStorage from './utils/secureStorage';


interface WebSearchOptions {
  search_context_size?: 'low' | 'medium' | 'high';
  max_results?: number;
  timeout_sec?: number;
  retry?: number;
  concurrency?: number;
  weights?: {
    google?: number;
    bing?: number;
    baidu?: number;
    duck?: number;
    exa?: number;
    tavily?: number;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.cjs
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;
let tray: Tray | null = null;
let isQuiting = false;
// Updater runtime config (can be updated from renderer)
let autoUpdateConfig: { autoCheck: boolean; autoDownload: boolean; channel?: string } = { autoCheck: true, autoDownload: false, channel: 'latest' };
async function fetchUpdateMeta(): Promise<{ force?: boolean; notes?: string; channel?: string } | null> {
  try {
    // 读取打包时附带的发布配置（仅 notes/channel/force 可序列化打包到资源）
    // 打包后 latest.yml 不在 APP_ROOT；因此这里仅尝试读取 resources 里的 app.asar 无法实现。
    // 退而求其次：从设置里读取用户设置的发布元信息（若前端写入）。
    // 这里返回 null；实际展示更新说明在渲染进程侧通过网络拉取 latest.yml 更可靠。
    return null;
  } catch {
    return null;
  }
}

// 修复的批量处理机制 - 保持消息流同步，仅搜索处理异步
const deltaBuffers = new Map<string, { buffer: string; timer?: NodeJS.Timeout }>();
function enqueueDelta(messageId: string, delta: string): void {
  if (!delta) return;
  
  // 移除立即发送，避免重复消息

  // 同时进行缓冲，减少高频渲染压力
  let entry = deltaBuffers.get(messageId);
  if (!entry) {
    entry = { buffer: '' };
    deltaBuffers.set(messageId, entry);
  }
  
  entry.buffer += delta;
  
  if (!entry.timer) {
    entry.timer = setInterval(() => {
      const current = deltaBuffers.get(messageId);
      if (!current) return;
      if (current.buffer) {
        const chunkToSend = current.buffer;
        current.buffer = '';
        win?.webContents.send('message', { messageId, delta: chunkToSend });
      }
    }, 33); // 固定30FPS刷新率确保稳定性
  }
  
  // 如果缓冲区过大，立即刷新
  if (entry.buffer.length > 2000) {
    const chunkToSend = entry.buffer;
    entry.buffer = '';
    win?.webContents.send('message', { messageId, delta: chunkToSend });
  }
}
function flushDelta(messageId: string): void {
  const entry = deltaBuffers.get(messageId);
  if (!entry) return;
  try {
    if (entry.buffer) {
      win?.webContents.send('message', { messageId, delta: entry.buffer });
      entry.buffer = '';
    }
  } finally {
    if (entry.timer) clearInterval(entry.timer);
    deltaBuffers.delete(messageId);
  }
}

// Initialize electron-store
const store = new Store({ encryptionKey: 'your-secret-encryption-key' });
// 移除encoding以提升性能
const secureStorage = SecureStorage.getInstance();

function createWindow() {
  // Try to load icon, but don't crash if missing in packaged build
  let windowIcon: string | undefined = undefined;
  try {
    const candidateIco = path.join(__dirname, '..', 'build', 'icon.ico');
    const candidatePng = path.join(__dirname, '..', 'build', 'icon.png');
    if (fs.existsSync(candidateIco)) {
      windowIcon = candidateIco;
    } else if (fs.existsSync(candidatePng)) {
      windowIcon = candidatePng;
    }
  } catch {}

  win = new BrowserWindow({
    icon: windowIcon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
    },
  });

  // Hide native menu bar completely
  try { win.setMenuBarVisibility(false); } catch {}

  // restore window state
  try {
    const alwaysOnTop = !!store.get('window.alwaysOnTop');
    if (alwaysOnTop) {
      win.setAlwaysOnTop(true);
    }
  } catch {}

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
    try { win.webContents.openDevTools({ mode: 'detach' }); } catch {}
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  // keep app running in background (close to tray)
  win.on('close', (event: Electron.Event) => {
    if (!isQuiting) {
      event.preventDefault();
      win?.hide();
    }
  });

  // minimize to tray behavior
  win.on('minimize', (event: Electron.Event) => {
    event.preventDefault();
    win?.hide();
  });
}

// ===== 应用自动更新 =====
function setupAutoUpdater() {
  try {
    // 根据运行时配置决定是否自动下载
    autoUpdater.autoDownload = !!autoUpdateConfig.autoDownload;
    autoUpdater.allowDowngrade = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('checking-for-update', () => {
      win?.webContents.send('auto-update', { type: 'checking' });
    });

    autoUpdater.on('update-available', async (info) => {
      let meta: any = null;
      try {
        meta = await fetchUpdateMeta();
      } catch {}
      win?.webContents.send('auto-update', { type: 'available', info, meta });
      // 自动下载模式
      if (autoUpdateConfig.autoDownload) {
        try { autoUpdater.downloadUpdate().catch(() => {}); } catch {}
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      win?.webContents.send('auto-update', { type: 'no-update', info });
    });

    autoUpdater.on('error', (err) => {
      win?.webContents.send('auto-update', { type: 'error', message: String(err?.message || err) });
    });

    autoUpdater.on('download-progress', (progress) => {
      win?.webContents.send('auto-update', { type: 'progress', progress: {
        percent: progress?.percent ?? 0,
        transferred: progress?.transferred ?? 0,
        total: progress?.total ?? 0,
        bytesPerSecond: progress?.bytesPerSecond ?? 0
      }});
    });

    autoUpdater.on('update-downloaded', (info) => {
      win?.webContents.send('auto-update', { type: 'downloaded', info });
    });
  } catch (e) {
    console.warn('setupAutoUpdater failed:', e);
  }
}
// 从远端获取 update-meta.json（或通道版）
async function fetchRemoteUpdateMeta(url?: string): Promise<any | null> {
  try {
    const base = url || 'https://your-update-server.example.com/updates/';
    const names = ['update-meta-latest.json', 'update-meta.json'];
    for (const name of names) {
      const u = new URL(name, base).toString();
      const resp = await fetch(u, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(3000) });
      if (resp.ok) return await resp.json();
    }
    return null;
  } catch { return null; }
}

app.on('window-all-closed', () => {
  // Keep background resident. Do not quit the app when all windows are closed.
  win = null;
});

app.on('before-quit', () => {
  isQuiting = true;
});

function showMainWindow(): void {
  if (!win) {
    createWindow();
  } else {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
}

function hideMainWindow(): void {
  win?.hide();
}

function toggleMainWindowVisibility(): void {
  if (!win) {
    createWindow();
    return;
  }
  if (win.isVisible()) hideMainWindow(); else showMainWindow();
}

function isWindowAlwaysOnTop(): boolean {
  try {
    return !!store.get('window.alwaysOnTop');
  } catch {
    return false;
  }
}

function setWindowAlwaysOnTop(enabled: boolean): void {
  if (!win) return;
  win.setAlwaysOnTop(enabled);
  try { store.set('window.alwaysOnTop', enabled); } catch {}
}

function isAutoLaunchEnabled(): boolean {
  try {
    const fromStore = store.get('app.autoLaunch');
    if (typeof fromStore === 'boolean') return fromStore as boolean;
  } catch {}
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch { return false; }
}

function setAutoLaunchEnabled(enabled: boolean): void {
  try {
    app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath, args: [] });
  } catch {}
  try { store.set('app.autoLaunch', enabled); } catch {}
}

// Application menu removed per product requirement

function buildTrayMenu(): Menu {
  const alwaysOnTop = isWindowAlwaysOnTop();
  const autoLaunch = isAutoLaunchEnabled();
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'Show/Hide', click: () => toggleMainWindowVisibility() },
    { label: 'New Chat', click: () => win?.webContents.send('menu:new-chat') },
    { label: 'Settings', click: () => win?.webContents.send('menu:open-settings') },
    { type: 'separator' },
    { label: 'Capture Screen (Ctrl+Shift+S)', click: () => { win?.webContents.send('tray-capture-request'); } },
    { type: 'separator' },
    { label: 'Always on Top', type: 'checkbox', checked: alwaysOnTop, click: (item) => setWindowAlwaysOnTop(!!item.checked) },
    { label: 'Launch at Startup', type: 'checkbox', checked: autoLaunch, click: (item) => setAutoLaunchEnabled(!!item.checked) },
    { type: 'separator' },
    { label: 'Exit', click: () => { isQuiting = true; app.quit(); } },
  ];
  return Menu.buildFromTemplate(template);
}

function normalizeUrl(raw: string): string {
  try {
    let url = String(raw || '').replace(/&amp;/g, '&').trim();
    if (!url) return '';
    if (url.startsWith('//')) url = 'https:' + url;
    try {
      const u = new URL(url);
      if (u.hostname.includes('duckduckgo.com') && u.pathname.startsWith('/l')) {
        const uddg = u.searchParams.get('uddg');
        if (uddg) {
          const decoded = decodeURIComponent(uddg);
          return normalizeUrl(decoded);
        }
      }
    } catch {}
    return url;
  } catch { return raw; }
}

// 删除未使用的类型定义











// 删除未使用的函数

// OpenRouter Web Search - 联网搜索现在通过:online模型后缀直接处理
ipcMain.handle('web-search', async (_e, _query: string, _options?: { limit?: number; search_context_size?: 'low' | 'medium' | 'high' }) => {
  // 联网搜索功能已集成到send-message中，通过:online模型后缀实现
  // 这个处理器保留用于兼容性，但实际搜索通过OpenRouter的原生功能完成
  return [];
});

ipcMain.handle('fetch-readable', async (_e, targetUrl: string) => {
  try {
    console.log(`📄 获取网页内容: ${targetUrl}`);
    const fixedUrl = normalizeUrl(targetUrl);
    const res = await fetch(fixedUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0 ChatLLM' },
      signal: AbortSignal.timeout(10000) // 10秒超时
    });
    const html = await res.text();
    
    // 简单内容提取
    const content = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
    
    console.log(`✅ 网页内容获取成功: ${content.length} 字符`);
    return content;
  } catch (e) {
    console.error('❌ 获取网页内容失败:', e);
    return '';
  }
});

// 翻译 API：默认使用可自建/公开的 LibreTranslate 兼容服务
ipcMain.handle('translate-text', async (_e, text: string, target: string, source?: string) => {
  try {
    const base = (process.env.TRANSLATE_API_URL || 'https://libretranslate.de').replace(/\/$/, '');
    const url = `${base}/translate`;
    const body: any = { q: String(text || ''), source: source || 'auto', target: target || 'en', format: 'text' };
    const apiKey = process.env.TRANSLATE_API_KEY || '';
    if (apiKey) body.api_key = apiKey;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json: any = await resp.json();
    const translated: string = json?.translatedText || json?.translated_text || '';
    if (!translated) throw new Error('Empty translation');
    return { ok: true, text: translated };
  } catch (error: any) {
    console.error('Translate API error:', error);
    return { ok: false, message: String(error?.message || error) };
  }
});

// OpenRouter联网搜索状态检查
ipcMain.handle('check-search-api-status', async () => {
  return {
    healthy: true,
    url: 'https://openrouter.ai',
    message: 'OpenRouter联网搜索可用'
  };
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  // Set redesigned application menu
  try {
    // Remove application menu as requested
    Menu.setApplicationMenu(null);
  } catch (e) {
    console.warn('Application menu init failed:', e);
  }
  try {
    // 优先使用用户保存的 providers；若不存在再尝试读取 llmconfig.txt
    const existingProviders = store.get('providers') as { name: string; baseUrl: string }[] | undefined;
    if (!existingProviders || existingProviders.length === 0) {
    const configPath = path.join(process.env.APP_ROOT || '', 'llmconfig.txt');
      if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const lines = configContent.split('\n').filter(line => line.trim() !== '').slice(3);
    const providers = lines.map((line: string) => {
      const parts = line.trim().split(/\s+/);
      return { name: parts[0], baseUrl: parts[2] };
    }).filter((p): p is { name: string; baseUrl: string } => !!p.name);
        for (const line of lines) {
      const parts = line.trim().split(/\s+/);
          if (parts[0] && parts[1]) {
            secureStorage.storeApiKey(parts[0], parts[1]);
          }
        }
        store.set('providers', providers);
      } else {
        store.set('providers', []);
      }
    }
  } catch (error) {
    console.error('Failed to load or parse llmconfig.txt', error);
  }

  createWindow();
  setupAutoUpdater();
  // 可选：启动时自动检查
  try { if (autoUpdateConfig.autoCheck) { autoUpdater.checkForUpdates().catch(() => {}); } } catch {}

  // Create Tray
  try {
    const icoPath = path.join(__dirname, '..', 'build', 'icon.ico');
    const pngPath = path.join(__dirname, '..', 'build', 'icon.png');
    const trayIcon = fs.existsSync(icoPath)
      ? nativeImage.createFromPath(icoPath)
      : (fs.existsSync(pngPath) ? nativeImage.createFromPath(pngPath) : undefined);
    tray = new Tray(trayIcon || nativeImage.createEmpty());
    tray.setToolTip('ChatLLM');
    tray.setContextMenu(buildTrayMenu());
    tray.on('click', () => toggleMainWindowVisibility());
  } catch (e) {
    console.warn('Tray init failed:', e);
  }

  // Global Shortcut for Screenshot
  try {
    globalShortcut.register('CommandOrControl+Shift+S', () => {
      win?.webContents.send('tray-capture-request');
    });
  } catch (e) {
    console.warn('globalShortcut register failed:', e);
  }

  // Global Shortcut: open settings (Shift+S)
  try {
    const accelerator = 'Shift+S';
    globalShortcut.register(accelerator, () => {
      win?.webContents.send('open-settings');
    });
  } catch (e) {
    console.warn('globalShortcut(register settings) failed:', e);
  }

  // Global Shortcut: Toggle DevTools (Ctrl+Shift+I / F12)
  try {
    const toggleDevtools = () => {
      if (!win) return;
      try {
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools();
        } else {
          win.webContents.openDevTools({ mode: 'detach' });
        }
      } catch {}
    };
    globalShortcut.register('CommandOrControl+Shift+I', toggleDevtools);
    globalShortcut.register('F12', toggleDevtools);
  } catch (e) {
    console.warn('globalShortcut(register devtools) failed:', e);
  }

  // 提供应用版本给渲染进程
  try {
    ipcMain.handle('get-app-version', () => app.getVersion());
    // 检查 GitHub 最新版本
    ipcMain.handle('check-latest-version', async () => {
      try {
        const resp = await fetch('https://api.github.com/repos/hua123an/llmchat/releases/latest', {
          headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'ChatLLM-Updater' },
          signal: AbortSignal.timeout(6000)
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const j: any = await resp.json();
        return { tag: String(j?.tag_name || ''), name: String(j?.name || ''), html_url: String(j?.html_url || ''), body: String(j?.body || '') };
      } catch (e: any) {
        return { tag: '', error: String(e?.message || e) };
      }
    });
  } catch {}

  // Updater IPC handlers
  try {
    ipcMain.handle('updater-check', async () => {
      try { await autoUpdater.checkForUpdates(); } catch (e) { throw e; }
    });
    ipcMain.handle('updater-download', async () => {
      try { await autoUpdater.downloadUpdate(); } catch (e) { throw e; }
    });
    ipcMain.handle('updater-quit-and-install', async () => {
      try { autoUpdater.quitAndInstall(); } catch (e) { throw e; }
    });
    ipcMain.handle('updater-set-config', async (_e, cfg: { autoCheck?: boolean; autoDownload?: boolean; channel?: string }) => {
      try {
        autoUpdateConfig = {
          autoCheck: typeof cfg?.autoCheck === 'boolean' ? !!cfg.autoCheck : autoUpdateConfig.autoCheck,
          autoDownload: typeof cfg?.autoDownload === 'boolean' ? !!cfg.autoDownload : autoUpdateConfig.autoDownload,
          channel: cfg?.channel || autoUpdateConfig.channel,
        };
        autoUpdater.autoDownload = !!autoUpdateConfig.autoDownload;
        if (autoUpdateConfig.autoCheck) {
          // 立即触发一次检查（静默）
          setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 300);
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: e?.message || 'set config failed' };
      }
    });
    ipcMain.handle('fetch-remote-update-meta', async (_e, baseUrl: string) => {
      try { return await fetchRemoteUpdateMeta(baseUrl); } catch { return null; }
    });
  } catch (e) {
    console.warn('updater IPC handlers init failed:', e);
  }
});

ipcMain.handle('get-providers', () => {
  const providers = (store.get('providers') as any[]) || [];
  // 仅返回非敏感字段
  return providers.map(p => ({ name: p.name, baseUrl: p.baseUrl }));
});

// 保存 providers（仅名称与 BaseURL）。若输入无效，返回错误信息
ipcMain.handle('save-providers', (_e, providers: Array<{ name: string; baseUrl: string }>) => {
  try {
    if (!Array.isArray(providers)) throw new Error('Invalid providers');
    const sanitized = providers
      .map(p => ({ name: String(p?.name || '').trim(), baseUrl: String(p?.baseUrl || '').trim() }))
      .filter(p => p.name && p.baseUrl);
    store.set('providers', sanitized);
    return { ok: true };
  } catch (error: any) {
    return { ok: false, message: error?.message || 'save providers failed' };
  }
});

// 一次性迁移：读取 APP_ROOT/llmconfig.txt -> 保存到 electron-store 与安全存储，并尝试删除该文件
ipcMain.handle('migrate-llmconfig-now', () => {
  try {
    const configPath = path.join(process.env.APP_ROOT || '', 'llmconfig.txt');
    if (!fs.existsSync(configPath)) {
      return { ok: false, message: 'llmconfig.txt not found' };
    }
    const content = fs.readFileSync(configPath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const body = lines.slice(3);
    const providers: Array<{ name: string; baseUrl: string }> = [];
    for (const line of body) {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 3) {
        const name = parts[0];
        const key = parts[1];
        const baseUrl = parts.slice(2).join(' ');
        if (name && baseUrl) {
          providers.push({ name, baseUrl });
          if (key) {
            try { secureStorage.storeApiKey(name, key); } catch {}
          }
        }
      }
    }
    store.set('providers', providers);
    try { fs.unlinkSync(configPath); } catch {}
    return { ok: true, count: providers.length };
  } catch (error: any) {
    return { ok: false, message: error?.message || 'migration failed' };
  }
});


// 设置/删除/检测 Provider API Key（通过安全存储，不回传明文）
ipcMain.handle('set-provider-key', (_e, providerName: string, apiKey: string) => {
  try {
    if (!providerName || !apiKey) {
      throw new Error('Invalid parameters');
    }
    const ok = secureStorage.storeApiKey(providerName, apiKey);
    return { ok };
  } catch (error: any) {
    return { ok: false, message: error?.message || 'set key failed' };
  }
});

ipcMain.handle('remove-provider-key', (_e, providerName: string) => {
  try {
    if (!providerName) throw new Error('Invalid parameters');
    const ok = secureStorage.removeApiKey(providerName);
    return { ok };
  } catch (error: any) {
    return { ok: false, message: error?.message || 'remove key failed' };
  }
});

ipcMain.handle('has-provider-key', (_e, providerName: string) => {
  try {
    const key = secureStorage.getApiKey(providerName);
    return { ok: true, hasKey: !!key };
  } catch {
    return { ok: false, hasKey: false };
  }
});

ipcMain.handle('get-provider-key-preview', (_e, providerName: string) => {
  try {
    if (!providerName) throw new Error('Invalid parameters');
    const preview = secureStorage.getApiKeyPreview(providerName);
    return { preview };
  } catch (error: any) {
    return { preview: null, message: error?.message || 'get preview failed' };
  }
});



// 测试 provider：请求 /models 校验连通性
ipcMain.handle('test-provider', async (_e, providerName: string) => {
  try {
    const providers = (store.get('providers') as { name: string; baseUrl: string }[]) || [];
    const provider = providers.find(p => p.name === providerName);
    if (!provider) return { ok: false, message: 'Provider not found' };
    const apiKey = secureStorage.getApiKey(providerName);
    if (!apiKey) return { ok: false, message: 'API key missing' };
    const base = provider.baseUrl.replace(/\/$/, '');
    const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
    if (/openrouter\.ai/i.test(base)) { headers['HTTP-Referer'] = 'https://chatllm.local'; headers['X-Title'] = 'ChatLLM'; }
    const eps = ['', '/models', '/v1/models', '/v3/models', '/v4/models', '/api/paas/v4/models'];
    for (const ep of eps) {
      const url = /\/models(\/)?$/i.test(base) && !ep ? base : `${base}${ep}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(url, { headers, signal: controller.signal }).finally(() => clearTimeout(timer));
        if (resp.ok) return { ok: true };
      } catch {}
    }
    return { ok: false, message: 'All endpoints failed' };
  } catch (error: any) {
    return { ok: false, message: error?.message || 'test failed' };
  }
});

ipcMain.handle('get-models', async (_event: IpcMainInvokeEvent, providerName: string) => {
  const providers = store.get('providers') as { name: string; baseUrl: string }[] || [];
  const provider = providers.find(p => p.name === providerName);
  const apiKey = secureStorage.getApiKey(providerName);

  if (!provider) {
    return [];
  }

  // 对于Ollama，不需要检查API密钥
  if (/localhost:11434/i.test(provider.baseUrl) || /ollama/i.test(providerName.toLowerCase())) {
    // Ollama逻辑继续执行
  } else if (!apiKey) {
    // 其他提供商需要API密钥
    return [];
  }

  // Ollama本地模型特殊处理：获取本地已安装的模型列表
  if (/localhost:11434/i.test(provider.baseUrl) || /ollama/i.test(providerName.toLowerCase())) {
    try {
      const url = `${provider.baseUrl.replace(/\/$/, '')}/api/tags`;
      
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json'
      };
      
      // 本地Ollama无需认证，不添加Authorization头
      // Ollama本地服务基于HTTP API，无需身份验证
      
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000); // 缩短超时时间
      const resp = await fetch(url, { 
        headers, 
        signal: controller.signal,
        method: 'GET'  // 明确指定GET方法
      }).finally(() => clearTimeout(timer));
      
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      
      const json: any = await resp.json();
      console.log('Ollama模型列表响应:', json); // 调试日志
      
      // Ollama响应格式为 { models: [{ name: "llama2", ... }, ...] }
      let models: any[] = [];
      if (Array.isArray(json.models)) {
        models = json.models.map((m: any) => ({
          id: m?.name || m?.model || String(m),
          name: (m?.name || m?.model || String(m)).replace(':latest', ''), // 去掉:latest后缀显示
          size: m?.size ? Math.round(m.size / 1024 / 1024 / 1024 * 10) / 10 + 'GB' : undefined,
          modified_at: m?.modified_at
        })).filter((m: any) => m.id);
      }
      
      console.log(`Ollama发现 ${models.length} 个已安装的模型:`, models.map(m => m.name));
      
      // 如果没有找到模型，返回提示信息
      if (models.length === 0) {
        console.warn('Ollama服务运行中但未找到已安装的模型，请先下载模型：ollama pull llama3.2');
        // 返回空数组，让用户知道需要先下载模型
        return [];
      }
      
      return models;
    } catch (error: any) {
      console.error('Ollama获取模型列表失败:', error.message);
      // 检查是否是连接错误
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        console.warn('Ollama服务未运行，请先启动：ollama serve');
        // 返回空数组而不是预设模型，避免误导用户
        return [];
      }
      // 其他错误也返回空数组
      return [];
    }
  }

  // 智谱AI无法通过API获取模型列表，使用硬编码列表
  if (/bigmodel\.cn/i.test(provider.baseUrl) || provider.name.toLowerCase().includes('zhipu')) {
    const zhipuModels = [
      { id: 'glm-4-plus' },
      { id: 'glm-4-0520' },
      { id: 'glm-4' },
      { id: 'glm-4-air' },
      { id: 'glm-4-airx' },
      { id: 'glm-4-long' },
      { id: 'glm-4-flashx' },
      { id: 'glm-4-flash' },
      { id: 'glm-4-9b-chat' },
      { id: 'glm-3-turbo' },
      { id: 'chatglm3-6b' },
      { id: 'glm-4v-plus' },
      { id: 'glm-4v' },
      { id: 'cogview-3-plus' },
      { id: 'cogview-3' },
      { id: 'cogvideox' },
      { id: 'emohaa' },
      { id: 'charglm-3' },
      { id: 'codegeex-4' }
    ];
    return zhipuModels;
  }


  
  const base = provider.baseUrl.replace(/\/$/, '');
  
  // 302AI 特殊处理：使用官方文档指定的端点和参数
  if (/302\.ai/i.test(provider.baseUrl) || provider.name.toLowerCase().includes('302ai')) {
    const tryFetch302AI = async () => {
      try {
        // 根据官方文档：GET https://api.302.ai/v1/models?llm=1
        const url = `${base}/v1/models?llm=1`;
        
        const headers: Record<string, string> = { 
          Authorization: `Bearer ${apiKey}`, 
          Accept: 'application/json'
        };
        
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const resp = await fetch(url, { headers, signal: controller.signal }).finally(() => clearTimeout(timer));
        
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const json: any = await resp.json();
        
        // 根据官方文档，响应格式为 { data: [...], object: "list" }
        let arr: any[] = [];
        if (Array.isArray(json.data)) {
          arr = json.data;
        }
        
        const models = arr.map((m: any) => ({ id: m?.id || m?.model || m?.name || String(m) })).filter((m: any) => m.id);
        return models;
      } catch (e: any) {
        return [];
      }
    };
    
    return await tryFetch302AI();
  }

  // 零一万物特殊处理：使用正确的API端点
  if (/lingyiwanwu\.com/i.test(provider.baseUrl) || provider.name.toLowerCase().includes('lingyi')) {
    const tryFetchLingyi = async () => {
      try {
        // 零一万物的models端点
        const url = `${base}/v1/models`;
        
        const headers: Record<string, string> = { 
          Authorization: `Bearer ${apiKey}`, 
          Accept: 'application/json'
        };
        
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        const resp = await fetch(url, { headers, signal: controller.signal }).finally(() => clearTimeout(timer));
        
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        const json: any = await resp.json();
        
        // 零一万物的响应格式为 { data: [...], object: "list" }
        let arr: any[] = [];
        if (Array.isArray(json.data)) {
          arr = json.data;
        }
        
        const models = arr.map((m: any) => ({ id: m?.id || m?.model || m?.name || String(m) })).filter((m: any) => m.id);
        return models;
      } catch (e: any) {
        return [];
      }
    };
    
    return await tryFetchLingyi();
  }

  // MiniMax特殊处理：使用硬编码模型列表，因为API不提供模型列表端点
  if (/minimaxi\.com/i.test(provider.baseUrl) || provider.name.toLowerCase().includes('minimax')) {
    const minimaxModels = [
      { id: 'abab6.5s-chat' },
      { id: 'abab6.5-chat' },
      { id: 'abab6.5g-chat' },
      { id: 'abab5.5s-chat' },
      { id: 'abab5.5-chat' },
      { id: 'abab6.5t-chat' },
      { id: 'abab6.5-instruct' },
      { id: 'abab5.5-instruct' }
    ];
    return minimaxModels;
  }

  // 讯飞星火特殊处理：使用硬编码模型列表（由用户提供的最终展示列表）
  if (/xf-yun\.com/i.test(provider.baseUrl) || provider.name.toLowerCase().includes('spark')) {
    const sparkModels = [
      { id: 'general', name: 'Spark X1' },              // 通用模型
      { id: 'general-batch', name: 'Spark X1-批处理' }, // 显示用途，发送时会规范化为 general
      { id: 'lite', name: 'Spark Lite' },               // 轻量级
      { id: 'pro-128k', name: 'Spark Pro-128K' },       // 专业版 128K
      // Spark Max 系列在当前环境存在消息阻塞问题，临时下线
      // { id: 'generalv2', name: 'Spark Max' },
      { id: 'max-32k', name: 'Spark Max-32K' },
      { id: 'generalv3.5', name: 'Spark4.0 Ultra' }     // 4.0 Ultra
    ];
    return sparkModels;
  }


  
  const bases = [base];
  const endpoints = ['', '/models', '/v1/models', '/v3/models', '/v4/models', '/api/paas/v4/models'];

  const tryFetch = async (url: string) => {
    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };
      // OpenRouter 需要附加安全头
      if (/openrouter\.ai/i.test(provider.baseUrl)) {
        headers['HTTP-Referer'] = 'https://chatllm.local';
        headers['X-Title'] = 'ChatLLM';
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const resp = await fetch(url, { headers, signal: controller.signal }).finally(() => clearTimeout(timer));
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      const json: any = await resp.json();
      // Normalize: support OpenAI-style {data: [{id}]}, Zhipu-style {data:[{id|model|name}]}, others {models:[...]}
      let arr: any[] = [];
      if (Array.isArray(json)) arr = json;
      else if (Array.isArray(json.data)) arr = json.data;
      else if (Array.isArray(json.models)) arr = json.models;
      else if (json.data && Array.isArray(json.data.models)) arr = json.data.models;
      const models = arr.map((m: any) => ({ id: m?.id || m?.model || m?.name || String(m) })).filter((m: any) => m.id);
      return models;
    } catch (e: any) {
      return [] as any[];
    }
  };

  const results: Record<string, { id: string }> = {};
  for (const b of bases) {
    for (const ep of endpoints) {
      const path = ep || ''; // allow baseURL itself to be the /models endpoint
      const url = /\/models(\/)?$/i.test(b) && !path ? b : `${b}${path}`;
      const list = await tryFetch(url);
      for (const item of list) results[item.id] = { id: item.id };
      if (Object.keys(results).length > 0) break; // prefer first working endpoint
    }
    if (Object.keys(results).length > 0) break;
  }

  const finalModels = Object.values(results);
  return finalModels;
});

// 专门的Ollama模型列表刷新处理器
ipcMain.handle('refresh-ollama-models', async (_event: IpcMainInvokeEvent, baseUrl?: string) => {
  try {
    const url = `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/tags`;
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { 
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      method: 'GET'
    }).finally(() => clearTimeout(timer));
    
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    
    const json: any = await resp.json();
    
    let models: any[] = [];
    if (Array.isArray(json.models)) {
      models = json.models.map((m: any) => ({
        id: m?.name || m?.model || String(m),
        name: (m?.name || m?.model || String(m)).replace(':latest', ''),
        size: m?.size ? Math.round(m.size / 1024 / 1024 / 1024 * 10) / 10 + 'GB' : undefined,
        modified_at: m?.modified_at,
        details: m?.details,
        digest: m?.digest
      })).filter((m: any) => m.id);
    }
    
    console.log(`🦙 Ollama刷新完成，发现 ${models.length} 个模型:`, models.map(m => m.name));
    
    return {
      ok: true,
      models,
      count: models.length,
      message: models.length > 0 ? `找到 ${models.length} 个已安装的模型` : '未找到已安装的模型，请先下载：ollama pull llama3.2'
    };
  } catch (error: any) {
    console.error('🦙 Ollama模型列表刷新失败:', error.message);
    
    let message = '刷新失败';
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      message = 'Ollama服务未运行，请先启动：ollama serve';
    } else {
      message = `连接错误: ${error.message}`;
    }
    
    return {
      ok: false,
      models: [],
      count: 0,
      message,
      error: error.message
    };
  }
});

// 图像生成 API 处理
ipcMain.handle('generate-image', async (_event: IpcMainInvokeEvent, request: any, providerName: string, apiKey: string) => {
  try {
    console.log('Electron主进程处理图像生成请求:', { 
      providerName, 
      request: { 
        prompt: request.prompt?.substring(0, 50) + '...', 
        model: request.model,
        size: request.size,
        n: request.n 
      } 
    });
    
    if (providerName === 'aliyun') {
      const result = await handleAliyunImageGeneration(request, apiKey);
      // 确保返回的数据是可序列化的
      return {
        success: result.success,
        images: result.images || [],
        usage: result.usage ? {
          provider: result.usage.provider,
          cost: result.usage.cost || 0
        } : undefined,
        error: (result as any).error || undefined
      };
    } else {
      throw new Error(`不支持的图像生成服务商: ${providerName}`);
    }
  } catch (error) {
    console.error('图像生成失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      images: [],
      usage: undefined
    };
  }
});

async function handleAliyunImageGeneration(request: any, apiKey: string) {
  // 验证API密钥格式
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API密钥不能为空');
  }
  
  if (!apiKey.startsWith('sk-')) {
    throw new Error('阿里云API密钥格式不正确，应该以 "sk-" 开头。请检查您的API密钥是否正确。');
  }
  
  if (apiKey.length < 20) {
    throw new Error('阿里云API密钥长度不足，请检查是否完整复制了API密钥。');
  }

  console.log('使用阿里云百炼平台 OpenAI 兼容模式');
  console.log('使用的API密钥前缀:', apiKey.substring(0, 10) + '...');
  console.log('请求的模型:', request.model);

  // 使用 OpenAI 兼容格式 - 更简单可靠
  const openaiRequestBody = {
    // 优先用 FLUX，避免部分账号 SD3.5 不可用；Wanx 兼容同一端点
    model: String(request.model || 'flux-schnell'),
    prompt: String(request.prompt || ''),
    size: String(request.size || '1024x1024'), // OpenAI格式使用 WxH
    n: Math.min(Number(request.n) || 1, 4),
    quality: "standard", // 可以是 "standard" 或 "hd"
    response_format: "url"
  };

  // 添加自定义参数（如果API支持）
  if (request.steps && typeof request.steps === 'number') {
    (openaiRequestBody as any).steps = Number(request.steps);
  }
  
  if (request.guidance_scale && typeof request.guidance_scale === 'number') {
    (openaiRequestBody as any).guidance_scale = Number(request.guidance_scale);
  }

  console.log('发送到阿里云兼容API的请求体:', openaiRequestBody);

  // 使用阿里云的 OpenAI 兼容端点（部分账号/区域可能未开通，404 时自动回退到官方 text2image 接口）
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'llmchat-electron/2.0.0'
    },
    body: JSON.stringify(openaiRequestBody)
  });

  console.log('阿里云API响应状态:', response.status, response.statusText);

  if (!response.ok) {
    // 兼容端点未开通，自动回退到官方 text2image
    if (response.status === 404) {
      console.log('兼容模式 images 接口返回 404，改用官方 text2image 接口重试');
      const sizeStar = String(request.size || '1024x1024').replace('x', '*');
      const synthesisBody: any = {
        model: String(request.model || 'stable-diffusion-3.5-large'),
        input: {
          prompt: String(request.prompt || ''),
          size: sizeStar,
          n: Math.min(Number(request.n) || 1, 4)
        },
        parameters: {
          seed: Math.floor(Math.random() * 1_000_000)
        }
      };
      if (request.steps && typeof request.steps === 'number') synthesisBody.parameters.steps = Number(request.steps);
      if (request.guidance_scale && typeof request.guidance_scale === 'number') synthesisBody.parameters.guidance_scale = Number(request.guidance_scale);

      const resp2 = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // 强制使用异步模式，部分账号同步被禁用
          'X-DashScope-Async': 'enable'
        },
        body: JSON.stringify(synthesisBody)
      });

      console.log('text2image 接口响应状态:', resp2.status, resp2.statusText);
      if (!resp2.ok) {
        const err2 = await resp2.json().catch(() => ({}));
        throw new Error(`阿里云图像生成请求失败: ${resp2.status} ${err2.message || resp2.statusText}`);
      }

      const data2 = await resp2.json();
      // 异步：返回任务ID则轮询
      if (data2?.output?.task_id) {
        const taskId = data2.output.task_id as string;
        const poll = async (): Promise<any> => {
          for (let i = 0; i < 30; i++) {
            const tr = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
            });
            const tj = await tr.json().catch(() => ({}));
            const status = tj?.output?.task_status || tj?.task_status;
            if (status === 'SUCCEEDED') return tj;
            if (status === 'FAILED') throw new Error(tj?.output?.message || '阿里云任务失败');
            await new Promise(r => setTimeout(r, 2000));
          }
          throw new Error('阿里云任务超时');
        };
        const done = await poll();
        const results = done?.output?.results || [];
        if (Array.isArray(results) && results.length > 0) {
          const images = results.map((r: any) => ({ url: r.url, revised_prompt: request.prompt }));
          return { success: true, images, usage: { provider: '阿里云百炼', cost: 0 } };
        }
        throw new Error('阿里云任务响应无结果');
      }

      // 同步：直接带结果
      if (data2?.output?.results && Array.isArray(data2.output.results)) {
        const images = data2.output.results.map((r: any) => ({ url: r.url, revised_prompt: request.prompt }));
        return { success: true, images, usage: { provider: '阿里云百炼', cost: 0 } };
      }
      throw new Error('阿里云 text2image 响应格式不正确');
    }
    const errorData = await response.json().catch(() => ({}));
    console.error('阿里云API错误响应:', errorData);
    
    // 针对403错误提供详细的诊断信息
    if (response.status === 403) {
      let errorMessage = '阿里云API访问被拒绝 (403)。可能的原因：\n';
      errorMessage += '1. API密钥无效或格式错误（应以sk-开头）\n';
      errorMessage += '2. 账户未开通百炼平台文生图服务\n';
      errorMessage += '3. 账户余额不足\n';
      errorMessage += '4. API密钥权限不足\n';
      errorMessage += '5. 地域限制或服务暂时不可用\n\n';
      errorMessage += `详细错误: ${errorData.message || errorData.error || response.statusText}`;
      
      throw new Error(errorMessage);
    }
    
    throw new Error(`阿里云API请求失败: ${response.status} ${errorData.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('阿里云兼容API成功响应:', data);

  // 处理OpenAI兼容格式的响应
  if (data.data && Array.isArray(data.data)) {
    // 确保返回的数据完全可序列化
    const images = data.data.map((item: any) => {
      return {
        url: typeof item.url === 'string' ? item.url : '',
        revised_prompt: typeof item.revised_prompt === 'string' ? item.revised_prompt : request.prompt
      };
    });

    return {
      success: true,
      images: images,
      usage: {
        provider: '阿里云百炼 (OpenAI兼容)',
        cost: 0
      }
    };
  }

  throw new Error('阿里云兼容API响应格式不正确');
}

ipcMain.handle('send-message', async (_event: IpcMainInvokeEvent, providerName: string, model: string, messages: any[], _userMessageId: string, assistantMessageId: string, attachments?: Array<{ name: string; mime: string; size: number; dataUrl?: string; textSnippet?: string; fullText?: string }>, webSearchEnabled?: boolean, webSearchOptions?: WebSearchOptions) => {
  const providers = store.get('providers') as { name: string; baseUrl: string }[] || [];
  const provider = providers.find(p => p.name === providerName);
  const apiKey = secureStorage.getApiKey(providerName);

  if (!provider || !apiKey) {
    console.error(`Provider ${providerName} not found or API key missing`);
    win?.webContents.send('message', { messageId: assistantMessageId, delta: 'error: Invalid provider or API key' });
    return;
  }

  // 简化token计算，避免阻塞（最终会在流结束时使用更精确的提供商级估算覆盖）
  let promptTokens = 0;
  let completionTokens = 0;
  let fullResponse = "";
  
  // 异步计算token，不阻塞发送 - 初步估算（基于原始 messages）
  setImmediate(() => {
    Promise.resolve().then(() => {
      try {
        promptTokens = messages.reduce((acc, msg) => {
          const content = String(msg.content ?? '');
          return acc + (content.length / 4); // 快速估算，避免encoding.encode的开销
        }, 0);
      } catch (e) {
        promptTokens = 0;
      }
    }).catch(() => {
      promptTokens = 0; // 打包后的错误保护
    });
  });

  // 提供商级 token 估算器（在流结束时对 spark 做更精确的修正）
  const estimateTokens = (text: string, isSpark: boolean): number => {
    if (!text) return 0;
    if (isSpark) {
      // 星火近似：按 Unicode 码点计数，更贴近其中文 token 统计
      return Array.from(text).length;
    }
    return Math.ceil(text.length / 4);
  };
  const estimatePromptTokens = (msgs: any[], isSpark: boolean): number => {
    try {
      return msgs.reduce((acc: number, m: any) => {
        if (!m) return acc;
        if (typeof m.content === 'string') return acc + estimateTokens(m.content, isSpark);
        if (Array.isArray(m.content)) {
          const text = m.content.filter((p: any) => p?.type === 'text').map((p: any) => p.text || '').join('');
          return acc + estimateTokens(text, isSpark);
        }
        return acc;
      }, 0);
    } catch {
      return 0;
    }
  };

  try {
    // 合并附件为多模态富内容（image -> image_url base64；文本/文档 -> 追加文本），并保留原始user文本
    let finalMessages = messages.slice();
    if (attachments && attachments.length > 0) {
      const { buildAttachmentParts } = await import('../src/services/attachments');
      const lastUserIdx = [...finalMessages].reverse().findIndex((m: any) => m.role === 'user');
      if (lastUserIdx >= 0) {
        const idx = finalMessages.length - 1 - lastUserIdx;
        const base = finalMessages[idx];
        const parts: any[] = [];
        if (typeof base.content === 'string' && base.content) {
          parts.push({ type: 'text', text: base.content });
        }
        for (const att of attachments) {
          const built = await buildAttachmentParts(att as any);
          parts.push(...built);
        }
        finalMessages[idx] = { role: 'user', content: parts };
      }
    }

    // 过滤空消息以避免400错误
    finalMessages = finalMessages.filter((msg: any) => {
      if (typeof msg.content === 'string') {
        return msg.content.trim() !== '';
      } else if (Array.isArray(msg.content)) {
        return msg.content.length > 0;
      }
      return msg.content != null;
    });



    // OpenAI SDK client with custom base & headers
    let baseURL = provider.baseUrl.replace(/\/$/, '');
    const defaultHeaders: Record<string, string> = {} as any;
    let finalModel = model;
    
    // 零一万物特殊处理：确保使用正确的API端点
    if (/lingyiwanwu\.com/i.test(baseURL)) {
      baseURL = baseURL + '/v1';
      defaultHeaders['User-Agent'] = 'ChatLLM/1.0';
    }
    
    // 阿里云百炼特殊处理：使用OpenAI兼容端点
    if (/dashscope\.aliyuncs\.com/i.test(baseURL) || provider.name.toLowerCase().includes('aliyun') || provider.name.toLowerCase().includes('百炼')) {
      baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
      defaultHeaders['User-Agent'] = 'llmchat-electron/2.0.0';
      console.log('检测到阿里云百炼，使用OpenAI兼容模式:', baseURL);
    }
    
    // MiniMax特殊处理：使用原生fetch，因为API结构与OpenAI不同
    if (/minimaxi\.com/i.test(baseURL)) {
      
      try {
        const minimaxRequestBody = {
          model: finalModel,
          messages: finalMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: true,
          max_tokens: 4096,
          temperature: 0.7
        };
        
        const response = await fetch(`${baseURL}/text/chatcompletion_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(minimaxRequestBody)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // 处理流式响应
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }
        
    const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                flushDelta(assistantMessageId);
                completionTokens = Math.ceil(fullResponse.length / 4); // 快速估算
                win?.webContents.send('message-usage', { 
                  messageId: assistantMessageId, 
                  usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
                });
                win?.webContents.send('message', { messageId: assistantMessageId, delta: '[DONE]' });
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed?.choices?.[0]?.delta?.content ?? '';
                if (delta) {
                  fullResponse += delta;
                  enqueueDelta(assistantMessageId, delta);
                }
              } catch (e) {
                // 忽略JSON解析错误
              }
            }
          }
        }
        
        return;
      } catch (error: any) {
        console.error('MiniMax native fetch error:', error);
        win?.webContents.send('message', { messageId: assistantMessageId, delta: `MiniMax API调用失败: ${error.message}` });
        return;
      }
    }
    
        // 讯飞星火特殊处理：确保使用正确的API端点
    if (/xf-yun\.com/i.test(baseURL)) {
      // 星火API使用 /v1/chat/completions 端点，无需额外修改baseURL
      defaultHeaders['Content-Type'] = 'application/json';
    }
    
    // Ollama本地模型特殊处理：使用原生fetch，因为API结构与OpenAI略有不同
    if (/localhost:11434/i.test(baseURL) || /ollama/i.test(providerName.toLowerCase())) {
      try {
        // 根据Ollama官方API文档构建请求体
        const ollamaRequestBody = {
          model: finalModel,
          messages: finalMessages.map(msg => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : 
                    Array.isArray(msg.content) ? 
                    msg.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join(' ') : 
                    String(msg.content || '')
          })),
          stream: true,
          // Ollama官方支持的选项参数
          options: {
            temperature: 0.7,        // 创造性控制 (0.0-2.0)
            top_k: 40,               // Top-k采样
            top_p: 0.9,              // Top-p采样
            num_predict: 4096,       // 最大生成tokens数
            repeat_penalty: 1.2,     // 增加重复惩罚，防止循环重复
            seed: -1,                // 随机种子，-1为随机
            stop: ["<file_sep>", "<lend_of_text>", "<end_of_text>", "<|endoftext|>", "</s>"],  // 停止词列表，防止循环
            num_ctx: 2048           // 上下文窗口大小
          },
          // 可选：保持会话状态（如果需要）
          keep_alive: "5m"
        };
        
        const response = await fetch(`${baseURL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey !== 'ollama-local-key' && { 'Authorization': `Bearer ${apiKey}` })
          },
          body: JSON.stringify(ollamaRequestBody)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // 处理流式响应
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }
        
        const decoder = new TextDecoder();
        let buffer = '';
        let totalLength = 0;
        const maxResponseLength = 50000; // 限制最大响应长度，防止无限循环
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed = JSON.parse(line);
                
                // 根据Ollama官方API文档，响应格式为：
                // { "message": { "role": "assistant", "content": "..." }, "done": false }
                const delta = parsed?.message?.content ?? '';
                
                // 检查是否包含停止标记，如果包含则跳过
                const stopTokens = ["<file_sep>", "<lend_of_text>", "<end_of_text>", "<|endoftext|>", "</s>"];
                if (delta && !stopTokens.some(token => delta.includes(token))) {
                  totalLength += delta.length;
                  
                  // 检查响应长度是否超限
                  if (totalLength > maxResponseLength) {
                    console.log('🛑 响应长度超限，强制结束生成:', totalLength);
                    break;
                  }
                  
                  fullResponse += delta;
                  enqueueDelta(assistantMessageId, delta);
                } else if (delta && stopTokens.some(token => delta.includes(token))) {
                  // 遇到停止标记，强制结束
                  console.log('🛑 检测到停止标记，强制结束生成:', delta);
                  break;
                }
                
                // Ollama完成标志和元数据
                if (parsed?.done === true) {
                  flushDelta(assistantMessageId);
                  
                  // Ollama官方提供的准确token计数和其他元数据
                  const evalCount = parsed?.eval_count || 0;  // 实际生成的tokens
                  const promptEvalCount = parsed?.prompt_eval_count || 0; // 提示tokens
                  const totalDuration = parsed?.total_duration || 0; // 总时长(纳秒)
                  const loadDuration = parsed?.load_duration || 0;   // 加载时长(纳秒)
                  
                  // 使用Ollama提供的准确计数，如果没有则使用估算
                  const finalPromptTokens = promptEvalCount > 0 ? promptEvalCount : estimatePromptTokens(finalMessages, false);
                  const finalCompletionTokens = evalCount > 0 ? evalCount : estimateTokens(fullResponse, false);
                  
                  win?.webContents.send('message-usage', { 
                    messageId: assistantMessageId, 
                    usage: { 
                      prompt_tokens: finalPromptTokens, 
                      completion_tokens: finalCompletionTokens, 
                      total_tokens: finalPromptTokens + finalCompletionTokens,
                      // Ollama特有的性能指标
                      eval_duration: parsed?.eval_duration,
                      prompt_eval_duration: parsed?.prompt_eval_duration,
                      total_duration: totalDuration,
                      load_duration: loadDuration
                    }
                  });
                  
                  win?.webContents.send('message', { messageId: assistantMessageId, delta: '[DONE]' });
                  return;
                }
              } catch (e) {
                // 忽略JSON解析错误，但记录详细信息便于调试
                console.warn('Ollama JSON parse error:', { line, error: e });
              }
            }
          }
        }
        
        return;
      } catch (error: any) {
        console.error('Ollama API调用失败:', error);
        win?.webContents.send('message', { messageId: assistantMessageId, delta: `Ollama连接失败: ${error.message}` });
        return;
      }
    }

    
    if (/openrouter\.ai/i.test(baseURL)) {
      defaultHeaders['HTTP-Referer'] = 'https://chatllm.local';
      defaultHeaders['X-Title'] = 'ChatLLM';
    }
    const client = new OpenAI({ apiKey: apiKey!, baseURL, defaultHeaders } as any);

    // 处理OpenRouter联网搜索
    let requestBody: any = {
      model: finalModel,
      messages: finalMessages,
      stream: true,
    };

    

    // 为讯飞星火添加简单的模型身份识别信息（避免阻塞）
    if (/xf-yun\.com/i.test(baseURL) || provider?.name.toLowerCase().includes('spark')) {
      // 根据模型ID确定正确的身份信息
      const modelIdentityMap: Record<string, string> = {
        'general': 'Spark X1',
        'general-batch': 'Spark X1-批处理',
        'lite': 'Spark Lite', 
        'generalv3': 'Spark Pro',
        'pro-128k': 'Spark Pro-128K',
        // 'generalv2': 'Spark Max',
        'max-32k': 'Spark Max-32K',
        'generalv3.5': 'Spark4.0 Ultra'
      };
      
      const modelIdentity = modelIdentityMap[finalModel] || 'Spark';
      
      // 只有在没有现有系统消息时才添加身份消息
      const hasSystemMessage = finalMessages.some(msg => msg.role === 'system');
      if (!hasSystemMessage) {
        finalMessages.unshift({
          role: 'system',
          content: `你是讯飞星火${modelIdentity}。`
        });
        requestBody.messages = finalMessages;
      }
    }

    // 如果启用了联网搜索
    if (webSearchEnabled) {
      if (/openrouter\.ai/i.test(baseURL)) {
        // OpenRouter: 使用:online后缀
        if (!model.includes(':online')) {
          finalModel = `${model}:online`;
          requestBody.model = finalModel;
        }
        
        // OpenRouter: 使用web_search_options参数
        if (webSearchOptions) {
          requestBody.web_search_options = {
            search_context_size: webSearchOptions.search_context_size || 'medium',
            max_results: webSearchOptions.max_results,
            timeout_sec: webSearchOptions.timeout_sec,
            retry: webSearchOptions.retry,
            concurrency: webSearchOptions.concurrency,
            weights: webSearchOptions.weights
          };
        }
      } else if (/moonshot/i.test(baseURL) || /kimi/i.test(baseURL)) {
        // Moonshot: 使用官方的enabledTools参数
        requestBody.enabledTools = {
          search: true
        };
      } else if (/bigmodel\.cn/i.test(baseURL) || provider?.name.toLowerCase().includes('zhipu')) {
        // 智谱AI: 需要先调用搜索API，然后将结果注入对话
        requestBody._needWebSearch = true;
      } else if (/302\.ai/i.test(baseURL) || provider?.name.toLowerCase().includes('302ai')) {
        // 302AI: 使用web-search参数
        requestBody['web-search'] = true;
        
        // 302AI: 支持搜索服务提供商选择
        const weights = webSearchOptions?.weights || {};
        const ranked = [
          { key: 'exa', v: Number(weights.exa || 0) },
          { key: 'tavily', v: Number(weights.tavily || 0) },
          { key: 'search1api', v: Number(weights.google || 0) + Number(weights.bing || 0) + Number(weights.duck || 0) },
        ].sort((a,b)=>b.v-a.v);
        requestBody['search-service'] = (ranked[0].v>0 ? ranked[0].key : 'search1api');
        // 302AI: 设置搜索结果数量
        if (webSearchOptions?.max_results) requestBody['search-results'] = webSearchOptions.max_results;
      } else if (/xf-yun\.com/i.test(baseURL) || provider?.name.toLowerCase().includes('spark')) {
        // 讯飞星火: 使用内置搜索工具
        
        // 只有Pro、Max、4.0Ultra版本支持工具调用
        // 包括带有pro、max、ultra字样的模型如pro-128k、max-32k
        const supportsTools = finalModel.includes('generalv3') || // Pro/Ultra家族
                            /*finalModel.includes('generalv2') ||*/ // Max 系列暂不支持
                            finalModel.includes('generalv3.5') || // 4.0Ultra
                            finalModel.includes('pro') || // pro-128k等
                            finalModel.includes('max') || // max-32k等
                            finalModel.includes('ultra'); // ultra系列
        
        if (supportsTools) {
          // 星火使用tools参数来启用搜索工具
          requestBody.tools = [
            {
              type: "function",
              function: {
                name: "search",
                description: "搜索互联网信息",
                parameters: {
                  type: "object", 
                  properties: {
                    query: {
                      type: "string",
                      description: "搜索关键词"
                    }
                  },
                  required: ["query"]
                }
              }
            }
          ];
          // 自动选择工具调用
          requestBody.tool_choice = "auto";
        }
      }
    }

    // 处理智谱AI的联网搜索（快速异步处理）
    if (requestBody._needWebSearch) {
      // 提取搜索查询
      const lastUserMessage = finalMessages.filter(m => m.role === 'user').pop();
      let searchQuery = '';
      
      if (typeof lastUserMessage?.content === 'string') {
        searchQuery = lastUserMessage.content;
      } else if (Array.isArray(lastUserMessage?.content)) {
        const textParts = lastUserMessage.content.filter((part: any) => part.type === 'text');
        searchQuery = textParts.map((part: any) => part.text).join(' ');
      }
      
      // 异步执行搜索，设置短超时避免阻塞 - 打包后增强版本
      if (searchQuery) {
        setImmediate(() => {
          const timeoutMs = Math.max(1000, Math.min(60000, Number(webSearchOptions?.timeout_sec || 10) * 1000));
          const maxRetry = Math.max(0, Math.min(5, Number(webSearchOptions?.retry || 1)));
          const doOnce = () => Promise.race([
            fetch('https://open.bigmodel.cn/api/paas/v4/web_search', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                search_query: searchQuery,
                search_engine: 'search_std',
                search_intent: false
              }),
              signal: AbortSignal.timeout(timeoutMs)
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
          ]);
          const run = async () => {
            let attempt = 0;
            while (attempt <= maxRetry) {
              try {
                const response: any = await doOnce();
                return response;
              } catch (e) {
                attempt += 1;
                if (attempt > maxRetry) throw e;
              }
            }
          };
          run().then(async (response: any) => {
            try {
              if (response.ok) {
                const searchData = await response.json();
                if (searchData.search_result && searchData.search_result.length > 0) {
                  const zhipuAnnotations = searchData.search_result.map((result: any) => ({
                    type: 'url_citation',
                    url_citation: {
                      url: result.link || '',
                      title: result.title || '',
                      content: result.content || '',
                      start_index: 0,
                      end_index: 0
                    }
                  }));
                  
                  win?.webContents.send('message-annotations', { 
                    messageId: assistantMessageId,
                    annotations: zhipuAnnotations
                  });
                }
              }
            } catch (searchError) {
              // 打包后的搜索错误保护
              console.warn('Search annotation failed:', searchError);
            }
          }).catch(() => {
            // 搜索失败或超时，忽略
          });
        });
      }
      
      // 立即移除临时标记，不阻塞对话
      delete requestBody._needWebSearch;
    }


    
    const stream = await client.chat.completions.create(requestBody);
    
    let searchAnnotations: any[] = [];

    for await (const chunk of stream as any) {
      const choice = chunk?.choices?.[0];
      
      // 处理多种可能的内容源（兼容不同提供商的流式实现）
      let delta = '';
      
      // 1) 标准流式内容
      if (choice?.delta?.content) {
        delta = choice.delta.content;
      }
      // 2) 一些服务商在每个chunk里返回完整message.content，我们做差量提取
      else if (choice?.message?.content) {
        const whole = String(choice.message.content || '');
        // 如果whole比当前累计内容长，追加新增部分；否则回退为整段（避免卡死）
        if (whole.length > fullResponse.length && whole.startsWith(fullResponse)) {
          delta = whole.slice(fullResponse.length);
        } else if (!fullResponse) {
          // 第一次直接整段输出
          delta = whole;
        } else {
          // 内容未增长，忽略
          delta = '';
        }
      }
      // 3) 工具调用结果中的内容（讯飞星火等）
      else if (choice?.delta?.tool_calls || choice?.message?.tool_calls) {
        const toolCalls = choice?.delta?.tool_calls || choice?.message?.tool_calls || [];
        for (const toolCall of toolCalls) {
          if (toolCall.function?.name === 'search' && toolCall.function?.arguments) {
            try {
              const searchArgs = JSON.parse(toolCall.function.arguments);
              if (searchArgs.response || searchArgs.answer || searchArgs.content) {
                delta = searchArgs.response || searchArgs.answer || searchArgs.content;
                break;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      
      if (delta) {
        fullResponse += delta;
        enqueueDelta(assistantMessageId, delta);
      }
      
      // OpenRouter: 检查annotations
      if (choice?.message?.annotations) {
        searchAnnotations = choice.message.annotations;
      }
      
      // 处理搜索注释结果（异步处理避免阻塞主线程）
      if (choice?.delta?.tool_calls || choice?.message?.tool_calls) {
        const toolCalls = choice?.delta?.tool_calls || choice?.message?.tool_calls || [];
        
        // 异步处理搜索注释，避免阻塞消息流
        setImmediate(() => {
          for (const toolCall of toolCalls) {
            const functionName = toolCall.function?.name;
            
            // 检查是否为搜索工具调用并且有注释结果
            if (functionName === 'search' || functionName === 'web_search') {
              Promise.resolve().then(() => {
                try {
                  // 处理搜索结果格式
                  let searchData: any = {};
                  if (toolCall.function?.arguments) {
                    searchData = JSON.parse(toolCall.function.arguments);
                  }
                  
                  // 检查搜索引用结果（不是内容，是引用链接）
                  let results = searchData.results || searchData.search_results || searchData.web_results || searchData.citations || [];
                  
                  if (Array.isArray(results) && results.length > 0) {
                    // 转换搜索结果到统一格式（批量处理）
                    const annotations = results.map((result: any, index: number) => ({
                      type: 'url_citation',
                      url_citation: {
                        url: result.url || result.link || result.href || '',
                        title: result.title || result.name || result.snippet || `搜索结果 ${index + 1}`,
                        content: result.content || result.snippet || result.description || result.text || result.summary || '',
                        start_index: 0,
                        end_index: 0
                      }
                    }));
                    
                    // 异步发送搜索注释，不阻塞消息流
                    win?.webContents.send('message-annotations', { 
                      messageId: assistantMessageId,
                      annotations: annotations
                    });
                  }
                } catch (e) {
                  // 忽略JSON解析错误
                  console.warn('Tool call search annotation processing failed:', e);
                }
              }).catch(() => {
                // 搜索注释处理失败，忽略
              });
            }
          }
        });
      }
    }

        // 如果有搜索注释，异步发送给前端避免阻塞
    if (searchAnnotations.length > 0) {
      setImmediate(() => {
        win?.webContents.send('message-annotations', { 
          messageId: assistantMessageId,
          annotations: searchAnnotations
        });
      });
    }

    // done - flush buffered deltas, then provider-specific token estimation
    flushDelta(assistantMessageId);
    const isSparkProvider = /xf-yun\.com/i.test(baseURL) || (provider?.name || '').toLowerCase().includes('spark');
    // 重新估算：prompt 按提供商策略估算，completion 基于最终响应全文
    promptTokens = estimatePromptTokens(finalMessages, isSparkProvider);
    completionTokens = estimateTokens(fullResponse, isSparkProvider);
    win?.webContents.send('message-usage', { messageId: assistantMessageId, usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens } });
    win?.webContents.send('message', { messageId: assistantMessageId, delta: '[DONE]' });

  } catch (error: any) {
    console.error('Failed to send message:', error);
    const msg = String(error?.message || '');
    
    if (/image input not supported/i.test(msg)) {
      const tip = '当前模型不支持图像输入，请切换到支持多模态的模型（如 GPT-4o/Claude 3.5/GLM-4V/DeepSeek-VL 等），或移除图片后重试。';
      win?.webContents.send('message', { messageId: assistantMessageId, delta: tip });
      win?.webContents.send('message', { messageId: assistantMessageId, delta: '[DONE]' });
      return;
    }

    if (/requiring a key to access this model/i.test(msg)) {
      const tip = '此模型需要额外的API密钥访问权限。请在 https://openrouter.ai/settings/integrations 添加相应的API密钥，或选择其他可用的模型。';
      win?.webContents.send('message', { messageId: assistantMessageId, delta: tip });
      win?.webContents.send('message', { messageId: assistantMessageId, delta: '[DONE]' });
      return;
    }
    
    if (/requires more credits.*max_tokens/i.test(msg)) {
      const tip = '账户余额不足，无法处理如此长的请求。请访问 https://openrouter.ai/settings/credits 充值，或尝试发送更短的消息。';
      win?.webContents.send('message', { messageId: assistantMessageId, delta: tip });
      win?.webContents.send('message', { messageId: assistantMessageId, delta: '[DONE]' });
      return;
    }


    
    win?.webContents.send('message', { messageId: assistantMessageId, delta: `error: ${error.message}` });
  }
});

app.on('will-quit', () => {
  try { globalShortcut.unregisterAll(); } catch {}
});

// 兜底：渲染进程请求打开DevTools
try {
  ipcMain.handle('devtools-toggle', () => {
    if (!win) return;
    try {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools({ mode: 'detach' });
      }
    } catch {}
  });
} catch {}
