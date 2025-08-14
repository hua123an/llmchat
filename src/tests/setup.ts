// 测试环境设置
import { vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { config } from '@vue/test-utils';

// 设置全局测试环境
beforeEach(() => {
  // 创建新的Pinia实例用于每个测试
  const pinia = createPinia();
  setActivePinia(pinia);
});

// 全局mocks
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock电子端API
(global as any).window = Object.assign(window, {
  electronAPI: {
    webSearch: vi.fn(),
    getProviders: vi.fn(),
    getModels: vi.fn(),
    testProvider: vi.fn(),
    extractPdfText: vi.fn(),
    extractDocxText: vi.fn(),
    recognizeImage: vi.fn(),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// Vue Test Utils全局配置
config.global.stubs = {
  // 存根外部组件
  transition: false,
  'transition-group': false,
};

// 清理函数
afterEach(() => {
  vi.clearAllMocks();
});
