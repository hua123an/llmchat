import { ElMessage } from 'element-plus';
import { t } from '../locales';

// 快捷键配置接口
interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  context?: string; // 上下文限制
}

// 快捷键组合
// interface KeyCombination {
//   key: string;
//   modifiers: string[];
// }

export class KeyboardManager {
  private static instance: KeyboardManager;
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private isEnabled = true;
  private helpVisible = false;

  public static getInstance(): KeyboardManager {
    if (!KeyboardManager.instance) {
      KeyboardManager.instance = new KeyboardManager();
    }
    return KeyboardManager.instance;
  }

  private constructor() {
    this.setupEventListeners();
    this.registerDefaultShortcuts();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    
    // 防止在输入框中触发快捷键
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
  }

  /**
   * 处理键盘按下事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    // 检查是否在输入元素中
    if (this.isInInputElement(event.target as Element)) {
      // 只处理特殊的全局快捷键
      if (this.isGlobalShortcut(event)) {
        this.processShortcut(event);
      }
      return;
    }

    this.processShortcut(event);
  }

  /**
   * 处理快捷键
   */
  private processShortcut(event: KeyboardEvent): void {
    const combination = this.createKeyCombination(event);
    const shortcut = this.shortcuts.get(combination);

    if (shortcut) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        shortcut.action();
      } catch (error) {
        console.error('Shortcut action failed:', error);
        ElMessage.error(t('errors.unknownError'));
      }
    }
  }

  /**
   * 创建按键组合字符串
   */
  private createKeyCombination(event: KeyboardEvent): string {
    const modifiers: string[] = [];
    
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    if (event.metaKey) modifiers.push('meta');
    
    const key = event.key.toLowerCase();
    return [...modifiers, key].join('+');
  }

  /**
   * 检查是否在输入元素中
   */
  private isInInputElement(target: Element): boolean {
    if (!target) return false;
    
    const tagName = target.tagName.toLowerCase();
    const inputTypes = ['input', 'textarea', 'select'];
    
    if (inputTypes.includes(tagName)) return true;
    
    // 检查contenteditable
    if (target.getAttribute('contenteditable') === 'true') return true;
    
    // 检查父元素
    const parent = target.closest('input, textarea, select, [contenteditable="true"]');
    return !!parent;
  }

  /**
   * 检查是否为全局快捷键
   */
  private isGlobalShortcut(event: KeyboardEvent): boolean {
    const combination = this.createKeyCombination(event);
    const globalShortcuts = [
      'ctrl+shift+t', // 主题切换
      'f1', // 帮助
      'escape', // 取消
      'ctrl+shift+k', // 快捷键帮助
      // 工作空间切换（全局生效）
      'ctrl+1', 'meta+1',
      'ctrl+2', 'meta+2',
      'ctrl+3', 'meta+3',
    ];
    
    return globalShortcuts.includes(combination);
  }

  /**
   * 注册快捷键
   */
  public registerShortcut(config: ShortcutConfig): void {
    const combination = this.createCombinationString(config);
    this.shortcuts.set(combination, config);
  }

  /**
   * 创建组合字符串
   */
  private createCombinationString(config: ShortcutConfig): string {
    const modifiers: string[] = [];
    
    if (config.ctrlKey) modifiers.push('ctrl');
    if (config.shiftKey) modifiers.push('shift');
    if (config.altKey) modifiers.push('alt');
    if (config.metaKey) modifiers.push('meta');
    
    return [...modifiers, config.key.toLowerCase()].join('+');
  }

  /**
   * 注销快捷键
   */
  public unregisterShortcut(config: ShortcutConfig): void {
    const combination = this.createCombinationString(config);
    this.shortcuts.delete(combination);
  }

  /**
   * 注册默认快捷键
   */
  private registerDefaultShortcuts(): void {
    // 打开/关闭 知识库悬浮窗 Ctrl+K
    this.registerShortcut({
      key: 'k',
      ctrlKey: true,
      description: '打开/关闭知识库',
      action: () => {
        const store = (window as any).__CHAT_STORE__;
        if (store && typeof store.toggleKnowledge === 'function') {
          store.toggleKnowledge();
        } else if (store) {
          store.isKnowledgeOpen = !store.isKnowledgeOpen;
        }
      }
    });
    // 新建聊天
    this.registerShortcut({
      key: 'n',
      ctrlKey: true,
      description: t('shortcuts.newChat'),
      action: () => {
        const store = (window as any).__CHAT_STORE__;
        if (store) {
          store.addNewChat();
          ElMessage.success(t('notifications.newChatCreated'));
        }
      }
    });

    // 保存聊天
    this.registerShortcut({
      key: 's',
      ctrlKey: true,
      description: t('shortcuts.saveChat'),
      action: () => {
        const store = (window as any).__CHAT_STORE__;
        if (store) {
          store.persistState();
          ElMessage.success(t('notifications.chatSaved'));
        }
      }
    });

    // 搜索
    this.registerShortcut({
      key: 'f',
      ctrlKey: true,
      description: t('shortcuts.search'),
      action: () => {
        const searchInput = document.querySelector('.search-input input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });

    // 关闭对话框
    this.registerShortcut({
      key: 'escape',
      description: t('shortcuts.closeDialog'),
      action: () => {
        // 查找打开的对话框并关闭
        const dialogs = document.querySelectorAll('.el-dialog__headerbtn');
        if (dialogs.length > 0) {
          (dialogs[dialogs.length - 1] as HTMLElement).click();
        }
      }
    });

    // 主题切换
    this.registerShortcut({
      key: 't',
      ctrlKey: true,
      shiftKey: true,
      description: t('shortcuts.toggleTheme'),
      action: () => {
        const themeManager = (window as any).__THEME_MANAGER__;
        if (themeManager) {
          themeManager.toggleTheme();
        }
      }
    });

    // 提示词库
    this.registerShortcut({
      key: 'p',
      ctrlKey: true,
      shiftKey: true,
      description: t('shortcuts.openAgentSelector'),
      action: () => {
        const store = (window as any).__CHAT_STORE__;
        if (store) {
          store.openAgentSelector();
        }
      }
    });

    // 发送消息 (Ctrl+Enter)
    this.registerShortcut({
      key: 'enter',
      ctrlKey: true,
      description: t('shortcuts.sendMessage'),
      action: () => {
        const sendButton = document.querySelector('.send-button') as HTMLButtonElement;
        if (sendButton && !sendButton.disabled) {
          sendButton.click();
        }
      }
    });

    // 快捷键帮助
    this.registerShortcut({
      key: 'f1',
      description: t('shortcuts.help'),
      action: () => {
        this.showHelp();
      }
    });

    // 或者 Ctrl+Shift+K
    this.registerShortcut({
      key: 'k',
      ctrlKey: true,
      shiftKey: true,
      description: t('shortcuts.help'),
      action: () => {
        this.showHelp();
      }
    });

    // 切换数据统计悬浮窗 Ctrl+Shift+Y
    this.registerShortcut({
      key: 'y',
      ctrlKey: true,
      shiftKey: true,
      description: t('shortcuts.toggleStats'),
      action: () => {
        const store = (window as any).__CHAT_STORE__;
        if (store && typeof store.toggleStats === 'function') {
          store.toggleStats();
        }
      }
    });

    // 切换侧边栏
    this.registerShortcut({
      key: 'b',
      ctrlKey: true,
      description: t('shortcuts.toggleSidebar'),
      action: () => {
        // 这里可以添加切换侧边栏的逻辑
        ElMessage.info(t('notifications.sidebarToggleInfo'));
      }
    });

    // 清空当前聊天
    this.registerShortcut({
      key: 'delete',
      ctrlKey: true,
      shiftKey: true,
      description: '清空当前聊天',
      action: () => {
        const store = (window as any).__CHAT_STORE__;
        if (store && store.currentTab) {
          if (confirm('确定要清空当前聊天吗？')) {
            store.currentTab.messages = [];
            store.persistState();
            ElMessage.success('聊天已清空');
          }
        }
      }
    });

    // ===== 工作空间切换快捷键（Cmd/Ctrl + 1/2/3）=====
    const registerSpaceShortcut = (
      numKey: '1' | '2' | '3',
      spaceId: 'ai-assistant' | 'programming' | 'learning',
      description: string
    ) => {
      // Ctrl + Num
      this.registerShortcut({
        key: numKey,
        ctrlKey: true,
      description,
        action: () => {
          const store = (window as any).__CHAT_STORE__;
          if (store && typeof store.switchSpace === 'function') {
            store.switchSpace(spaceId);
          ElMessage.success(description);
          }
        }
      });
      // Cmd + Num (Mac)
      this.registerShortcut({
        key: numKey,
        metaKey: true,
      description,
        action: () => {
          const store = (window as any).__CHAT_STORE__;
          if (store && typeof store.switchSpace === 'function') {
            store.switchSpace(spaceId);
          ElMessage.success(description);
          }
        }
      });
    };

    registerSpaceShortcut('1', 'ai-assistant', '切换到AI助手空间');
    registerSpaceShortcut('2', 'programming', '切换到编程助手空间');
    registerSpaceShortcut('3', 'learning', '切换到学习空间');
  }

  /**
   * 显示快捷键帮助
   */
  public showHelp(): void {
    if (this.helpVisible) return;
    
    this.helpVisible = true;
    
    const shortcuts = Array.from(this.shortcuts.entries()).map(([combination, config]) => ({
      combination: this.formatCombination(combination),
      description: config.description
    }));

    // 创建帮助对话框
    this.createHelpDialog(shortcuts);
  }

  /**
   * 格式化快捷键组合显示
   */
  private formatCombination(combination: string): string {
    const parts = combination.split('+');
    const formatted = parts.map(part => {
      switch (part) {
        case 'ctrl':
          return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
        case 'shift':
          return 'Shift';
        case 'alt':
          return navigator.platform.includes('Mac') ? '⌥' : 'Alt';
        case 'meta':
          return '⌘';
        case 'enter':
          return 'Enter';
        case 'escape':
          return 'Esc';
        case 'delete':
          return 'Del';
        default:
          return part.toUpperCase();
      }
    });
    
    return formatted.join(' + ');
  }

  /**
   * 创建帮助对话框
   */
  private createHelpDialog(shortcuts: Array<{ combination: string; description: string }>): void {
    const dialog = document.createElement('div');
    dialog.className = 'keyboard-help-dialog';
    dialog.innerHTML = `
      <div class="help-overlay">
        <div class="help-content">
          <div class="help-header">
            <h3>键盘快捷键</h3>
            <button class="help-close" onclick="this.closest('.keyboard-help-dialog').remove()">×</button>
          </div>
          <div class="help-body">
            <div class="shortcuts-grid">
              ${shortcuts.map(shortcut => `
                <div class="shortcut-item">
                  <span class="shortcut-keys">${shortcut.combination}</span>
                  <span class="shortcut-desc">${shortcut.description}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="help-footer">
            <p>按 <kbd>Esc</kbd> 或点击外部区域关闭此帮助</p>
          </div>
        </div>
      </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .keyboard-help-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .help-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .help-content {
        background: var(--bg-primary);
        border-radius: var(--border-radius-large);
        box-shadow: var(--shadow-light);
        max-width: 600px;
        max-height: 80vh;
        overflow: auto;
        margin: 20px;
        border: 1px solid var(--border-light);
      }
      
      .help-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: none;
        background: linear-gradient(135deg, var(--primary-color) 0%, #66b1ff 100%);
        color: white;
        border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
      }
      
      .help-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .help-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s;
      }
      
      .help-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .help-body {
        padding: 24px;
      }
      
      .shortcuts-grid {
        display: grid;
        gap: 12px;
      }
      
      .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--fill-lighter);
        border-radius: var(--border-radius);
        border: 1px solid var(--border-lighter);
      }
      
      .shortcut-keys {
        font-family: 'Monaco', 'Consolas', monospace;
        font-weight: 600;
        color: var(--primary-color);
        background: var(--primary-light);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      }
      
      .shortcut-desc {
        color: var(--text-primary);
        font-size: 14px;
      }
      
      .help-footer {
        padding: 16px 24px;
        border-top: none;
        background: var(--fill-light);
        text-align: center;
        border-radius: 0 0 var(--border-radius-large) var(--border-radius-large);
      }
      
      .help-footer p {
        margin: 0;
        color: var(--text-secondary);
        font-size: 12px;
      }
      
      .help-footer kbd {
        background: var(--fill-lighter);
        border: 1px solid var(--border-light);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: inherit;
        font-size: 11px;
      }
    `;

    dialog.appendChild(style);
    document.body.appendChild(dialog);

    // 点击外部关闭
    dialog.querySelector('.help-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        dialog.remove();
        this.helpVisible = false;
      }
    });

    // ESC关闭
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dialog.remove();
        this.helpVisible = false;
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);

    // 关闭按钮
    dialog.querySelector('.help-close')?.addEventListener('click', () => {
      dialog.remove();
      this.helpVisible = false;
    });
  }

  /**
   * 启用/禁用快捷键
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 获取所有快捷键
   */
  public getAllShortcuts(): Array<{ combination: string; description: string }> {
    return Array.from(this.shortcuts.entries()).map(([combination, config]) => ({
      combination: this.formatCombination(combination),
      description: config.description
    }));
  }

  /**
   * 清除所有快捷键
   */
  public clearShortcuts(): void {
    this.shortcuts.clear();
  }

  private handleFocusIn(_event: FocusEvent): void {
    // 当焦点进入输入元素时，可以做一些处理
  }

  private handleFocusOut(_event: FocusEvent): void {
    // 当焦点离开输入元素时，可以做一些处理
  }
}

// 导出单例实例
export const keyboardManager = KeyboardManager.getInstance();

// 全局暴露给快捷键使用
(window as any).__KEYBOARD_MANAGER__ = keyboardManager;

export default KeyboardManager;