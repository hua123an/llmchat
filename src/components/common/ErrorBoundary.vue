<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-container">
      <!-- 错误图标 -->
      <div class="error-icon">
        <svg viewBox="0 0 24 24" width="48" height="48">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      </div>

      <!-- 错误信息 -->
      <div class="error-content">
        <h3 class="error-title">{{ errorTitle }}</h3>
        <p class="error-message">{{ errorMessage }}</p>
        
        <!-- 错误详情 (仅开发环境) -->
        <details v-if="showDetails" class="error-details">
          <summary>技术详情</summary>
          <pre class="error-stack">{{ errorStack }}</pre>
        </details>
      </div>

      <!-- 操作按钮 -->
      <div class="error-actions">
        <button @click="retry" class="btn btn-primary">
          {{ retrying ? '重试中...' : '重试' }}
        </button>
        <button @click="reload" class="btn btn-secondary">
          刷新页面
        </button>
        <button @click="reportError" class="btn btn-outline">
          报告问题
        </button>
      </div>

      <!-- 建议操作 -->
      <div class="error-suggestions">
        <h4>您可以尝试：</h4>
        <ul>
          <li>检查网络连接</li>
          <li>刷新页面</li>
          <li>清除浏览器缓存</li>
          <li v-if="!isOnline">等待网络连接恢复</li>
        </ul>
      </div>
    </div>
  </div>
  
  <!-- 正常渲染插槽内容 -->
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured, onMounted } from 'vue';
import { inject, SERVICE_TOKENS } from '../../services/container';
import type { ErrorHandlerService } from '../../services/ErrorHandlerService';

interface Props {
  fallback?: string;
  showDetails?: boolean;
  onError?: (error: Error, info: any) => void;
}

const props = withDefaults(defineProps<Props>(), {
  fallback: 'component',
  showDetails: import.meta.env.DEV,
});

const emit = defineEmits<{
  error: [error: Error, info: any];
  retry: [];
  recover: [];
}>();

// 服务注入
const errorHandler = inject<ErrorHandlerService>(SERVICE_TOKENS.ERROR_HANDLER_SERVICE);

// 状态
const hasError = ref(false);
const error = ref<Error | null>(null);
const errorInfo = ref<any>(null);
const retrying = ref(false);
const isOnline = ref(navigator.onLine);

// 计算属性
const errorTitle = computed(() => {
  if (!error.value) return '出错了';
  
  const message = error.value.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return '网络连接错误';
  }
  if (message.includes('timeout')) {
    return '请求超时';
  }
  if (message.includes('permission')) {
    return '权限错误';
  }
  if (message.includes('not found')) {
    return '资源未找到';
  }
  
  return '应用程序错误';
});

const errorMessage = computed(() => {
  if (!error.value) return '应用程序遇到了意外错误';
  
  const message = error.value.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return '无法连接到服务器，请检查您的网络连接。';
  }
  if (message.includes('timeout')) {
    return '请求时间过长，请稍后再试。';
  }
  if (message.includes('permission')) {
    return '您没有执行此操作的权限。';
  }
  if (message.includes('not found')) {
    return '请求的资源不存在。';
  }
  
  return '应用程序遇到了意外错误，我们已经记录了此问题。';
});

const errorStack = computed(() => {
  return error.value?.stack || '暂无详细信息';
});

// 错误捕获
onErrorCaptured((err: Error, instance, info: string) => {
  console.error('Error captured by boundary:', err, info);
  
  hasError.value = true;
  error.value = err;
  errorInfo.value = info;
  
  // 通知错误处理服务
  errorHandler?.handleError(err, `error_boundary_${props.fallback}`, {
    componentInfo: info,
    boundaryType: props.fallback,
  });
  
  // 调用用户提供的错误处理器
  props.onError?.(err, info);
  
  // 发送错误事件
  emit('error', err, info);
  
  // 阻止错误向上传播
  return false;
});

// 生命周期
onMounted(() => {
  // 监听网络状态
  window.addEventListener('online', () => {
    isOnline.value = true;
  });
  
  window.addEventListener('offline', () => {
    isOnline.value = false;
  });
});

// 方法
const retry = async () => {
  if (retrying.value) return;
  
  try {
    retrying.value = true;
    
    // 等待网络恢复（如果离线）
    if (!isOnline.value) {
      await errorHandler?.waitForOnline();
    }
    
    // 重置错误状态
    hasError.value = false;
    error.value = null;
    errorInfo.value = null;
    
    emit('retry');
    emit('recover');
    
  } catch (retryError) {
    console.error('Retry failed:', retryError);
    
    // 如果重试失败，显示新错误
    error.value = retryError as Error;
    
  } finally {
    retrying.value = false;
  }
};

const reload = () => {
  window.location.reload();
};

const reportError = async () => {
  if (!error.value) return;
  
  try {
    // 准备错误报告数据
    const reportData = {
      error: error.value.message,
      stack: error.value.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      componentInfo: errorInfo.value,
    };
    
    // 复制到剪贴板
    await navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
    
    // 显示成功提示
    alert('错误信息已复制到剪贴板，您可以将其发送给技术支持。');
    
  } catch (copyError) {
    console.error('Failed to copy error report:', copyError);
    alert('无法复制错误信息，请手动截图报告问题。');
  }
};

// 暴露方法给父组件
defineExpose({
  retry,
  reload,
  hasError: () => hasError.value,
  getError: () => error.value,
});
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 20px;
  background: var(--bg-primary);
}

.error-container {
  max-width: 600px;
  text-align: center;
  padding: 40px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-icon {
  color: var(--error-color);
  margin-bottom: 24px;
}

.error-content {
  margin-bottom: 32px;
}

.error-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.error-message {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 20px;
}

.error-details {
  text-align: left;
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.error-details summary {
  cursor: pointer;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.error-stack {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-primary);
  padding: 12px;
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
  white-space: pre-wrap;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  min-width: 100px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-outline {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-outline:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.error-suggestions {
  text-align: left;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 4px solid var(--warning-color);
}

.error-suggestions h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.error-suggestions ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.error-suggestions li {
  padding: 4px 0;
  color: var(--text-secondary);
  position: relative;
  padding-left: 16px;
}

.error-suggestions li::before {
  content: '•';
  color: var(--warning-color);
  position: absolute;
  left: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-boundary {
    padding: 16px;
    min-height: 300px;
  }
  
  .error-container {
    padding: 24px;
  }
  
  .error-title {
    font-size: 20px;
  }
  
  .error-message {
    font-size: 14px;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 100%;
    max-width: 200px;
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .error-container {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}
</style>
