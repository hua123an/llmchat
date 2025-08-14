import { AgentId } from './index';

// Agent实体
export interface Agent {
  id: AgentId;
  name: string;
  avatar: string;
  description: string;
  category: string;
  systemPrompt: string;
  capabilities: string[];
  modelRecommendation?: string;
  examples: string[];
  isActive: boolean;
}

// Agent分类
export type AgentCategory = 
  | 'general' 
  | 'programming' 
  | 'design' 
  | 'data' 
  | 'writing' 
  | 'custom';

// Agent能力
export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  icon: string;
}
