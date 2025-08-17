<template>
  <div class="debug-container">
    <h2>🔧 胜算云API调试工具</h2>
    
    <el-card class="config-card">
      <template #header>
        <span>📋 当前配置</span>
      </template>
      
      <div class="config-form">
        <div class="form-item">
          <label>API密钥</label>
          <el-input 
            v-model="config.apiKey" 
            type="password" 
            show-password
            placeholder="请输入胜算云API密钥"
          />
        </div>
        
        <div class="form-item">
          <label>API地址</label>
          <el-input 
            v-model="config.baseUrl" 
            placeholder="https://router.shengsuanyun.com/api/v1"
          />
        </div>
        
        <div class="form-item">
          <label>测试提示词</label>
          <el-input 
            v-model="config.testPrompt" 
            placeholder="a beautiful landscape"
          />
        </div>
      </div>
    </el-card>
    
    <el-card class="test-card">
      <template #header>
        <span>🧪 连接测试</span>
      </template>
      
      <div class="test-buttons">
        <el-button @click="testBasicConnection" :loading="testing.basic" type="primary">
          测试基础连接
        </el-button>
        <el-button @click="testModelsEndpoint" :loading="testing.models" type="info">
          测试模型列表
        </el-button>
        <el-button @click="testImageGeneration" :loading="testing.image" type="success">
          测试图像生成
        </el-button>
      </div>
    </el-card>
    
    <el-card class="result-card">
      <template #header>
        <span>📊 测试结果</span>
        <el-button size="small" @click="clearLogs" style="float: right;">清空日志</el-button>
      </template>
      
      <div class="logs-container">
        <div 
          v-for="(log, index) in logs" 
          :key="index" 
          :class="['log-entry', log.type]"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-content">{{ log.message }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const config = ref({
  apiKey: '',
  baseUrl: 'https://router.shengsuanyun.com/api/v1',
  testPrompt: 'a beautiful landscape'
});

const testing = ref({
  basic: false,
  models: false,
  image: false
});

const logs = ref<Array<{time: string, message: string, type: string}>>([]);

const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
  const time = new Date().toLocaleTimeString();
  logs.value.unshift({ time, message, type });
  console.log(`[${time}] ${message}`);
};

const clearLogs = () => {
  logs.value = [];
};

// 测试基础连接
const testBasicConnection = async () => {
  if (!config.value.apiKey) {
    ElMessage.error('请先输入API密钥');
    return;
  }
  
  testing.value.basic = true;
  addLog('开始测试基础连接...', 'info');
  
  try {
    const response = await fetch(config.value.baseUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.value.apiKey}`
      }
    });
    
    addLog(`响应状态: ${response.status}`, response.ok ? 'success' : 'error');
    addLog(`响应头: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`, 'info');
    
    const text = await response.text();
    addLog(`响应内容: ${text}`, 'info');
    
    if (response.ok) {
      ElMessage.success('基础连接测试成功');
      addLog('✅ 基础连接正常', 'success');
    } else {
      ElMessage.error(`连接失败: ${response.status}`);
      addLog(`❌ 基础连接失败: ${response.status}`, 'error');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    addLog(`❌ 连接异常: ${errorMsg}`, 'error');
    ElMessage.error(`连接异常: ${errorMsg}`);
  } finally {
    testing.value.basic = false;
  }
};

// 测试模型端点
const testModelsEndpoint = async () => {
  if (!config.value.apiKey) {
    ElMessage.error('请先输入API密钥');
    return;
  }
  
  testing.value.models = true;
  addLog('开始测试模型端点...', 'info');
  
  try {
    const url = `${config.value.baseUrl}/models`;
    addLog(`请求URL: ${url}`, 'info');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.value.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    addLog(`响应状态: ${response.status}`, response.ok ? 'success' : 'error');
    
    const text = await response.text();
    addLog(`响应内容: ${text}`, 'info');
    
    if (response.ok) {
      ElMessage.success('模型端点测试成功');
      addLog('✅ 模型端点正常', 'success');
    } else if (response.status === 503) {
      ElMessage.warning('服务暂时不可用(503)');
      addLog('⚠️ 服务暂时不可用(503)', 'warning');
    } else {
      ElMessage.error(`模型端点失败: ${response.status}`);
      addLog(`❌ 模型端点失败: ${response.status}`, 'error');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    addLog(`❌ 模型端点异常: ${errorMsg}`, 'error');
    ElMessage.error(`模型端点异常: ${errorMsg}`);
  } finally {
    testing.value.models = false;
  }
};

// 测试图像生成
const testImageGeneration = async () => {
  if (!config.value.apiKey) {
    ElMessage.error('请先输入API密钥');
    return;
  }
  
  testing.value.image = true;
  addLog('开始测试图像生成...', 'info');
  
  try {
    const url = `${config.value.baseUrl}/images/generations`;
    const requestBody = {
      prompt: config.value.testPrompt,
      model: 'stable-diffusion',
      n: 1,
      size: '1024x1024'
    };
    
    addLog(`请求URL: ${url}`, 'info');
    addLog(`请求体: ${JSON.stringify(requestBody, null, 2)}`, 'info');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.value.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    addLog(`响应状态: ${response.status}`, response.ok ? 'success' : 'error');
    addLog(`响应头: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`, 'info');
    
    const text = await response.text();
    addLog(`响应内容: ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`, 'info');
    
    if (response.ok) {
      ElMessage.success('图像生成测试成功');
      addLog('✅ 图像生成正常', 'success');
      
      try {
        const data = JSON.parse(text);
        if (data.data && data.data.length > 0) {
          addLog(`✅ 生成了 ${data.data.length} 张图像`, 'success');
        }
      } catch (parseError) {
        addLog('⚠️ 响应内容解析失败', 'warning');
      }
    } else if (response.status === 503) {
      ElMessage.warning('服务暂时不可用(503)');
      addLog('⚠️ 图像生成服务暂时不可用(503)', 'warning');
    } else {
      ElMessage.error(`图像生成失败: ${response.status}`);
      addLog(`❌ 图像生成失败: ${response.status}`, 'error');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    addLog(`❌ 图像生成异常: ${errorMsg}`, 'error');
    ElMessage.error(`图像生成异常: ${errorMsg}`);
  } finally {
    testing.value.image = false;
  }
};

// 加载已保存的配置
onMounted(() => {
  try {
    const saved = localStorage.getItem('shengsuanyun_image_config');
    if (saved) {
      const savedConfig = JSON.parse(saved);
      config.value.apiKey = savedConfig.apiKey || '';
      config.value.baseUrl = savedConfig.baseUrl || 'https://router.shengsuanyun.com/api/v1';
    }
  } catch (error) {
    console.error('加载配置失败:', error);
  }
});
</script>

<style scoped>
.debug-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.config-card, .test-card, .result-card {
  margin-bottom: 20px;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-weight: 500;
  color: #374151;
}

.test-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.logs-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  background: #f9fafb;
}

.log-entry {
  display: flex;
  margin-bottom: 8px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

.log-time {
  color: #6b7280;
  margin-right: 12px;
  min-width: 80px;
}

.log-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-word;
}

.log-entry.success .log-content {
  color: #059669;
}

.log-entry.error .log-content {
  color: #dc2626;
}

.log-entry.warning .log-content {
  color: #d97706;
}

.log-entry.info .log-content {
  color: #374151;
}
</style>
