import { IStorageService } from '../types/services';
import { ChatTab, Agent, Workspace, User, StatsEntry } from '../types';
import { injectable, SERVICE_TOKENS } from './container';

@injectable(SERVICE_TOKENS.STORAGE_SERVICE)
export class StorageService implements IStorageService {
  private readonly KEYS = {
    TABS: 'chatTabs',
    USER: 'userProfile',
    AGENTS: 'agents',
    WORKSPACES: 'workSpaces',
    STATS: 'statsLedger',
    CURRENCY: 'currencySettings',
    SETTINGS: 'appSettings',
    SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  } as const;

  async saveTabs(tabs: ChatTab[]): Promise<void> {
    try {
      localStorage.setItem(this.KEYS.TABS, JSON.stringify(tabs));
    } catch (error) {
      throw new Error(`Failed to save tabs: ${error}`);
    }
  }

  async loadTabs(): Promise<ChatTab[]> {
    try {
      const data = localStorage.getItem(this.KEYS.TABS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('Failed to load tabs:', error);
      return [];
    }
  }

  async saveUser(user: User): Promise<void> {
    try {
      localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
    } catch (error) {
      throw new Error(`Failed to save user: ${error}`);
    }
  }

  async loadUser(): Promise<User | null> {
    try {
      const data = localStorage.getItem(this.KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to load user:', error);
      return null;
    }
  }

  async saveAgents(agents: Agent[]): Promise<void> {
    try {
      localStorage.setItem(this.KEYS.AGENTS, JSON.stringify(agents));
    } catch (error) {
      throw new Error(`Failed to save agents: ${error}`);
    }
  }

  async loadAgents(): Promise<Agent[]> {
    try {
      const data = localStorage.getItem(this.KEYS.AGENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('Failed to load agents:', error);
      return [];
    }
  }

  async saveWorkspaces(workspaces: Workspace[]): Promise<void> {
    try {
      localStorage.setItem(this.KEYS.WORKSPACES, JSON.stringify(workspaces));
    } catch (error) {
      throw new Error(`Failed to save workspaces: ${error}`);
    }
  }

  async loadWorkspaces(): Promise<Workspace[]> {
    try {
      const data = localStorage.getItem(this.KEYS.WORKSPACES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('Failed to load workspaces:', error);
      return [];
    }
  }

  async saveStats(stats: StatsEntry[]): Promise<void> {
    try {
      localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
    } catch (error) {
      throw new Error(`Failed to save stats: ${error}`);
    }
  }

  async loadStats(): Promise<StatsEntry[]> {
    try {
      const data = localStorage.getItem(this.KEYS.STATS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('Failed to load stats:', error);
      return [];
    }
  }

  // 通用方法
  async save<T>(key: string, data: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      throw new Error(`Failed to save ${key}: ${error}`);
    }
  }

  async load<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.warn(`Failed to load ${key}:`, error);
      return defaultValue;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove ${key}: ${error}`);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }
}
