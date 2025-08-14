import { UserId } from './index';

// 用户信息
export interface User {
  id: UserId;
  name: string;
  email: string;
  avatar?: string;
}

// 货币设置
export interface CurrencySettings {
  currency: string;
  rateToUSD: number;
  lastFetchedAt?: number;
  autoFetchRate: boolean;
}

// 统计条目
export interface StatsEntry {
  id: string;
  tabName: string;
  provider?: string;
  model?: string;
  timestamp: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  responseTimeMs?: number;
  costUSD?: number | null;
}

// 应用设置
export interface AppSettings {
  budgetToken?: number;
  warnPercent?: number;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
}

// 用户偏好
export interface UserPreferences {
  sidebarCollapsed: boolean;
  statsOpen: boolean;
  knowledgeOpen: boolean;
}
