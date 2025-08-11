import { createI18n } from 'vue-i18n';
import zhCN from './zh-CN';
import enUS from './en-US';

// 支持的语言列表
export const supportedLocales = [
  { code: 'zh-CN', name: '中文', nativeName: '中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' }
];

// 获取默认语言
const getDefaultLocale = (): string => {
  // 1. 优先从localStorage获取用户设置
  const savedSettings = localStorage.getItem('appSettings');
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings);
      if (settings.language && supportedLocales.some(locale => locale.code === settings.language)) {
        return settings.language;
      }
    } catch (error) {
      console.warn('Failed to parse saved language setting:', error);
    }
  }

  // 2. 从浏览器语言设置获取
  const browserLanguage = navigator.language || navigator.languages?.[0];
  if (browserLanguage) {
    // 精确匹配
    if (supportedLocales.some(locale => locale.code === browserLanguage)) {
      return browserLanguage;
    }
    
    // 语言前缀匹配 (如 'en-GB' 匹配 'en-US')
    const languagePrefix = browserLanguage.split('-')[0];
    const matchedLocale = supportedLocales.find(locale => 
      locale.code.split('-')[0] === languagePrefix
    );
    if (matchedLocale) {
      return matchedLocale.code;
    }
  }

  // 3. 默认返回中文
  return 'zh-CN';
};

// 创建i18n实例
const i18n = createI18n({
  legacy: false, // 使用Composition API
  locale: getDefaultLocale(),
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
});

export default i18n;

// 导出便捷函数
export const { t, locale } = i18n.global;

// 切换语言的函数
export const switchLanguage = (newLocale: 'zh-CN' | 'en-US') => {
  if (supportedLocales.some(locale => locale.code === newLocale)) {
    i18n.global.locale.value = newLocale;
    
    // 保存到localStorage
    try {
      const savedSettings = localStorage.getItem('appSettings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.language = newLocale;
      localStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save language setting:', error);
    }
    
    return true;
  }
  return false;
};

// 获取当前语言
export const getCurrentLanguage = (): 'zh-CN' | 'en-US' => i18n.global.locale.value as 'zh-CN' | 'en-US';

// 获取语言显示名称
export const getLanguageName = (code: string) => {
  const locale = supportedLocales.find(locale => locale.code === code);
  return locale ? locale.name : code;
};

// 获取语言本地名称
export const getLanguageNativeName = (code: string) => {
  const locale = supportedLocales.find(locale => locale.code === code);
  return locale ? locale.nativeName : code;
};