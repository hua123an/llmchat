import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { User, UserId, createUserId, UserPreferences, AppSettings, CurrencySettings } from '../types';
import { inject, SERVICE_TOKENS } from '../services/container';
import { IEventService, IStorageService } from '../types/services';

export const useUserStore = defineStore('user', () => {
  // 注入服务
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
  const storageService = inject<IStorageService>(SERVICE_TOKENS.STORAGE_SERVICE);

  // 状态
  const user = ref<User>({
    id: createUserId('default-user'),
    name: '用户',
    email: 'user@chatllm.com',
  });

  const userAvatar = ref<string | null>(null);
  
  const preferences = ref<UserPreferences>({
    sidebarCollapsed: false,
    statsOpen: false,
    knowledgeOpen: false,
  });

  const appSettings = ref<AppSettings>({
    budgetToken: 0,
    warnPercent: 80,
    theme: 'auto',
    language: 'zh-CN',
  });

  const currencySettings = ref<CurrencySettings>({
    currency: 'USD',
    rateToUSD: 1,
    autoFetchRate: false,
  });

  // UI状态
  const isUserProfileOpen = ref(false);

  // 计算属性
  const userInitial = computed(() => {
    const name = user.value.name?.trim();
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : 'U';
  });

  const displayName = computed(() => {
    return user.value.name || user.value.email || '未知用户';
  });

  const hasAvatar = computed(() => {
    return !!userAvatar.value;
  });

  const effectiveAvatar = computed(() => {
    return userAvatar.value || user.value.avatar;
  });

  // 动作
  const updateUser = (updates: Partial<Omit<User, 'id'>>) => {
    user.value = { ...user.value, ...updates };
    saveUserProfile();
    eventService.emit('user:updated', { user: user.value, updates });
  };

  const setUserAvatar = (dataUrl: string | null) => {
    userAvatar.value = dataUrl;
    saveUserProfile();
    eventService.emit('user:avatar_changed', { avatar: dataUrl });
  };

  const removeUserAvatar = () => {
    setUserAvatar(null);
  };

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    preferences.value = { ...preferences.value, ...updates };
    savePreferences();
    eventService.emit('user:preferences_updated', { preferences: preferences.value, updates });
  };

  const updateAppSettings = (updates: Partial<AppSettings>) => {
    appSettings.value = { ...appSettings.value, ...updates };
    saveAppSettings();
    eventService.emit('user:settings_updated', { settings: appSettings.value, updates });
  };

  const updateCurrencySettings = (updates: Partial<CurrencySettings>) => {
    currencySettings.value = { ...currencySettings.value, ...updates };
    saveCurrencySettings();
    eventService.emit('user:currency_updated', { currency: currencySettings.value, updates });
  };

  // UI状态管理
  const openUserProfile = () => {
    isUserProfileOpen.value = true;
    eventService.emit('user:profile_opened', {});
  };

  const closeUserProfile = () => {
    isUserProfileOpen.value = false;
    eventService.emit('user:profile_closed', {});
  };

  const toggleSidebar = () => {
    updatePreferences({ sidebarCollapsed: !preferences.value.sidebarCollapsed });
  };

  const toggleStats = () => {
    updatePreferences({ statsOpen: !preferences.value.statsOpen });
  };

  const toggleKnowledge = () => {
    updatePreferences({ knowledgeOpen: !preferences.value.knowledgeOpen });
  };

  // 持久化方法
  const saveUserProfile = async () => {
    try {
      await storageService.save('userProfile', {
        user: user.value,
        avatar: userAvatar.value,
      });
    } catch (error) {
      console.warn('Failed to save user profile:', error);
      eventService.emit('user:save_failed', { error: error as Error, type: 'profile' });
    }
  };

  const savePreferences = async () => {
    try {
      await storageService.save('userPreferences', preferences.value);
    } catch (error) {
      console.warn('Failed to save preferences:', error);
      eventService.emit('user:save_failed', { error: error as Error, type: 'preferences' });
    }
  };

  const saveAppSettings = async () => {
    try {
      await storageService.save('appSettings', appSettings.value);
    } catch (error) {
      console.warn('Failed to save app settings:', error);
      eventService.emit('user:save_failed', { error: error as Error, type: 'settings' });
    }
  };

  const saveCurrencySettings = async () => {
    try {
      await storageService.save('currencySettings', currencySettings.value);
    } catch (error) {
      console.warn('Failed to save currency settings:', error);
      eventService.emit('user:save_failed', { error: error as Error, type: 'currency' });
    }
  };

  // 加载方法
  const loadUserProfile = async () => {
    try {
      const saved = await storageService.load('userProfile');
      if (saved && typeof saved === 'object') {
        if (saved.user) {
          user.value = { ...user.value, ...saved.user };
        }
        if (typeof saved.avatar === 'string' || saved.avatar === null) {
          userAvatar.value = saved.avatar;
        }
      }
      eventService.emit('user:profile_loaded', { user: user.value });
    } catch (error) {
      console.warn('Failed to load user profile:', error);
      eventService.emit('user:load_failed', { error: error as Error, type: 'profile' });
    }
  };

  const loadPreferences = async () => {
    try {
      const saved = await storageService.load('userPreferences');
      if (saved) {
        preferences.value = { ...preferences.value, ...saved };
      }
      eventService.emit('user:preferences_loaded', { preferences: preferences.value });
    } catch (error) {
      console.warn('Failed to load preferences:', error);
      eventService.emit('user:load_failed', { error: error as Error, type: 'preferences' });
    }
  };

  const loadAppSettings = async () => {
    try {
      const saved = await storageService.load('appSettings');
      if (saved) {
        appSettings.value = { ...appSettings.value, ...saved };
      }
      eventService.emit('user:settings_loaded', { settings: appSettings.value });
    } catch (error) {
      console.warn('Failed to load app settings:', error);
      eventService.emit('user:load_failed', { error: error as Error, type: 'settings' });
    }
  };

  const loadCurrencySettings = async () => {
    try {
      const saved = await storageService.load('currencySettings');
      if (saved) {
        currencySettings.value = { ...currencySettings.value, ...saved };
      }
      eventService.emit('user:currency_loaded', { currency: currencySettings.value });
    } catch (error) {
      console.warn('Failed to load currency settings:', error);
      eventService.emit('user:load_failed', { error: error as Error, type: 'currency' });
    }
  };

  const loadAll = async () => {
    await Promise.all([
      loadUserProfile(),
      loadPreferences(),
      loadAppSettings(),
      loadCurrencySettings(),
    ]);
  };

  return {
    // 状态
    user,
    userAvatar,
    preferences,
    appSettings,
    currencySettings,
    isUserProfileOpen,

    // 计算属性
    userInitial,
    displayName,
    hasAvatar,
    effectiveAvatar,

    // 动作
    updateUser,
    setUserAvatar,
    removeUserAvatar,
    updatePreferences,
    updateAppSettings,
    updateCurrencySettings,
    openUserProfile,
    closeUserProfile,
    toggleSidebar,
    toggleStats,
    toggleKnowledge,
    loadAll,
  };
});
