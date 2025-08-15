import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  
  test: {
    // 测试环境
    environment: 'happy-dom',
    
    // 全局设置文件
    setupFiles: ['./src/tests/setup.ts'],
    
    // 包含的测试文件
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.vue',
      'src/**/*.spec.ts',
      'src/**/*.spec.vue',
    ],
    
    // 排除的文件
    exclude: [
      'node_modules',
      'dist',
      'dist-electron',
      '.git',
      '.github',
      'coverage',
    ],
    
    // 全局变量
    globals: true,
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'dist/',
        'dist-electron/',
        'coverage/',
        'vitest.config.ts',
        'vite.config.ts',
        'electron/',
        'scripts/',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    
    // 报告器
    reporter: ['verbose', 'junit'],
    
    // 输出配置
    outputFile: {
      junit: './test-results/junit.xml',
    },
    
    // 超时配置
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // 并发配置
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
    // 监视模式配置
    watch: {
      ignore: [
        'node_modules',
        'dist',
        'dist-electron',
        'coverage',
        'test-results',
      ],
    },
    
    // 浏览器测试配置（可选）
    // browser: {
    //   enabled: false,
    //   name: 'chrome',
    //   provider: 'webdriverio',
    // },
  },
  
  // Vite配置
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './src'),
    },
  },
  
  // 定义全局变量
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
});
