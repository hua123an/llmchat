import { computed, ref, watch, onMounted } from 'vue';
import { inject, SERVICE_TOKENS } from '../services/container';
import type { ThemeService, ThemeConfig, ThemeTransition } from '../theme';

export interface UseThemeReturn {
  // 当前主题
  currentTheme: ThemeConfig;
  
  // 所有可用主题
  availableThemes: ThemeConfig[];
  
  // 内置主题
  builtInThemes: ThemeConfig[];
  
  // 自定义主题
  customThemes: ThemeConfig[];
  
  // 当前主题类型
  currentThemeType: 'light' | 'dark' | 'auto';
  
  // 是否为深色主题
  isDarkTheme: boolean;
  
  // 系统是否偏好深色主题
  systemPrefersDark: boolean;
  
  // 设置主题
  setTheme: (themeId: string, transition?: ThemeTransition) => void;
  
  // 切换亮色/深色主题
  toggleTheme: (transition?: ThemeTransition) => void;
  
  // 添加自定义主题
  addCustomTheme: (theme: ThemeConfig) => void;
  
  // 删除自定义主题
  removeCustomTheme: (themeId: string) => void;
  
  // 复制主题
  duplicateTheme: (sourceThemeId: string, newThemeId: string, newName: string) => ThemeConfig | null;
  
  // 导出主题
  exportTheme: (themeId: string) => string | null;
  
  // 导入主题
  importTheme: (themeData: string) => ThemeConfig | null;
  
  // 生成主题预览
  generateThemePreview: (theme: ThemeConfig) => string;
  
  // 获取主题
  getTheme: (themeId: string) => ThemeConfig | null;
  
  // 获取主题颜色
  getThemeColor: (colorKey: string) => string;
  
  // 应用主题变量
  applyThemeVariable: (variable: string, value: string) => void;
}

export function useTheme(): UseThemeReturn {
  // 主题服务
  const themeService = inject<ThemeService>(SERVICE_TOKENS.THEME_SERVICE);
  
  if (!themeService) {
    throw new Error('ThemeService not found. Make sure it is properly registered.');
  }
  
  // 响应式状态
  const systemPrefersDark = ref(false);
  
  // 计算属性
  const currentTheme = computed(() => themeService.getCurrentTheme());
  const availableThemes = computed(() => themeService.getAvailableThemes());
  
  const builtInThemes = computed(() => 
    availableThemes.value.filter(theme => ['light', 'dark'].includes(theme.id))
  );
  
  const customThemes = computed(() => 
    availableThemes.value.filter(theme => !['light', 'dark'].includes(theme.id))
  );
  
  const currentThemeType = computed(() => currentTheme.value.type);
  
  const isDarkTheme = computed(() => {
    if (currentTheme.value.type === 'auto') {
      return systemPrefersDark.value;
    }
    return currentTheme.value.type === 'dark';
  });
  
  // 方法
  const setTheme = (themeId: string, transition: ThemeTransition = 'fade') => {
    themeService.setTheme(themeId, transition);
  };
  
  const toggleTheme = (transition: ThemeTransition = 'fade') => {
    const newTheme = isDarkTheme.value ? 'light' : 'dark';
    setTheme(newTheme, transition);
  };
  
  const addCustomTheme = (theme: ThemeConfig) => {
    themeService.addCustomTheme(theme);
  };
  
  const removeCustomTheme = (themeId: string) => {
    themeService.removeCustomTheme(themeId);
  };
  
  const duplicateTheme = (sourceThemeId: string, newThemeId: string, newName: string) => {
    return themeService.duplicateTheme(sourceThemeId, newThemeId, newName);
  };
  
  const exportTheme = (themeId: string) => {
    return themeService.exportTheme(themeId);
  };
  
  const importTheme = (themeData: string) => {
    return themeService.importTheme(themeData);
  };
  
  const generateThemePreview = (theme: ThemeConfig) => {
    return themeService.generateThemePreview(theme);
  };
  
  const getTheme = (themeId: string) => {
    return themeService.getTheme(themeId);
  };
  
  const getThemeColor = (colorKey: string) => {
    const colors = currentTheme.value.colors as any;
    return colors[colorKey] || '';
  };
  
  const applyThemeVariable = (variable: string, value: string) => {
    const root = document.documentElement;
    root.style.setProperty(`--${variable}`, value);
  };
  
  // 检测系统主题偏好
  const detectSystemTheme = () => {
    systemPrefersDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  
  // 监听系统主题变化
  const watchSystemTheme = () => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      systemPrefersDark.value = e.matches;
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // 返回清理函数
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  };
  
  // 生命周期
  onMounted(() => {
    detectSystemTheme();
    const cleanup = watchSystemTheme();
    
    // 清理
    return cleanup;
  });
  
  return {
    currentTheme: currentTheme.value,
    availableThemes: availableThemes.value,
    builtInThemes: builtInThemes.value,
    customThemes: customThemes.value,
    currentThemeType: currentThemeType.value,
    isDarkTheme: isDarkTheme.value,
    systemPrefersDark: systemPrefersDark.value,
    setTheme,
    toggleTheme,
    addCustomTheme,
    removeCustomTheme,
    duplicateTheme,
    exportTheme,
    importTheme,
    generateThemePreview,
    getTheme,
    getThemeColor,
    applyThemeVariable,
  };
}

// 创建主题构建器composable
export function useThemeBuilder(baseThemeId?: string) {
  const { getTheme, addCustomTheme } = useTheme();
  
  const baseTheme = baseThemeId ? getTheme(baseThemeId) : null;
  const themeBuilder = ref<Partial<ThemeConfig>>(
    baseTheme ? JSON.parse(JSON.stringify(baseTheme)) : {}
  );
  
  const updateThemeProperty = (path: string, value: any) => {
    const keys = path.split('.');
    let target = themeBuilder.value as any;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    
    target[keys[keys.length - 1]] = value;
  };
  
  const getThemeProperty = (path: string) => {
    const keys = path.split('.');
    let target = themeBuilder.value as any;
    
    for (const key of keys) {
      if (!target || typeof target !== 'object') {
        return undefined;
      }
      target = target[key];
    }
    
    return target;
  };
  
  const saveTheme = (id: string, name: string, description?: string) => {
    if (!themeBuilder.value.colors || !themeBuilder.value.fonts) {
      throw new Error('Theme is incomplete');
    }
    
    const theme: ThemeConfig = {
      id,
      name,
      description: description || `自定义主题 - ${name}`,
      type: (themeBuilder.value.type as any) || 'light',
      colors: themeBuilder.value.colors as any,
      fonts: themeBuilder.value.fonts as any,
      spacing: themeBuilder.value.spacing as any,
      radius: themeBuilder.value.radius as any,
      shadows: themeBuilder.value.shadows as any,
      animations: themeBuilder.value.animations as any,
      customCSS: themeBuilder.value.customCSS,
    };
    
    addCustomTheme(theme);
    return theme;
  };
  
  const resetBuilder = (newBaseThemeId?: string) => {
    const newBaseTheme = newBaseThemeId ? getTheme(newBaseThemeId) : null;
    themeBuilder.value = newBaseTheme ? JSON.parse(JSON.stringify(newBaseTheme)) : {};
  };
  
  const previewTheme = () => {
    if (!themeBuilder.value.colors) return '';
    
    // 临时应用主题进行预览
    const tempTheme = themeBuilder.value as ThemeConfig;
    
    // 这里可以实现实时预览逻辑
    return '';
  };
  
  return {
    themeBuilder: themeBuilder.value,
    updateThemeProperty,
    getThemeProperty,
    saveTheme,
    resetBuilder,
    previewTheme,
  };
}

// 创建主题动画控制器
export function useThemeTransition() {
  const isTransitioning = ref(false);
  const transitionType = ref<ThemeTransition>('fade');
  
  const startTransition = (type: ThemeTransition = 'fade') => {
    isTransitioning.value = true;
    transitionType.value = type;
  };
  
  const endTransition = () => {
    isTransitioning.value = false;
  };
  
  const withTransition = async (type: ThemeTransition, callback: () => void | Promise<void>) => {
    startTransition(type);
    
    try {
      await callback();
    } finally {
      // 等待动画完成
      setTimeout(() => {
        endTransition();
      }, 300);
    }
  };
  
  return {
    isTransitioning: isTransitioning.value,
    transitionType: transitionType.value,
    startTransition,
    endTransition,
    withTransition,
  };
}

// 创建CSS变量助手
export function useCSSVariables() {
  const getCSSVariable = (variable: string): string => {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${variable}`).trim();
  };
  
  const setCSSVariable = (variable: string, value: string): void => {
    document.documentElement.style.setProperty(`--${variable}`, value);
  };
  
  const removeCSSVariable = (variable: string): void => {
    document.documentElement.style.removeProperty(`--${variable}`);
  };
  
  const getAllCSSVariables = (): Record<string, string> => {
    const style = getComputedStyle(document.documentElement);
    const variables: Record<string, string> = {};
    
    for (let i = 0; i < style.length; i++) {
      const property = style[i];
      if (property.startsWith('--')) {
        variables[property] = style.getPropertyValue(property).trim();
      }
    }
    
    return variables;
  };
  
  return {
    getCSSVariable,
    setCSSVariable,
    removeCSSVariable,
    getAllCSSVariables,
  };
}
