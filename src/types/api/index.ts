// API响应基础结构
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

// 分页请求
export interface PaginationRequest {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

// 分页响应
export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Web搜索选项
export interface WebSearchOptions {
  providers?: Array<'google' | 'bing' | 'baidu' | 'duckduckgo'>;
  limit?: number;
  whitelist?: string[];
  blacklist?: string[];
}

// Web搜索结果
export interface WebSearchHit {
  title: string;
  url: string;
  snippet: string;
  isDirect?: boolean;
}

// 模型配置
export interface ModelConfig {
  id: string;
  name?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}
