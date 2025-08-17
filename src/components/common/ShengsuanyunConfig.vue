<template>
  <div class="shengsuanyun-config">
    <div class="config-header">
      <h3>🔧 胜算云配置检查</h3>
      <p>检查并配置胜算云API密钥</p>
    </div>

    <div class="config-status">
      <div v-if="isChecking" class="checking">
        <span class="spinner">⏳</span> 正在检查配置...
      </div>
      
      <div v-else-if="hasApiKey" class="success">
        <span class="icon">✅</span> API密钥已配置
        <div class="key-preview">
          密钥预览: {{ apiKeyPreview }}
        </div>
      </div>
      
      <div v-else class="error">
        <span class="icon">❌</span> API密钥未配置
        <p class="help-text">
          请在应用设置中配置胜算云服务商，或使用以下命令设置：
        </p>
        <div class="command">
          <code>设置胜算云API密钥: [您的API密钥]</code>
        </div>
      </div>
    </div>

    <div class="config-actions">
      <button @click="checkConfig" :disabled="isChecking">
        {{ isChecking ? '检查中...' : '重新检查' }}
      </button>
      
      <button @click="openSettings" class="secondary">
        打开设置
      </button>
    </div>

    <div class="config-help">
      <h4>配置说明</h4>
      <ol>
        <li>访问 <a href="https://router.shengsuanyun.com" target="_blank">胜算云官网</a> 注册账号</li>
        <li>获取API密钥</li>
        <li>在应用设置中添加胜算云服务商</li>
        <li>配置API密钥和基础URL</li>
      </ol>
      
      <div class="example-config">
        <h5>配置示例：</h5>
        <pre><code>{
  "name": "shengsuanyun",
  "baseUrl": "https://router.shengsuanyun.com",
  "apiKey": "your-api-key-here"
}</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isChecking = ref(false);
const hasApiKey = ref(false);
const apiKeyPreview = ref('');

// 检查配置
async function checkConfig() {
  isChecking.value = true;
  
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // 检查是否有API密钥
      const hasKey = await (window as any).electronAPI.hasProviderKey('shengsuanyun');
      hasApiKey.value = hasKey.hasKey;
      
      if (hasKey.hasKey) {
        // 获取密钥预览
        const preview = await (window as any).electronAPI.getProviderKeyPreview('shengsuanyun');
        apiKeyPreview.value = preview.preview || '已配置';
      }
    } else {
      // 非Electron环境
      hasApiKey.value = false;
      apiKeyPreview.value = '';
    }
  } catch (error) {
    console.error('检查配置失败:', error);
    hasApiKey.value = false;
    apiKeyPreview.value = '';
  } finally {
    isChecking.value = false;
  }
}

// 打开设置
function openSettings() {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    // 发送打开设置事件
    window.electronAPI.onOpenSettings?.(() => {
      console.log('设置已打开');
    });
  }
}

// 组件挂载时检查配置
onMounted(() => {
  checkConfig();
});
</script>

<style scoped>
.shengsuanyun-config {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.config-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.config-header h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
}

.config-header p {
  margin: 0;
  opacity: 0.9;
}

.config-status {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  text-align: center;
}

.checking {
  color: #f39c12;
  font-size: 16px;
}

.spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

.success {
  color: #27ae60;
  font-size: 16px;
}

.error {
  color: #e74c3c;
  font-size: 16px;
}

.icon {
  font-size: 24px;
  margin-right: 8px;
}

.key-preview {
  margin-top: 10px;
  font-size: 14px;
  color: #7f8c8d;
  background: #f8f9fa;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
}

.help-text {
  margin: 15px 0;
  font-size: 14px;
  color: #34495e;
}

.command {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 15px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  margin: 15px 0;
}

.config-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-bottom: 30px;
}

.config-actions button {
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.config-actions button:first-child {
  background: #667eea;
  color: white;
}

.config-actions button:first-child:hover {
  background: #5a6fd8;
}

.config-actions button.secondary {
  background: #ecf0f1;
  color: #34495e;
}

.config-actions button.secondary:hover {
  background: #bdc3c7;
}

.config-actions button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.config-help {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.config-help h4 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 18px;
}

.config-help ol {
  margin: 0 0 20px 0;
  padding-left: 20px;
  color: #34495e;
  line-height: 1.6;
}

.config-help li {
  margin-bottom: 8px;
}

.config-help a {
  color: #667eea;
  text-decoration: none;
}

.config-help a:hover {
  text-decoration: underline;
}

.example-config {
  margin-top: 20px;
}

.example-config h5 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 16px;
}

.example-config pre {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.4;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .shengsuanyun-config {
    padding: 15px;
  }
  
  .config-actions {
    flex-direction: column;
  }
  
  .config-actions button {
    width: 100%;
  }
}
</style>
