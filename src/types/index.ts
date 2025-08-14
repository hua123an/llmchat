// 核心类型
export * from './core';
export * from './core/chat';
export * from './core/user';
export * from './core/agent';
export * from './core/workspace';

// API类型
export * from './api';

// 服务类型
export * from './services';

// Vue相关类型
export interface ComponentProps {
  [key: string]: any;
}

export interface ComponentEmits {
  [key: string]: (...args: any[]) => void;
}

// 实用类型
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 函数类型
export type VoidFunction = () => void;
export type Callback<T = any> = (data: T) => void;
export type AsyncCallback<T = any> = (data: T) => Promise<void>;

// 状态类型
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type AsyncState<T, E = Error> = {
  state: LoadingState;
  data?: T;
  error?: E;
};

// 错误类型
export interface AppError {
  code: string;
  message: string;
  details?: any;
}
