import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { StatsEntry } from '../types';
import { inject, SERVICE_TOKENS } from '../services/container';
import { IEventService, IStorageService } from '../types/services';

export const useStatsStore = defineStore('stats', () => {
  // 注入服务
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
  const storageService = inject<IStorageService>(SERVICE_TOKENS.STORAGE_SERVICE);

  // 状态
  const statsLedger = ref<StatsEntry[]>([]);

  // 计算属性
  const totalStats = computed(() => {
    return statsLedger.value.reduce((total, entry) => ({
      promptTokens: total.promptTokens + entry.promptTokens,
      completionTokens: total.completionTokens + entry.completionTokens,
      totalTokens: total.totalTokens + entry.totalTokens,
      totalCost: total.totalCost + (entry.costUSD || 0),
      requestCount: total.requestCount + 1,
    }), {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
    });
  });

  const statsByProvider = computed(() => {
    const grouped = new Map<string, {
      provider: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      totalCost: number;
      requestCount: number;
      avgResponseTime: number;
    }>();

    statsLedger.value.forEach(entry => {
      const provider = entry.provider || 'unknown';
      const existing = grouped.get(provider) || {
        provider,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        avgResponseTime: 0,
      };

      existing.promptTokens += entry.promptTokens;
      existing.completionTokens += entry.completionTokens;
      existing.totalTokens += entry.totalTokens;
      existing.totalCost += entry.costUSD || 0;
      existing.requestCount += 1;
      
      if (entry.responseTimeMs) {
        existing.avgResponseTime = (existing.avgResponseTime * (existing.requestCount - 1) + entry.responseTimeMs) / existing.requestCount;
      }

      grouped.set(provider, existing);
    });

    return Array.from(grouped.values());
  });

  const statsByModel = computed(() => {
    const grouped = new Map<string, {
      model: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      totalCost: number;
      requestCount: number;
    }>();

    statsLedger.value.forEach(entry => {
      const model = entry.model || 'unknown';
      const existing = grouped.get(model) || {
        model,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
      };

      existing.promptTokens += entry.promptTokens;
      existing.completionTokens += entry.completionTokens;
      existing.totalTokens += entry.totalTokens;
      existing.totalCost += entry.costUSD || 0;
      existing.requestCount += 1;

      grouped.set(model, existing);
    });

    return Array.from(grouped.values());
  });

  const statsByTimeRange = computed(() => (days: number) => {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return statsLedger.value.filter(entry => entry.timestamp >= cutoff);
  });

  const dailyStats = computed(() => {
    const grouped = new Map<string, {
      date: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      totalCost: number;
      requestCount: number;
    }>();

    statsLedger.value.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      const existing = grouped.get(date) || {
        date,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
      };

      existing.promptTokens += entry.promptTokens;
      existing.completionTokens += entry.completionTokens;
      existing.totalTokens += entry.totalTokens;
      existing.totalCost += entry.costUSD || 0;
      existing.requestCount += 1;

      grouped.set(date, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
  });

  // 动作
  const addStatsEntry = (entry: StatsEntry) => {
    statsLedger.value.push(entry);
    saveStats();
    eventService.emit('stats:entry_added', { entry });
  };

  const updateStatsEntry = (id: string, updates: Partial<StatsEntry>) => {
    const index = statsLedger.value.findIndex(entry => entry.id === id);
    if (index !== -1) {
      statsLedger.value[index] = { ...statsLedger.value[index], ...updates };
      saveStats();
      eventService.emit('stats:entry_updated', { id, updates });
    }
  };

  const removeStatsEntry = (id: string) => {
    const index = statsLedger.value.findIndex(entry => entry.id === id);
    if (index !== -1) {
      const removed = statsLedger.value.splice(index, 1)[0];
      saveStats();
      eventService.emit('stats:entry_removed', { entry: removed });
    }
  };

  const clearStats = (params: { 
    scope: 'all' | 'currentTab'; 
    from?: number; 
    to?: number;
    tabName?: string;
  }) => {
    const { scope, from = 0, to = Date.now(), tabName } = params;
    
    const initialLength = statsLedger.value.length;
    
    if (scope === 'all') {
      statsLedger.value = statsLedger.value.filter(
        entry => entry.timestamp < from || entry.timestamp > to
      );
    } else if (scope === 'currentTab' && tabName) {
      statsLedger.value = statsLedger.value.filter(
        entry => entry.tabName !== tabName || entry.timestamp < from || entry.timestamp > to
      );
    }
    
    const clearedCount = initialLength - statsLedger.value.length;
    
    if (clearedCount > 0) {
      saveStats();
      eventService.emit('stats:cleared', { scope, clearedCount, params });
    }
  };

  const getStatsInRange = (params: { 
    scope: 'all' | 'currentTab'; 
    from?: number; 
    to?: number;
    tabName?: string;
  }) => {
    const { scope, from = 0, to = Date.now(), tabName } = params;
    
    let filtered = statsLedger.value.filter(
      entry => entry.timestamp >= from && entry.timestamp <= to
    );
    
    if (scope === 'currentTab' && tabName) {
      filtered = filtered.filter(entry => entry.tabName === tabName);
    }
    
    return filtered;
  };

  const exportStats = (format: 'json' | 'csv' = 'json') => {
    if (format === 'json') {
      return JSON.stringify(statsLedger.value, null, 2);
    } else {
      const headers = ['id', 'tabName', 'provider', 'model', 'timestamp', 'promptTokens', 'completionTokens', 'totalTokens', 'responseTimeMs', 'costUSD'];
      const rows = statsLedger.value.map(entry => [
        entry.id,
        entry.tabName,
        entry.provider || '',
        entry.model || '',
        new Date(entry.timestamp).toISOString(),
        entry.promptTokens,
        entry.completionTokens,
        entry.totalTokens,
        entry.responseTimeMs || '',
        entry.costUSD || '',
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  };

  const importStats = (data: string, format: 'json' | 'csv' = 'json') => {
    try {
      let entries: StatsEntry[] = [];
      
      if (format === 'json') {
        entries = JSON.parse(data);
      } else {
        const lines = data.split('\n');
        const headers = lines[0].split(',');
        entries = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((entry, header, index) => {
            (entry as any)[header] = values[index];
            return entry;
          }, {} as any);
        });
      }
      
      // 验证数据格式
      const validEntries = entries.filter(entry => 
        entry.id && entry.timestamp && typeof entry.totalTokens === 'number'
      );
      
      statsLedger.value.push(...validEntries);
      saveStats();
      
      eventService.emit('stats:imported', { 
        importedCount: validEntries.length,
        skippedCount: entries.length - validEntries.length 
      });
      
    } catch (error) {
      eventService.emit('stats:import_failed', { error: error as Error });
      throw error;
    }
  };

  // 持久化
  const saveStats = async () => {
    try {
      await storageService.saveStats(statsLedger.value);
    } catch (error) {
      console.warn('Failed to save stats:', error);
      eventService.emit('stats:save_failed', { error: error as Error });
    }
  };

  const loadStats = async () => {
    try {
      const savedStats = await storageService.loadStats();
      statsLedger.value = savedStats;
      eventService.emit('stats:loaded', { count: savedStats.length });
    } catch (error) {
      console.warn('Failed to load stats:', error);
      eventService.emit('stats:load_failed', { error: error as Error });
    }
  };

  return {
    // 状态
    statsLedger,

    // 计算属性
    totalStats,
    statsByProvider,
    statsByModel,
    statsByTimeRange,
    dailyStats,

    // 动作
    addStatsEntry,
    updateStatsEntry,
    removeStatsEntry,
    clearStats,
    getStatsInRange,
    exportStats,
    importStats,
    saveStats,
    loadStats,
  };
});
