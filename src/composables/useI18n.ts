import { computed, watch } from 'vue';
import { useI18n as useVueI18n } from 'vue-i18n';
import { inject, SERVICE_TOKENS } from '../services/container';
import type { I18nService, LocaleInfo } from '../i18n';

export interface UseI18nReturn {
  // 当前语言
  locale: string;
  
  // 可用语言列表
  availableLocales: LocaleInfo[];
  
  // 当前语言信息
  currentLocaleInfo: LocaleInfo | undefined;
  
  // 翻译函数
  t: (key: string, values?: Record<string, any>) => string;
  
  // 复数翻译
  tc: (key: string, choice: number, values?: Record<string, any>) => string;
  
  // 日期格式化
  d: (value: number | Date, format?: string) => string;
  
  // 数字格式化
  n: (value: number, format?: string) => string;
  
  // 设置语言
  setLocale: (locale: string) => void;
  
  // 检查语言是否可用
  isLocaleAvailable: (locale: string) => boolean;
  
  // 获取语言信息
  getLocaleInfo: (locale: string) => LocaleInfo | undefined;
  
  // 格式化相对时间
  formatRelativeTime: (value: number, unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year') => string;
  
  // 格式化列表
  formatList: (items: string[], type?: 'conjunction' | 'disjunction') => string;
  
  // 检测用户偏好语言
  detectUserPreferredLocale: () => string;
  
  // 异步加载语言包
  loadLocaleMessages: (locale: string) => Promise<void>;
}

export function useI18n(): UseI18nReturn {
  // Vue I18n composable
  const vueI18n = useVueI18n();
  
  // I18n service
  const i18nService = inject<I18nService>(SERVICE_TOKENS.I18N_SERVICE);
  
  // 计算属性
  const locale = computed(() => i18nService?.getCurrentLocale() || vueI18n.locale.value);
  const availableLocales = computed(() => i18nService?.getAvailableLocales() || []);
  const currentLocaleInfo = computed(() => i18nService?.getLocaleInfo(locale.value));
  
  // 翻译函数
  const t = (key: string, values?: Record<string, any>): string => {
    if (i18nService) {
      return i18nService.t(key, values);
    }
    return vueI18n.t(key, values);
  };
  
  // 复数翻译
  const tc = (key: string, choice: number, values?: Record<string, any>): string => {
    if (i18nService) {
      return i18nService.tc(key, choice, values);
    }
    return vueI18n.tc(key, choice, values);
  };
  
  // 日期格式化
  const d = (value: number | Date, format?: string): string => {
    if (i18nService) {
      return i18nService.d(value, format);
    }
    return vueI18n.d(value, format);
  };
  
  // 数字格式化
  const n = (value: number, format?: string): string => {
    if (i18nService) {
      return i18nService.n(value, format);
    }
    return vueI18n.n(value, format);
  };
  
  // 设置语言
  const setLocale = (newLocale: string): void => {
    if (i18nService) {
      i18nService.setLocale(newLocale);
    } else {
      vueI18n.locale.value = newLocale;
    }
  };
  
  // 检查语言是否可用
  const isLocaleAvailable = (locale: string): boolean => {
    if (i18nService) {
      return i18nService.isLocaleAvailable(locale);
    }
    return vueI18n.availableLocales.includes(locale);
  };
  
  // 获取语言信息
  const getLocaleInfo = (locale: string): LocaleInfo | undefined => {
    return i18nService?.getLocaleInfo(locale);
  };
  
  // 格式化相对时间
  const formatRelativeTime = (value: number, unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'): string => {
    if (i18nService) {
      return i18nService.formatRelativeTime(value, unit);
    }
    
    // 降级处理
    try {
      const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });
      return rtf.format(value, unit);
    } catch {
      return `${value} ${unit}${Math.abs(value) !== 1 ? 's' : ''} ago`;
    }
  };
  
  // 格式化列表
  const formatList = (items: string[], type: 'conjunction' | 'disjunction' = 'conjunction'): string => {
    if (i18nService) {
      return i18nService.formatList(items, type);
    }
    
    // 降级处理
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} ${type === 'conjunction' ? 'and' : 'or'} ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, ${type === 'conjunction' ? 'and' : 'or'} ${items[items.length - 1]}`;
  };
  
  // 检测用户偏好语言
  const detectUserPreferredLocale = (): string => {
    if (i18nService) {
      return i18nService.detectUserPreferredLocale();
    }
    return navigator.language || 'en-US';
  };
  
  // 异步加载语言包
  const loadLocaleMessages = async (locale: string): Promise<void> => {
    if (i18nService) {
      await i18nService.loadLocaleMessages(locale);
    }
  };
  
  return {
    locale: locale.value,
    availableLocales: availableLocales.value,
    currentLocaleInfo: currentLocaleInfo.value,
    t,
    tc,
    d,
    n,
    setLocale,
    isLocaleAvailable,
    getLocaleInfo,
    formatRelativeTime,
    formatList,
    detectUserPreferredLocale,
    loadLocaleMessages,
  };
}

// 创建带类型的翻译函数
export function useTypedI18n<T extends Record<string, any> = Record<string, any>>() {
  const { t, tc, ...rest } = useI18n();
  
  return {
    ...rest,
    t: t as (key: keyof T, values?: Record<string, any>) => string,
    tc: tc as (key: keyof T, choice: number, values?: Record<string, any>) => string,
  };
}

// 创建命名空间翻译函数
export function useNamespacedI18n(namespace: string) {
  const { t, tc, ...rest } = useI18n();
  
  const namespacedT = (key: string, values?: Record<string, any>) => {
    return t(`${namespace}.${key}`, values);
  };
  
  const namespacedTc = (key: string, choice: number, values?: Record<string, any>) => {
    return tc(`${namespace}.${key}`, choice, values);
  };
  
  return {
    ...rest,
    t: namespacedT,
    tc: namespacedTc,
  };
}

// 创建消息翻译helpers
export function useMessageI18n() {
  const i18n = useNamespacedI18n('chat');
  
  return {
    ...i18n,
    // 常用消息翻译快捷方式
    typeMessage: () => i18n.t('type_message'),
    send: () => i18n.t('send'),
    sending: () => i18n.t('sending'),
    retry: () => i18n.t('retry'),
    copyMessage: () => i18n.t('copy_message'),
    deleteMessage: () => i18n.t('delete_message'),
    clearChat: () => i18n.t('clear_chat'),
    noMessages: () => i18n.t('no_messages'),
    thinking: () => i18n.t('thinking'),
    generating: () => i18n.t('generating'),
  };
}

// 创建导航翻译helpers
export function useNavI18n() {
  const i18n = useNamespacedI18n('nav');
  
  return {
    ...i18n,
    // 常用导航翻译快捷方式
    home: () => i18n.t('home'),
    chat: () => i18n.t('chat'),
    settings: () => i18n.t('settings'),
    profile: () => i18n.t('profile'),
    workspace: () => i18n.t('workspace'),
    providers: () => i18n.t('providers'),
    agents: () => i18n.t('agents'),
    knowledge: () => i18n.t('knowledge'),
    stats: () => i18n.t('stats'),
    help: () => i18n.t('help'),
    about: () => i18n.t('about'),
  };
}

// 创建错误翻译helpers
export function useErrorI18n() {
  const i18n = useNamespacedI18n('error');
  
  return {
    ...i18n,
    // 常用错误翻译快捷方式
    networkError: () => i18n.t('network_error'),
    serverError: () => i18n.t('server_error'),
    unknownError: () => i18n.t('unknown_error'),
    permissionDenied: () => i18n.t('permission_denied'),
    rateLimitExceeded: () => i18n.t('rate_limit_exceeded'),
    quotaExceeded: () => i18n.t('quota_exceeded'),
    serviceUnavailable: () => i18n.t('service_unavailable'),
    tryAgain: () => i18n.t('try_again'),
    goBack: () => i18n.t('go_back'),
  };
}

// 创建验证翻译helpers
export function useValidationI18n() {
  const i18n = useNamespacedI18n('validation');
  
  return {
    ...i18n,
    // 常用验证翻译快捷方式
    required: () => i18n.t('required'),
    minLength: (min: number) => i18n.t('min_length', { min }),
    maxLength: (max: number) => i18n.t('max_length', { max }),
    email: () => i18n.t('email'),
    url: () => i18n.t('url'),
    number: () => i18n.t('number'),
    between: (min: number, max: number) => i18n.t('between', { min, max }),
  };
}

// 创建时间翻译helpers
export function useTimeI18n() {
  const i18n = useNamespacedI18n('time');
  
  return {
    ...i18n,
    // 时间相关翻译
    justNow: () => i18n.t('just_now'),
    minutesAgo: (count: number) => i18n.tc('minutes_ago', count, { count }),
    hoursAgo: (count: number) => i18n.tc('hours_ago', count, { count }),
    daysAgo: (count: number) => i18n.tc('days_ago', count, { count }),
    today: () => i18n.t('today'),
    yesterday: () => i18n.t('yesterday'),
    tomorrow: () => i18n.t('tomorrow'),
  };
}
