import { ref, watch } from 'vue';

// 主题类型
export type Theme = 'light' | 'dark' | 'auto';

// 主题状态
const currentTheme = ref<Theme>('auto');
const isDarkMode = ref(false);

// CSS变量定义


export class ThemeManager {
  private static instance: ThemeManager;

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private constructor() {
    this.initializeTheme();
    this.setupWatchers();
    this.setupSystemThemeListener();
  }

  /**
   * 初始化主题
   */
  private initializeTheme(): void {
    // 从localStorage读取保存的主题设置
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
      currentTheme.value = savedTheme;
    }

    // 应用主题
    this.applyTheme();
  }

  /**
   * 设置主题监听器
   */
  private setupWatchers(): void {
    watch(currentTheme, () => {
      this.applyTheme();
      this.saveTheme();
    });
  }

  /**
   * 设置系统主题监听器
   */
  private setupSystemThemeListener(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (currentTheme.value === 'auto') {
        isDarkMode.value = e.matches;
        this.applyCSSVariables();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    // 初始检查
    if (currentTheme.value === 'auto') {
      isDarkMode.value = mediaQuery.matches;
    }
  }

  /**
   * 应用主题
   */
  private applyTheme(): void {
    switch (currentTheme.value) {
      case 'light':
        isDarkMode.value = false;
        break;
      case 'dark':
        isDarkMode.value = true;
        break;
      case 'auto':
        isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
        break;
    }

    this.applyCSSVariables();
    this.updateThemeAttribute();
  }

  /**
   * 应用CSS变量
   */
  private applyCSSVariables(): void {
    // This function is now empty as CSS variables are managed by theme.css
  }

  /**
   * 更新主题属性
   */
  private updateThemeAttribute(): void {
    document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light');
  }

  /**
   * 保存主题设置
   */
  private saveTheme(): void {
    localStorage.setItem('theme', currentTheme.value);
  }

  /**
   * 设置主题
   */
  public setTheme(theme: Theme): void {
    currentTheme.value = theme;
  }

  /**
   * 获取当前主题
   */
  public getCurrentTheme(): Theme {
    return currentTheme.value;
  }

  /**
   * 是否为暗色模式
   */
  public isDark(): boolean {
    return isDarkMode.value;
  }

  /**
   * 切换主题
   */
  public toggleTheme(): void {
    if (currentTheme.value === 'auto') {
      // 从auto切换到与当前显示相反的主题
      currentTheme.value = isDarkMode.value ? 'light' : 'dark';
    } else if (currentTheme.value === 'light') {
      currentTheme.value = 'dark';
    } else {
      currentTheme.value = 'light';
    }
  }

  /**
   * 获取主题状态（响应式）
   */
  public getThemeState() {
    return {
      currentTheme: currentTheme,
      isDarkMode: isDarkMode
    };
  }

  /**
   * 获取主题选项
   */
  public getThemeOptions() {
    // 提供 labelKey 以便在组件中通过 i18n 渲染
    return [
      { value: 'light', label: '浅色模式', labelKey: 'theme.light', icon: '☀️' },
      { value: 'dark', label: '深色模式', labelKey: 'theme.dark', icon: '🌙' },
      { value: 'auto', label: '跟随系统', labelKey: 'theme.auto', icon: '🔄' }
    ];
  }

  /**
   * 预览主题（不保存）
   */
  public previewTheme(theme: Theme): void {
    const originalTheme = currentTheme.value;
    currentTheme.value = theme;
    this.applyTheme();
    
    // 3秒后恢复原主题
    setTimeout(() => {
      if (currentTheme.value === theme) {
        currentTheme.value = originalTheme;
        this.applyTheme();
      }
    }, 3000);
  }

  

  /**
   * 检测系统是否支持暗色模式
   */
  public supportsColorScheme(): boolean {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches !== undefined;
  }

  /**
   * 导出主题配置
   */
  public exportThemeConfig() {
    return {
      currentTheme: currentTheme.value,
      isDarkMode: isDarkMode.value,
      lightTheme: undefined,
      darkTheme: undefined,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 导入主题配置
   */
  public importThemeConfig(config: any): boolean {
    try {
      if (config.currentTheme && ['light', 'dark', 'auto'].includes(config.currentTheme)) {
        this.setTheme(config.currentTheme);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import theme config:', error);
      return false;
    }
  }

  /**
   * 公共初始化方法
   */
  public init(): void {
    this.updateThemeAttribute();
  }
}

// 导出单例实例
export const themeManager = ThemeManager.getInstance();

// 导出响应式状态
export const { currentTheme: theme, isDarkMode: isDark } = themeManager.getThemeState();

export default ThemeManager;