import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createRouter, createWebHashHistory } from 'vue-router';

// 主应用组件
import RefactoredApp from './RefactoredApp.vue';

// 样式
import './style.css';
import './styles/variables.css';
import './styles/theme.css';
import './styles/layout.css';
import './styles/chat.css';

// 路由配置
import { routes } from './router';

// 服务和类型
import { registerServices, validateServices } from './services';
import type { App } from 'vue';

// 错误处理
import { handleVueError, handleUnhandledRejection } from './utils/errorHandler';

// 主题管理
import { initializeTheme } from './utils/themeManager';

// 键盘管理
import { initializeKeyboardManager } from './utils/keyboardManager';

// 多语言支持
import i18n from './i18n';

// 应用配置
interface AppConfig {
  enableDevtools: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorReporting: boolean;
  apiTimeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const config: AppConfig = {
  enableDevtools: import.meta.env.DEV,
  enablePerformanceMonitoring: true,
  enableErrorReporting: true,
  apiTimeout: 30000,
  logLevel: import.meta.env.DEV ? 'debug' : 'info',
};

// 创建Vue应用实例
function createVueApp(): App {
  const app = createApp(RefactoredApp);

  // 全局错误处理
  app.config.errorHandler = handleVueError;
  
  // 性能警告（仅开发环境）
  if (import.meta.env.DEV) {
    app.config.performance = true;
  }

  return app;
}

// 创建路由实例
function createAppRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes,
  });
}

// 安装插件
function installPlugins(app: App) {
  // Pinia状态管理
  const pinia = createPinia();
  
  // 开发环境下启用Pinia调试
  if (import.meta.env.DEV) {
    pinia.use(({ store }) => {
      store.$subscribe((mutation, state) => {
        console.debug(`[Pinia] ${mutation.storeId}:`, mutation);
      });
    });
  }
  
  app.use(pinia);

  // Vue Router
  const router = createAppRouter();
  app.use(router);

  // 国际化
  app.use(i18n);

  return { pinia, router, i18n };
}

// 注册全局组件
function registerGlobalComponents(app: App) {
  // 这里可以注册经常使用的全局组件
  // app.component('GlobalComponent', GlobalComponent);
}

// 设置全局属性
function setupGlobalProperties(app: App) {
  // 全局配置
  app.config.globalProperties.$config = config;
  
  // 工具函数
  app.config.globalProperties.$log = {
    debug: (...args: any[]) => config.logLevel === 'debug' && console.debug(...args),
    info: (...args: any[]) => ['debug', 'info'].includes(config.logLevel) && console.info(...args),
    warn: (...args: any[]) => ['debug', 'info', 'warn'].includes(config.logLevel) && console.warn(...args),
    error: (...args: any[]) => console.error(...args),
  };
}

// 初始化应用服务
async function initializeServices(): Promise<void> {
  try {
    console.log('🚀 正在初始化应用服务...');
    
    // 注册依赖注入服务
    registerServices();
    
    // 验证服务注册
    if (!validateServices()) {
      throw new Error('服务验证失败');
    }
    
    console.log('✅ 服务初始化完成');
  } catch (error) {
    console.error('❌ 服务初始化失败:', error);
    throw error;
  }
}

// 初始化应用功能
async function initializeFeatures(): Promise<void> {
  try {
    console.log('🎨 正在初始化应用功能...');
    
    // 初始化主题
    await initializeTheme();
    
    // 初始化键盘快捷键
    initializeKeyboardManager();
    
    console.log('✅ 功能初始化完成');
  } catch (error) {
    console.error('❌ 功能初始化失败:', error);
    // 功能初始化失败不应该阻止应用启动
  }
}

// 设置全局事件监听
function setupGlobalEventListeners(): void {
  // 未处理的Promise拒绝
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  
  // 网络状态监控
  window.addEventListener('online', () => {
    console.info('🌐 网络连接已恢复');
  });
  
  window.addEventListener('offline', () => {
    console.warn('🌐 网络连接已断开');
  });
  
  // 可见性状态监控
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.debug('👁️ 应用已可见');
    } else {
      console.debug('👁️ 应用已隐藏');
    }
  });
}

// 性能监控
function setupPerformanceMonitoring(): void {
  if (!config.enablePerformanceMonitoring) return;
  
  // 页面加载性能
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      console.group('📊 性能指标');
      console.log('DOM加载时间:', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart, 'ms');
      console.log('页面加载时间:', navigation.loadEventEnd - navigation.loadEventStart, 'ms');
      
      paintEntries.forEach(entry => {
        console.log(`${entry.name}:`, entry.startTime, 'ms');
      });
      
      console.groupEnd();
    }, 0);
  });
}

// 开发环境特定设置
function setupDevelopmentFeatures(): void {
  if (!import.meta.env.DEV) return;
  
  // 开发工具快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+I 打开开发者工具
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      (window as any).electronAPI?.openDevTools?.();
    }
    
    // Ctrl+R 刷新页面
    if (e.ctrlKey && e.key === 'r') {
      window.location.reload();
    }
  });
  
  // 性能监控
  setupPerformanceMonitoring();
  
  console.log('🔧 开发环境功能已启用');
}

// 主启动函数
async function main(): Promise<void> {
  try {
    console.log('🚀 正在启动 LLMChat 应用...');
    
    // 创建Vue应用
    const app = createVueApp();
    
    // 安装插件
    const { router } = installPlugins(app);
    
    // 注册全局组件
    registerGlobalComponents(app);
    
    // 设置全局属性
    setupGlobalProperties(app);
    
    // 初始化服务
    await initializeServices();
    
    // 初始化功能
    await initializeFeatures();
    
    // 设置全局事件监听
    setupGlobalEventListeners();
    
    // 开发环境设置
    setupDevelopmentFeatures();
    
    // 等待路由准备就绪
    await router.isReady();
    
    // 挂载应用
    app.mount('#app');
    
    console.log('✅ LLMChat 应用启动成功');
    
  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    
    // 显示错误页面
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: system-ui, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <h1 style="color: #e74c3c; margin-bottom: 16px;">应用启动失败</h1>
        <p style="color: #666; margin-bottom: 20px;">抱歉，应用无法正常启动。请尝试刷新页面或联系技术支持。</p>
        <pre style="
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          color: #333;
          max-width: 600px;
          overflow: auto;
          text-align: left;
        ">${error instanceof Error ? error.stack : String(error)}</pre>
        <button onclick="window.location.reload()" style="
          margin-top: 20px;
          padding: 12px 24px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">刷新页面</button>
      </div>
    `;
  }
}

// 启动应用
main().catch(console.error);

// 导出配置供其他模块使用
export { config };
export type { AppConfig };
