// 品牌类型系统
export type Brand<T, U> = T & { readonly __brand: U };

// ID类型
export type MessageId = Brand<string, 'MessageId'>;
export type TabId = Brand<string, 'TabId'>;
export type UserId = Brand<string, 'UserId'>;
export type AgentId = Brand<string, 'AgentId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type AttachmentId = Brand<string, 'AttachmentId'>;
export type ProviderId = Brand<string, 'ProviderId'>;

// 辅助函数
export const createMessageId = (id: string): MessageId => id as MessageId;
export const createTabId = (id: string): TabId => id as TabId;
export const createUserId = (id: string): UserId => id as UserId;
export const createAgentId = (id: string): AgentId => id as AgentId;
export const createWorkspaceId = (id: string): WorkspaceId => id as WorkspaceId;
export const createAttachmentId = (id: string): AttachmentId => id as AttachmentId;
export const createProviderId = (id: string): ProviderId => id as ProviderId;
