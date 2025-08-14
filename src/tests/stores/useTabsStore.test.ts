import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTabsStore } from '../../stores/useTabsStore';
import { createTabId } from '../../types';

describe('useTabsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should create a new tab', () => {
    const store = useTabsStore();
    
    const tabId = store.createTab({
      title: 'Test Tab',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });

    expect(store.tabs).toHaveLength(1);
    expect(store.tabs[0].id).toBe(tabId);
    expect(store.tabs[0].title).toBe('Test Tab');
    expect(store.tabs[0].provider).toBe('openai');
    expect(store.tabs[0].model).toBe('gpt-3.5-turbo');
  });

  it('should set active tab', () => {
    const store = useTabsStore();
    
    const tabId = store.createTab({
      title: 'Test Tab',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });

    store.setActiveTab(tabId);
    
    expect(store.activeTabId).toBe(tabId);
    expect(store.activeTab?.id).toBe(tabId);
  });

  it('should close tab', () => {
    const store = useTabsStore();
    
    const tabId1 = store.createTab({
      title: 'Tab 1',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });
    
    const tabId2 = store.createTab({
      title: 'Tab 2',
      provider: 'anthropic',
      model: 'claude-3',
    });

    store.setActiveTab(tabId1);
    expect(store.tabs).toHaveLength(2);

    store.closeTab(tabId1);
    
    expect(store.tabs).toHaveLength(1);
    expect(store.activeTabId).toBe(tabId2); // 应该自动切换到下一个tab
  });

  it('should update tab', () => {
    const store = useTabsStore();
    
    const tabId = store.createTab({
      title: 'Original Title',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
    });

    store.updateTab(tabId, {
      title: 'Updated Title',
      systemPrompt: 'You are a helpful assistant.',
    });

    const tab = store.getTabById(tabId);
    expect(tab?.title).toBe('Updated Title');
    expect(tab?.systemPrompt).toBe('You are a helpful assistant.');
    expect(tab?.provider).toBe('openai'); // 应该保持不变
  });

  it('should duplicate tab', () => {
    const store = useTabsStore();
    
    const originalTabId = store.createTab({
      title: 'Original Tab',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      systemPrompt: 'Test prompt',
    });

    const duplicatedTabId = store.duplicateTab(originalTabId);
    
    expect(store.tabs).toHaveLength(2);
    
    const originalTab = store.getTabById(originalTabId);
    const duplicatedTab = store.getTabById(duplicatedTabId!);
    
    expect(duplicatedTab?.title).toBe('Original Tab (副本)');
    expect(duplicatedTab?.provider).toBe(originalTab?.provider);
    expect(duplicatedTab?.model).toBe(originalTab?.model);
    expect(duplicatedTab?.systemPrompt).toBe(originalTab?.systemPrompt);
    expect(duplicatedTab?.id).not.toBe(originalTab?.id);
  });

  it('should handle empty state correctly', () => {
    const store = useTabsStore();
    
    expect(store.tabs).toHaveLength(0);
    expect(store.activeTab).toBeNull();
    expect(store.activeTabId).toBeNull();
    expect(store.tabCount).toBe(0);
    expect(store.hasUnsavedChanges).toBe(false);
  });

  it('should reorder tabs', () => {
    const store = useTabsStore();
    
    const tabId1 = store.createTab({ title: 'Tab 1', provider: 'openai', model: 'gpt-3.5-turbo' });
    const tabId2 = store.createTab({ title: 'Tab 2', provider: 'anthropic', model: 'claude-3' });
    const tabId3 = store.createTab({ title: 'Tab 3', provider: 'google', model: 'gemini-pro' });

    // 移动第一个tab到最后
    store.reorderTabs(0, 2);
    
    expect(store.tabs[0].id).toBe(tabId2);
    expect(store.tabs[1].id).toBe(tabId3);
    expect(store.tabs[2].id).toBe(tabId1);
  });

  it('should export and import tabs', () => {
    const store = useTabsStore();
    
    store.createTab({ title: 'Tab 1', provider: 'openai', model: 'gpt-3.5-turbo' });
    store.createTab({ title: 'Tab 2', provider: 'anthropic', model: 'claude-3' });

    const exported = store.exportTabs();
    const exportedData = JSON.parse(exported);
    
    expect(exportedData).toHaveLength(2);
    expect(exportedData[0].title).toBe('Tab 1');
    expect(exportedData[1].title).toBe('Tab 2');

    // 清空并导入
    store.clearAllTabs();
    expect(store.tabs).toHaveLength(0);

    store.importTabs(exported);
    expect(store.tabs).toHaveLength(2);
    expect(store.tabs[0].title).toBe('Tab 1');
    expect(store.tabs[1].title).toBe('Tab 2');
  });
});
