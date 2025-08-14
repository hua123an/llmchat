import { WorkspaceId, TabId } from './index';

// 工作空间颜色
export type WorkspaceColor = 'purple' | 'red' | 'blue' | 'green' | 'orange';

// 工作空间实体
export interface Workspace {
  id: WorkspaceId;
  name: string;
  color: WorkspaceColor;
  shortcut: string;
  systemPrompt: string;
  tabs: TabId[];
}

// 强制更新状态
export interface ForceUpdateState {
  required: boolean;
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  notes?: string;
  progress?: number;
}
