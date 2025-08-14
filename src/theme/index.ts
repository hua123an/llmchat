import { reactive, computed, watch } from 'vue';
import { injectable, SERVICE_TOKENS } from '../services/container';

// 主题颜色配置
export interface ThemeColors {
  // 主色调
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryLight: string;
  primaryDark: string;
  
  // 功能颜色
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
  
  // 背景颜色
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgInverse: string;
  bgHover: string;
  bgActive: string;
  bgDisabled: string;
  
  // 文字颜色
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textMuted: string;
  textDisabled: string;
  
  // 边框颜色
  borderColor: string;
  borderHover: string;
  borderActive: string;
  borderFocus: string;
  dividerColor: string;
  
  // 阴影颜色
  shadowColor: string;
  shadowLight: string;
  shadowDark: string;
  
  // 聊天特定颜色
  chatUserBg: string;
  chatAssistantBg: string;
  chatSystemBg: string;
  chatErrorBg: string;
  
  // 代码高亮颜色
  codeBackground: string;
  codeText: string;
  codeKeyword: string;
  codeString: string;
  codeComment: string;
  codeNumber: string;
  codeOperator: string;
}

// 主题字体配置
export interface ThemeFonts {
  family: string;
  monoFamily: string;
  size: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    xxl: string;
    xxxl: string;
  };
  weight: {
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
}

// 主题间距配置
export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  xxxl: string;
}

// 主题圆角配置
export interface ThemeRadius {
  none: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  full: string;
}

// 主题阴影配置
export interface ThemeShadows {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  inner: string;
  none: string;
}

// 主题动画配置
export interface ThemeAnimations {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
    bounce: string;
  };
}

// 完整主题配置
export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  type: 'light' | 'dark' | 'auto';
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  shadows: ThemeShadows;
  animations: ThemeAnimations;
  customCSS?: string;
  preview?: string; // Base64 image or URL
}

// 主题切换动画类型
export type ThemeTransition = 'none' | 'fade' | 'slide' | 'zoom' | 'flip';

// 内置主题
export const BUILT_IN_THEMES: Record<string, ThemeConfig> = {
  light: {
    id: 'light',
    name: '浅色主题',
    description: '经典的浅色主题，适合日间使用',
    type: 'light',
    colors: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryActive: '#1d4ed8',
      primaryLight: '#dbeafe',
      primaryDark: '#1e40af',
      
      success: '#10b981',
      successLight: '#d1fae5',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      error: '#ef4444',
      errorLight: '#fee2e2',
      info: '#06b6d4',
      infoLight: '#cffafe',
      
      bgPrimary: '#ffffff',
      bgSecondary: '#f8fafc',
      bgTertiary: '#f1f5f9',
      bgInverse: '#0f172a',
      bgHover: '#f1f5f9',
      bgActive: '#e2e8f0',
      bgDisabled: '#f8fafc',
      
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#64748b',
      textInverse: '#f8fafc',
      textMuted: '#94a3b8',
      textDisabled: '#cbd5e1',
      
      borderColor: '#e2e8f0',
      borderHover: '#cbd5e1',
      borderActive: '#94a3b8',
      borderFocus: '#3b82f6',
      dividerColor: '#f1f5f9',
      
      shadowColor: 'rgba(15, 23, 42, 0.1)',
      shadowLight: 'rgba(15, 23, 42, 0.05)',
      shadowDark: 'rgba(15, 23, 42, 0.2)',
      
      chatUserBg: '#3b82f6',
      chatAssistantBg: '#f8fafc',
      chatSystemBg: '#fef3c7',
      chatErrorBg: '#fee2e2',
      
      codeBackground: '#f8fafc',
      codeText: '#0f172a',
      codeKeyword: '#7c3aed',
      codeString: '#059669',
      codeComment: '#64748b',
      codeNumber: '#dc2626',
      codeOperator: '#0f172a',
    },
    fonts: {
      family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      monoFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
      size: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        xxl: '1.5rem',
        xxxl: '2rem',
      },
      weight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
        loose: 2,
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem',
      xxxl: '4rem',
    },
    radius: {
      none: '0',
      xs: '0.125rem',
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      xxl: '1rem',
      full: '9999px',
    },
    shadows: {
      xs: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
      sm: '0 1px 3px 0 rgba(15, 23, 42, 0.1), 0 1px 2px 0 rgba(15, 23, 42, 0.06)',
      md: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
      lg: '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
      xl: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
      xxl: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
      inner: 'inset 0 2px 4px 0 rgba(15, 23, 42, 0.06)',
      none: 'none',
    },
    animations: {
      duration: {
        fast: '0.15s',
        normal: '0.3s',
        slow: '0.5s',
      },
      easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  
  dark: {
    id: 'dark',
    name: '深色主题',
    description: '护眼的深色主题，适合夜间使用',
    type: 'dark',
    colors: {
      primary: '#60a5fa',
      primaryHover: '#3b82f6',
      primaryActive: '#2563eb',
      primaryLight: '#1e3a8a',
      primaryDark: '#1d4ed8',
      
      success: '#34d399',
      successLight: '#064e3b',
      warning: '#fbbf24',
      warningLight: '#78350f',
      error: '#f87171',
      errorLight: '#7f1d1d',
      info: '#22d3ee',
      infoLight: '#164e63',
      
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      bgInverse: '#f8fafc',
      bgHover: '#1e293b',
      bgActive: '#334155',
      bgDisabled: '#1e293b',
      
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textTertiary: '#94a3b8',
      textInverse: '#0f172a',
      textMuted: '#64748b',
      textDisabled: '#475569',
      
      borderColor: '#334155',
      borderHover: '#475569',
      borderActive: '#64748b',
      borderFocus: '#60a5fa',
      dividerColor: '#1e293b',
      
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowLight: 'rgba(0, 0, 0, 0.1)',
      shadowDark: 'rgba(0, 0, 0, 0.5)',
      
      chatUserBg: '#3b82f6',
      chatAssistantBg: '#1e293b',
      chatSystemBg: '#78350f',
      chatErrorBg: '#7f1d1d',
      
      codeBackground: '#1e293b',
      codeText: '#f8fafc',
      codeKeyword: '#a78bfa',
      codeString: '#34d399',
      codeComment: '#64748b',
      codeNumber: '#f87171',
      codeOperator: '#f8fafc',
    },
    fonts: {
      family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      monoFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
      size: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        xxl: '1.5rem',
        xxxl: '2rem',
      },
      weight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
        loose: 2,
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      xxl: '3rem',
      xxxl: '4rem',
    },
    radius: {
      none: '0',
      xs: '0.125rem',
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem',
      xxl: '1rem',
      full: '9999px',
    },
    shadows: {
      xs: '0 1px 2px 0 rgba(0, 0, 0, 0.1)',
      sm: '0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 2px 0 rgba(0, 0, 0, 0.12)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
      xxl: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.12)',
      none: 'none',
    },
    animations: {
      duration: {
        fast: '0.15s',
        normal: '0.3s',
        slow: '0.5s',
      },
      easing: {
        linear: 'linear',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
};

// 主题服务类
@injectable(SERVICE_TOKENS.THEME_SERVICE)
export class ThemeService {
  private currentTheme = reactive<ThemeConfig>(BUILT_IN_THEMES.light);
  private customThemes = reactive<Record<string, ThemeConfig>>({});
  private systemPrefersDark = false;
  
  constructor() {
    this.detectSystemTheme();
    this.loadStoredTheme();
    this.watchSystemTheme();
  }
  
  // 获取当前主题
  getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }
  
  // 设置主题
  setTheme(themeId: string, transition: ThemeTransition = 'fade'): void {
    const theme = this.getTheme(themeId);
    if (!theme) {
      console.warn(`Theme "${themeId}" not found`);
      return;
    }
    
    this.applyThemeTransition(transition, () => {
      Object.assign(this.currentTheme, theme);
      this.applyThemeToDOM(theme);
      this.saveThemePreference(themeId);
    });
  }
  
  // 获取主题
  getTheme(themeId: string): ThemeConfig | null {
    return BUILT_IN_THEMES[themeId] || this.customThemes[themeId] || null;
  }
  
  // 获取所有可用主题
  getAvailableThemes(): ThemeConfig[] {
    return [
      ...Object.values(BUILT_IN_THEMES),
      ...Object.values(this.customThemes),
    ];
  }
  
  // 添加自定义主题
  addCustomTheme(theme: ThemeConfig): void {
    this.customThemes[theme.id] = theme;
    this.saveCustomThemes();
  }
  
  // 删除自定义主题
  removeCustomTheme(themeId: string): void {
    if (this.customThemes[themeId]) {
      delete this.customThemes[themeId];
      this.saveCustomThemes();
      
      // 如果删除的是当前主题，切换到默认主题
      if (this.currentTheme.id === themeId) {
        this.setTheme('light');
      }
    }
  }
  
  // 创建主题副本
  duplicateTheme(sourceThemeId: string, newThemeId: string, newName: string): ThemeConfig | null {
    const sourceTheme = this.getTheme(sourceThemeId);
    if (!sourceTheme) return null;
    
    const newTheme: ThemeConfig = {
      ...JSON.parse(JSON.stringify(sourceTheme)),
      id: newThemeId,
      name: newName,
      description: `基于 ${sourceTheme.name} 的自定义主题`,
    };
    
    this.addCustomTheme(newTheme);
    return newTheme;
  }
  
  // 根据系统主题自动切换
  setAutoTheme(): void {
    const themeId = this.systemPrefersDark ? 'dark' : 'light';
    this.setTheme(themeId);
  }
  
  // 检测系统主题偏好
  private detectSystemTheme(): void {
    this.systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  // 监听系统主题变化
  private watchSystemTheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      this.systemPrefersDark = e.matches;
      
      // 如果当前是自动主题，则更新
      const storedTheme = this.getStoredThemePreference();
      if (storedTheme === 'auto') {
        this.setAutoTheme();
      }
    });
  }
  
  // 应用主题到DOM
  private applyThemeToDOM(theme: ThemeConfig): void {
    const root = document.documentElement;
    
    // 应用颜色变量
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });
    
    // 应用字体变量
    root.style.setProperty('--font-family', theme.fonts.family);
    root.style.setProperty('--font-mono', theme.fonts.monoFamily);
    
    Object.entries(theme.fonts.size).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });
    
    Object.entries(theme.fonts.weight).forEach(([key, value]) => {
      root.style.setProperty(`--font-weight-${key}`, value.toString());
    });
    
    Object.entries(theme.fonts.lineHeight).forEach(([key, value]) => {
      root.style.setProperty(`--line-height-${key}`, value.toString());
    });
    
    // 应用间距变量
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });
    
    // 应用圆角变量
    Object.entries(theme.radius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });
    
    // 应用阴影变量
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });
    
    // 应用动画变量
    Object.entries(theme.animations.duration).forEach(([key, value]) => {
      root.style.setProperty(`--duration-${key}`, value);
    });
    
    Object.entries(theme.animations.easing).forEach(([key, value]) => {
      root.style.setProperty(`--easing-${key}`, value);
    });
    
    // 应用自定义CSS
    if (theme.customCSS) {
      this.applyCustomCSS(theme.customCSS);
    }
    
    // 设置主题类名
    root.className = root.className.replace(/theme-\w+/g, '');
    root.classList.add(`theme-${theme.id}`);
    
    // 设置颜色方案
    root.style.setProperty('color-scheme', theme.type);
  }
  
  // 应用自定义CSS
  private applyCustomCSS(css: string): void {
    const existingStyle = document.getElementById('custom-theme-css');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'custom-theme-css';
    style.textContent = css;
    document.head.appendChild(style);
  }
  
  // 主题切换动画
  private applyThemeTransition(transition: ThemeTransition, callback: () => void): void {
    if (transition === 'none') {
      callback();
      return;
    }
    
    const body = document.body;
    
    switch (transition) {
      case 'fade':
        body.style.transition = 'opacity 0.3s ease-in-out';
        body.style.opacity = '0';
        setTimeout(() => {
          callback();
          body.style.opacity = '1';
          setTimeout(() => {
            body.style.transition = '';
          }, 300);
        }, 150);
        break;
        
      case 'slide':
        body.style.transition = 'transform 0.3s ease-in-out';
        body.style.transform = 'translateX(-20px)';
        setTimeout(() => {
          callback();
          body.style.transform = 'translateX(0)';
          setTimeout(() => {
            body.style.transition = '';
          }, 300);
        }, 150);
        break;
        
      case 'zoom':
        body.style.transition = 'transform 0.3s ease-in-out';
        body.style.transform = 'scale(0.95)';
        setTimeout(() => {
          callback();
          body.style.transform = 'scale(1)';
          setTimeout(() => {
            body.style.transition = '';
          }, 300);
        }, 150);
        break;
        
      case 'flip':
        body.style.transition = 'transform 0.6s ease-in-out';
        body.style.transform = 'rotateY(90deg)';
        setTimeout(() => {
          callback();
          body.style.transform = 'rotateY(0deg)';
          setTimeout(() => {
            body.style.transition = '';
          }, 600);
        }, 300);
        break;
        
      default:
        callback();
    }
  }
  
  // 保存主题偏好
  private saveThemePreference(themeId: string): void {
    try {
      localStorage.setItem('app-theme', themeId);
    } catch {
      // 忽略存储错误
    }
  }
  
  // 获取存储的主题偏好
  private getStoredThemePreference(): string | null {
    try {
      return localStorage.getItem('app-theme');
    } catch {
      return null;
    }
  }
  
  // 加载存储的主题
  private loadStoredTheme(): void {
    const storedTheme = this.getStoredThemePreference();
    
    if (storedTheme === 'auto') {
      this.setAutoTheme();
    } else if (storedTheme && this.getTheme(storedTheme)) {
      this.setTheme(storedTheme, 'none');
    } else {
      // 默认根据系统偏好
      this.setAutoTheme();
    }
  }
  
  // 保存自定义主题
  private saveCustomThemes(): void {
    try {
      localStorage.setItem('app-custom-themes', JSON.stringify(this.customThemes));
    } catch {
      // 忽略存储错误
    }
  }
  
  // 加载自定义主题
  private loadCustomThemes(): void {
    try {
      const stored = localStorage.getItem('app-custom-themes');
      if (stored) {
        const themes = JSON.parse(stored);
        Object.assign(this.customThemes, themes);
      }
    } catch {
      // 忽略加载错误
    }
  }
  
  // 导出主题
  exportTheme(themeId: string): string | null {
    const theme = this.getTheme(themeId);
    if (!theme) return null;
    
    return JSON.stringify(theme, null, 2);
  }
  
  // 导入主题
  importTheme(themeData: string): ThemeConfig | null {
    try {
      const theme = JSON.parse(themeData) as ThemeConfig;
      
      // 验证主题格式
      if (!this.validateTheme(theme)) {
        throw new Error('Invalid theme format');
      }
      
      this.addCustomTheme(theme);
      return theme;
    } catch (error) {
      console.error('Failed to import theme:', error);
      return null;
    }
  }
  
  // 验证主题格式
  private validateTheme(theme: any): theme is ThemeConfig {
    return (
      typeof theme === 'object' &&
      typeof theme.id === 'string' &&
      typeof theme.name === 'string' &&
      typeof theme.type === 'string' &&
      typeof theme.colors === 'object' &&
      typeof theme.fonts === 'object' &&
      typeof theme.spacing === 'object' &&
      typeof theme.radius === 'object' &&
      typeof theme.shadows === 'object' &&
      typeof theme.animations === 'object'
    );
  }
  
  // 生成主题预览
  generateThemePreview(theme: ThemeConfig): string {
    // 创建一个简单的SVG预览
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="120" fill="${theme.colors.bgPrimary}"/>
        <rect x="10" y="10" width="180" height="20" fill="${theme.colors.bgSecondary}" rx="4"/>
        <rect x="20" y="15" width="30" height="10" fill="${theme.colors.primary}" rx="2"/>
        <rect x="60" y="15" width="40" height="10" fill="${theme.colors.textSecondary}" rx="2"/>
        <rect x="10" y="40" width="80" height="30" fill="${theme.colors.chatUserBg}" rx="8"/>
        <rect x="110" y="40" width="80" height="30" fill="${theme.colors.chatAssistantBg}" rx="8"/>
        <rect x="10" y="80" width="180" height="30" fill="${theme.colors.bgTertiary}" rx="4"/>
      </svg>
    `)}`;
  }
}
