import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { Provider, ProviderId, createProviderId } from '../types';
import { inject, SERVICE_TOKENS } from '../services/container';
import { IEventService, IProviderService } from '../types/services';

export const useProvidersStore = defineStore('providers', () => {
  // 注入服务
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
  const providerService = inject<IProviderService>(SERVICE_TOKENS.PROVIDER_SERVICE);

  // 状态
  const providers = ref<Provider[]>([]);
  const modelsCache = ref<Map<string, any[]>>(new Map());
  const loadingStates = ref<Map<string, boolean>>(new Map());

  // 计算属性
  const availableProviders = computed(() => {
    return providers.value.filter(provider => provider.baseUrl);
  });

  const getProviderById = computed(() => (id: ProviderId) => {
    return providers.value.find(p => p.id === id) || null;
  });

  const getProviderByName = computed(() => (name: string) => {
    return providers.value.find(p => p.name === name) || null;
  });

  const providerCount = computed(() => providers.value.length);

  const isLoadingModels = computed(() => (providerName: string) => {
    return loadingStates.value.get(`models-${providerName}`) || false;
  });

  const getModelsForProvider = computed(() => (providerName: string) => {
    return modelsCache.value.get(providerName) || [];
  });

  // 动作
  const loadProviders = async () => {
    try {
      loadingStates.value.set('providers', true);
      
      const providersData = await providerService.getProviders();
      
      if (Array.isArray(providersData) && providersData.length > 0) {
        providers.value = providersData.map(p => ({
          ...p,
          id: p.id || createProviderId(p.name),
        }));
        
        eventService.emit('providers:loaded', { 
          providers: providers.value,
          count: providers.value.length 
        });
        
        return true;
      } else {
        providers.value = [];
        eventService.emit('providers:empty', {});
        return false;
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      providers.value = [];
      eventService.emit('providers:load_failed', { error: error as Error });
      return false;
    } finally {
      loadingStates.value.set('providers', false);
    }
  };

  const fetchModels = async (providerName: string, forceRefresh = false) => {
    const cacheKey = providerName;
    
    // 检查缓存
    if (!forceRefresh && modelsCache.value.has(cacheKey)) {
      return modelsCache.value.get(cacheKey);
    }

    try {
      loadingStates.value.set(`models-${providerName}`, true);
      
      const models = await providerService.getModels(providerName);
      
      if (Array.isArray(models)) {
        modelsCache.value.set(cacheKey, models);
        
        eventService.emit('provider:models_loaded', { 
          providerName, 
          models,
          count: models.length 
        });
        
        return models;
      } else {
        // 如果没有获取到模型，尝试测试端点
        const testResult = await testProvider(providerName);
        if (!testResult.ok) {
          eventService.emit('provider:models_failed', { 
            providerName, 
            error: testResult.message 
          });
        }
        
        return [];
      }
    } catch (error) {
      console.error(`Failed to fetch models for ${providerName}:`, error);
      
      eventService.emit('provider:models_failed', { 
        providerName, 
        error: error as Error 
      });
      
      return [];
    } finally {
      loadingStates.value.set(`models-${providerName}`, false);
    }
  };

  const testProvider = async (providerName: string) => {
    try {
      loadingStates.value.set(`test-${providerName}`, true);
      
      const result = await providerService.testProvider(providerName);
      
      eventService.emit('provider:tested', { 
        providerName, 
        result 
      });
      
      return result;
    } catch (error) {
      const result = { ok: false, message: String(error) };
      
      eventService.emit('provider:test_failed', { 
        providerName, 
        error: error as Error 
      });
      
      return result;
    } finally {
      loadingStates.value.set(`test-${providerName}`, false);
    }
  };

  const addProvider = (providerData: Omit<Provider, 'id'>) => {
    const providerId = createProviderId(providerData.name);
    const newProvider: Provider = {
      id: providerId,
      ...providerData,
    };

    providers.value.push(newProvider);
    
    eventService.emit('provider:added', { provider: newProvider });
    
    return providerId;
  };

  const updateProvider = (id: ProviderId, updates: Partial<Omit<Provider, 'id'>>) => {
    const provider = providers.value.find(p => p.id === id);
    if (provider) {
      Object.assign(provider, updates);
      
      // 清除相关的模型缓存
      if (updates.name || updates.baseUrl) {
        modelsCache.value.delete(provider.name);
      }
      
      eventService.emit('provider:updated', { providerId: id, updates });
    }
  };

  const removeProvider = (id: ProviderId) => {
    const index = providers.value.findIndex(p => p.id === id);
    if (index === -1) return;

    const removedProvider = providers.value[index];
    providers.value.splice(index, 1);

    // 清除相关缓存
    modelsCache.value.delete(removedProvider.name);
    loadingStates.value.delete(`models-${removedProvider.name}`);
    loadingStates.value.delete(`test-${removedProvider.name}`);

    eventService.emit('provider:removed', { provider: removedProvider });
  };

  const clearModelsCache = (providerName?: string) => {
    if (providerName) {
      modelsCache.value.delete(providerName);
      eventService.emit('provider:cache_cleared', { providerName });
    } else {
      modelsCache.value.clear();
      eventService.emit('providers:cache_cleared', {});
    }
  };

  const refreshProvider = async (providerName: string) => {
    // 清除缓存并重新获取
    clearModelsCache(providerName);
    await fetchModels(providerName, true);
    
    eventService.emit('provider:refreshed', { providerName });
  };

  const batchTestProviders = async () => {
    const results = new Map<string, { ok: boolean; message?: string }>();
    
    loadingStates.value.set('batch-test', true);
    
    try {
      const testPromises = providers.value.map(async (provider) => {
        const result = await testProvider(provider.name);
        results.set(provider.name, result);
        return { provider: provider.name, result };
      });

      await Promise.all(testPromises);
      
      eventService.emit('providers:batch_tested', { results });
      
      return results;
    } finally {
      loadingStates.value.set('batch-test', false);
    }
  };

  const getProviderStatus = (providerName: string) => {
    const isTestingProvider = loadingStates.value.get(`test-${providerName}`) || false;
    const isLoadingModels = loadingStates.value.get(`models-${providerName}`) || false;
    const hasModels = modelsCache.value.has(providerName);
    const modelsCount = modelsCache.value.get(providerName)?.length || 0;

    return {
      isTestingProvider,
      isLoadingModels,
      hasModels,
      modelsCount,
      isReady: hasModels && modelsCount > 0,
    };
  };

  const searchProviders = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return providers.value.filter(provider =>
      provider.name.toLowerCase().includes(lowerQuery) ||
      provider.baseUrl.toLowerCase().includes(lowerQuery)
    );
  };

  const exportProviders = () => {
    return JSON.stringify(providers.value, null, 2);
  };

  const importProviders = (data: string, merge = false) => {
    try {
      const importedProviders: Provider[] = JSON.parse(data);
      
      // 验证数据格式
      const validProviders = importedProviders.filter(provider => 
        provider.name && provider.baseUrl
      );

      if (!merge) {
        providers.value = validProviders.map(p => ({
          ...p,
          id: p.id || createProviderId(p.name),
        }));
        modelsCache.value.clear();
      } else {
        // 合并模式：避免重复
        validProviders.forEach(provider => {
          const existingNames = providers.value.map(p => p.name);
          if (!existingNames.includes(provider.name)) {
            providers.value.push({
              ...provider,
              id: provider.id || createProviderId(provider.name),
            });
          }
        });
      }
      
      eventService.emit('providers:imported', { 
        count: validProviders.length,
        merge 
      });

    } catch (error) {
      eventService.emit('providers:import_failed', { error: error as Error });
      throw error;
    }
  };

  const clearAllProviders = () => {
    const oldProviders = [...providers.value];
    providers.value = [];
    modelsCache.value.clear();
    loadingStates.value.clear();

    eventService.emit('providers:cleared', { oldProviders });
  };

  return {
    // 状态
    providers,
    modelsCache,
    loadingStates,

    // 计算属性
    availableProviders,
    getProviderById,
    getProviderByName,
    providerCount,
    isLoadingModels,
    getModelsForProvider,

    // 动作
    loadProviders,
    fetchModels,
    testProvider,
    addProvider,
    updateProvider,
    removeProvider,
    clearModelsCache,
    refreshProvider,
    batchTestProviders,
    getProviderStatus,
    searchProviders,
    exportProviders,
    importProviders,
    clearAllProviders,
  };
});
