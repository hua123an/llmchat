import { createI18n } from 'vue-i18n';
import { injectable, SERVICE_TOKENS } from '../services/container';

// 导入语言包
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';
import jaJP from './locales/ja-JP.json';
import koKR from './locales/ko-KR.json';
import esES from './locales/es-ES.json';
import frFR from './locales/fr-FR.json';
import deDE from './locales/de-DE.json';
import ruRU from './locales/ru-RU.json';

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  region: string;
  fallback?: string;
}

export interface I18nConfig {
  locale: string;
  fallbackLocale: string;
  availableLocales: LocaleInfo[];
  datetimeFormats: Record<string, any>;
  numberFormats: Record<string, any>;
  pluralizationRules: Record<string, (choice: number, choicesLength: number) => number>;
}

// 可用语言配置
export const AVAILABLE_LOCALES: LocaleInfo[] = [
  {
    code: 'zh-CN',
    name: '简体中文',
    nativeName: '简体中文',
    flag: '🇨🇳',
    rtl: false,
    region: 'China',
  },
  {
    code: 'en-US',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rtl: false,
    region: 'United States',
  },
  {
    code: 'ja-JP',
    name: '日本語',
    nativeName: '日本語',
    flag: '🇯🇵',
    rtl: false,
    region: 'Japan',
  },
  {
    code: 'ko-KR',
    name: '한국어',
    nativeName: '한국어',
    flag: '🇰🇷',
    rtl: false,
    region: 'Korea',
  },
  {
    code: 'es-ES',
    name: 'Español',
    nativeName: 'Español',
    flag: '🇪🇸',
    rtl: false,
    region: 'Spain',
  },
  {
    code: 'fr-FR',
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    rtl: false,
    region: 'France',
  },
  {
    code: 'de-DE',
    name: 'Deutsch',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    rtl: false,
    region: 'Germany',
  },
  {
    code: 'ru-RU',
    name: 'Русский',
    nativeName: 'Русский',
    flag: '🇷🇺',
    rtl: false,
    region: 'Russia',
  },
];

// 日期时间格式
const datetimeFormats = {
  'zh-CN': {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
    },
    time: {
      hour: 'numeric',
      minute: 'numeric',
    },
  },
  'en-US': {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
    },
    time: {
      hour: 'numeric',
      minute: 'numeric',
    },
  },
  'ja-JP': {
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
    },
    time: {
      hour: 'numeric',
      minute: 'numeric',
    },
  },
};

// 数字格式
const numberFormats = {
  'zh-CN': {
    currency: {
      style: 'currency',
      currency: 'CNY',
      notation: 'standard',
    },
    decimal: {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percent: {
      style: 'percent',
      useGrouping: false,
    },
  },
  'en-US': {
    currency: {
      style: 'currency',
      currency: 'USD',
      notation: 'standard',
    },
    decimal: {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percent: {
      style: 'percent',
      useGrouping: false,
    },
  },
  'ja-JP': {
    currency: {
      style: 'currency',
      currency: 'JPY',
      notation: 'standard',
    },
    decimal: {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
    percent: {
      style: 'percent',
      useGrouping: false,
    },
  },
};

// 复数规则
const pluralizationRules = {
  'zh-CN': (choice: number, choicesLength: number) => {
    // 中文没有复数形式
    return 0;
  },
  'en-US': (choice: number, choicesLength: number) => {
    if (choice === 0) return 0;
    return choice === 1 ? 1 : 2;
  },
  'ja-JP': (choice: number, choicesLength: number) => {
    // 日文没有复数形式
    return 0;
  },
};

// 语言包消息
const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'es-ES': esES,
  'fr-FR': frFR,
  'de-DE': deDE,
  'ru-RU': ruRU,
};

// 检测浏览器语言
export function detectBrowserLocale(): string {
  const browserLocale = navigator.language || navigator.languages?.[0] || 'en-US';
  
  // 精确匹配
  if (AVAILABLE_LOCALES.find(locale => locale.code === browserLocale)) {
    return browserLocale;
  }
  
  // 语言匹配（忽略地区）
  const languageCode = browserLocale.split('-')[0];
  const matchedLocale = AVAILABLE_LOCALES.find(locale => 
    locale.code.split('-')[0] === languageCode
  );
  
  return matchedLocale?.code || 'en-US';
}

// 获取本地存储的语言设置
export function getStoredLocale(): string | null {
  try {
    return localStorage.getItem('app-locale');
  } catch {
    return null;
  }
}

// 保存语言设置到本地存储
export function setStoredLocale(locale: string): void {
  try {
    localStorage.setItem('app-locale', locale);
  } catch {
    // 忽略存储错误
  }
}

// 获取初始语言
export function getInitialLocale(): string {
  // 优先级: 本地存储 > 浏览器检测 > 默认值
  return getStoredLocale() || detectBrowserLocale() || 'zh-CN';
}

// 创建 i18n 实例
export const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: getInitialLocale(),
  fallbackLocale: 'en-US',
  messages,
  datetimeFormats,
  numberFormats,
  pluralizationRules,
  silentTranslationWarn: process.env.NODE_ENV === 'production',
  silentFallbackWarn: process.env.NODE_ENV === 'production',
});

// I18n 服务类
@injectable(SERVICE_TOKENS.I18N_SERVICE)
export class I18nService {
  private i18nInstance = i18n;
  
  // 获取当前语言
  getCurrentLocale(): string {
    return this.i18nInstance.global.locale.value;
  }
  
  // 设置语言
  setLocale(locale: string): void {
    if (this.isLocaleAvailable(locale)) {
      this.i18nInstance.global.locale.value = locale;
      setStoredLocale(locale);
      this.updateDocumentLanguage(locale);
    } else {
      console.warn(`Locale "${locale}" is not available`);
    }
  }
  
  // 检查语言是否可用
  isLocaleAvailable(locale: string): boolean {
    return AVAILABLE_LOCALES.some(l => l.code === locale);
  }
  
  // 获取可用语言列表
  getAvailableLocales(): LocaleInfo[] {
    return AVAILABLE_LOCALES;
  }
  
  // 获取语言信息
  getLocaleInfo(locale: string): LocaleInfo | undefined {
    return AVAILABLE_LOCALES.find(l => l.code === locale);
  }
  
  // 翻译函数
  t(key: string, values?: Record<string, any>): string {
    return this.i18nInstance.global.t(key, values);
  }
  
  // 复数翻译
  tc(key: string, choice: number, values?: Record<string, any>): string {
    return this.i18nInstance.global.tc(key, choice, values);
  }
  
  // 日期格式化
  d(value: number | Date, format?: string): string {
    return this.i18nInstance.global.d(value, format);
  }
  
  // 数字格式化
  n(value: number, format?: string): string {
    return this.i18nInstance.global.n(value, format);
  }
  
  // 更新文档语言属性
  private updateDocumentLanguage(locale: string): void {
    const localeInfo = this.getLocaleInfo(locale);
    if (localeInfo) {
      document.documentElement.lang = locale;
      document.documentElement.dir = localeInfo.rtl ? 'rtl' : 'ltr';
    }
  }
  
  // 异步加载语言包
  async loadLocaleMessages(locale: string): Promise<void> {
    if (this.i18nInstance.global.availableLocales.includes(locale)) {
      return; // 已加载
    }
    
    try {
      const messages = await import(`./locales/${locale}.json`);
      this.i18nInstance.global.setLocaleMessage(locale, messages.default);
    } catch (error) {
      console.error(`Failed to load locale "${locale}":`, error);
    }
  }
  
  // 获取翻译的占位符
  getPlaceholder(key: string, fallback?: string): string {
    const value = this.t(key);
    return value !== key ? value : (fallback || key);
  }
  
  // 检测用户偏好语言
  detectUserPreferredLocale(): string {
    return detectBrowserLocale();
  }
  
  // 格式化相对时间
  formatRelativeTime(value: number, unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'): string {
    try {
      const rtf = new Intl.RelativeTimeFormat(this.getCurrentLocale(), { numeric: 'auto' });
      return rtf.format(value, unit);
    } catch {
      // 降级处理
      return `${value} ${unit}${Math.abs(value) !== 1 ? 's' : ''} ago`;
    }
  }
  
  // 格式化列表
  formatList(items: string[], type: 'conjunction' | 'disjunction' = 'conjunction'): string {
    try {
      const listFormat = new Intl.ListFormat(this.getCurrentLocale(), { 
        style: 'long', 
        type 
      });
      return listFormat.format(items);
    } catch {
      // 降级处理
      if (items.length === 0) return '';
      if (items.length === 1) return items[0];
      if (items.length === 2) return `${items[0]} and ${items[1]}`;
      return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
    }
  }
}

// 导出默认实例
export default i18n;
