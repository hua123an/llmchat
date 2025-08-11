import { useChatStore } from '../../store/chat';

export type SearchScope = 'current' | 'all';

export function searchMessages(query: string, scope: SearchScope = 'current'): Array<{ tabName: string; messageId: string; index: number; }>{
  const store = useChatStore();
  const tabs = scope === 'current' && store.currentTab ? [store.currentTab] : (store.tabs || []);
  const results: Array<{ tabName: string; messageId: string; index: number; }> = [];
  const q = (query || '').trim().toLowerCase();
  if (!q) return results;
  for (const tab of tabs) {
    (tab.messages || []).forEach((m, idx) => {
      if ((m.content || '').toLowerCase().includes(q)) {
        results.push({ tabName: tab.name, messageId: m.id, index: idx });
      }
    });
  }
  return results;
}


