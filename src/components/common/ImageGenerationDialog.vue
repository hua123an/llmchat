<template>
  <el-dialog 
    v-model="visible" 
    title="🎨 AI绘图工作室" 
    width="90%" 
    max-width="1200px"
    :close-on-click-modal="false"
    class="image-generation-dialog"
  >
    <div class="generation-container">
      <!-- 左侧控制面板 -->
      <div class="control-panel">
        <el-form :model="form" label-width="80px" size="small">
          <!-- 提示词输入 -->
          <el-form-item label="描述">
            <el-input
              v-model="form.prompt"
              type="textarea"
              :rows="4"
              placeholder="请描述你想要生成的图像，例如：一只可爱的橘猫在阳光下打哈欠，水彩画风格"
              maxlength="1000"
              show-word-limit
              :aria-label="$t('imageGeneration.prompt')"
            />
            <div class="prompt-tools">
              <el-button size="small" @click="optimizePrompt">✨ 优化提示词</el-button>
              <el-button size="small" @click="showPromptExamples">💡 示例</el-button>
            </div>
          </el-form-item>

          <!-- 服务商选择 -->
          <el-form-item label="服务商">
            <el-select v-model="form.provider" @change="onProviderChange" popper-class="wide-select-popper" :fit-input-width="false" :aria-label="$t('imageGeneration.provider')">
              <el-option 
                v-for="provider in availableProviders" 
                :key="provider.name"
                :label="provider.displayName" 
                :value="provider.name"
              >
                <div class="provider-option">
                  <div class="provider-info">
                    <span :title="provider.displayName">{{ provider.displayName }}</span>
                    <span class="provider-status" :class="{ 'configured': isProviderConfigured(provider.name), 'not-configured': !isProviderConfigured(provider.name) }">
                      {{ isProviderConfigured(provider.name) ? '✅ 已配置' : '⚠️ 未配置' }}
                    </span>
                  </div>
                  <span class="provider-desc">{{ provider.description }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <!-- 模型选择 -->
          <el-form-item label="模型" v-if="currentProvider">
            <el-select v-model="form.model" popper-class="wide-select-popper" :fit-input-width="false" :aria-label="$t('imageGeneration.model')">
              <el-option 
                v-for="model in currentProvider.supportedModels" 
                :key="model"
                :label="getModelDisplayName(model)" 
                :value="model"
              >
                <div :title="getModelDisplayName(model)">{{ getModelDisplayName(model) }}</div>
              </el-option>
            </el-select>
          </el-form-item>

          <!-- 尺寸选择 -->
          <el-form-item label="尺寸" v-if="currentProvider">
            <el-select v-model="form.size" popper-class="wide-select-popper" :fit-input-width="false">
              <el-option 
                v-for="size in currentProvider.supportedSizes" 
                :key="size"
                :label="size" 
                :value="size"
              >
                <div :title="size">{{ size }}</div>
              </el-option>
            </el-select>
          </el-form-item>

          <!-- 高级选项 -->
          <el-form-item label="质量" v-if="form.provider === 'openai'">
            <el-radio-group v-model="form.quality">
              <el-radio label="standard">标准</el-radio>
              <el-radio label="hd">高清</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="风格" v-if="form.provider === 'openai'">
            <el-radio-group v-model="form.style">
              <el-radio label="natural">自然</el-radio>
              <el-radio label="vivid">鲜艳</el-radio>
            </el-radio-group>
          </el-form-item>

          <!-- 阿里云特有选项 -->
          <el-form-item label="步数" v-if="form.provider === 'aliyun' && !form.model?.includes('turbo')">
            <el-slider 
              v-model="form.steps" 
              :min="1" 
              :max="50"
              :step="1"
              show-input
              :input-size="'small'"
            />
            <div style="font-size: 12px; color: #999; margin-top: 4px;">
              步数越多质量越好，但生成时间越长
            </div>
          </el-form-item>

          <el-form-item label="引导强度" v-if="form.provider === 'aliyun'">
            <el-slider 
              v-model="form.guidance_scale" 
              :min="1" 
              :max="20"
              :step="0.5"
              show-input
              :input-size="'small'"
            />
            <div style="font-size: 12px; color: #999; margin-top: 4px;">
              控制AI对提示词的遵循程度，7-12为推荐值
            </div>
          </el-form-item>

          <el-form-item label="数量" v-if="currentProvider">
            <el-slider 
              v-model="form.n" 
              :min="1" 
              :max="currentProvider.maxImages"
              show-input
              :input-size="'small'"
            />
          </el-form-item>

          <!-- 成本预估 -->
          <el-form-item label="预估成本" v-if="estimatedCost > 0">
            <div class="cost-estimate">
              <span class="cost-amount">${{ estimatedCost.toFixed(4) }}</span>
              <span class="cost-desc">USD</span>
            </div>
          </el-form-item>

          <!-- 生成按钮 + 进度/取消 -->
          <el-form-item>
            <div style="display:flex; gap:8px; width:100%">
              <el-button 
                type="primary" 
                @click="generateImage"
                :loading="generating"
                :disabled="!canGenerate"
                style="flex:1"
              >
                {{ generating ? '生成中...' : '🎨 生成图像' }}
              </el-button>
              <el-button 
                v-if="generating"
                type="danger"
                plain
                @click="cancelGeneration"
              >取消</el-button>
            </div>
            <div v-if="generating" style="margin-top:8px">
              <el-progress :percentage="progressPercent" :indeterminate="progressPercent===0" :stroke-width="6" />
              <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">
                {{ progressText }}
              </div>
            </div>
          </el-form-item>
        </el-form>

        <!-- 设置面板 -->
        <div class="settings-panel">
          <el-collapse>
            <el-collapse-item title="🔧 API设置" name="settings">
              <el-form size="small" label-width="100px">
                <el-form-item label="OpenAI Key">
                  <el-input 
                    v-model="settings.openaiApiKey" 
                    type="password" 
                    placeholder="sk-..."
                    @change="saveSettings"
                  />
                </el-form-item>
                <el-form-item label="Stability Key">
                  <el-input 
                    v-model="settings.stabilityApiKey" 
                    type="password"
                    @change="saveSettings"
                  />
                </el-form-item>
                <el-form-item label="阿里云API Key">
                  <el-input 
                    v-model="settings.aliyunApiKey" 
                    type="password"
                    placeholder="sk-..."
                    @change="saveSettings"
                  />
                  <div style="font-size: 12px; color: #999; margin-top: 4px;">
                    支持 Stable Diffusion 3.5 和 Flux 模型
                  </div>
                </el-form-item>
                <el-form-item label="本地SD地址">
                  <el-input 
                    v-model="settings.localSdUrl" 
                    placeholder="http://127.0.0.1:7860"
                    @change="saveSettings"
                  />
                </el-form-item>
              </el-form>
            </el-collapse-item>
          </el-collapse>
        </div>
      </div>

      <!-- 右侧结果展示 -->
      <div class="result-panel">
        <div class="result-header">
          <h3>生成结果</h3>
          <div class="result-actions" v-if="generatedImages.length > 0">
            <el-button size="small" @click="clearResults">清空</el-button>
            <el-button size="small" @click="downloadAll">全部下载</el-button>
          </div>
        </div>

        <div class="result-content">
          <!-- 生成中状态 -->
          <div v-if="generating" class="generating-status">
            <el-skeleton :rows="3" animated />
            <p>AI正在为你创作图像，请稍候...</p>
          </div>

          <!-- 生成结果 -->
          <div v-else-if="generatedImages.length > 0" class="image-grid">
            <div 
              v-for="(image, index) in generatedImages" 
              :key="index"
              class="image-item"
            >
              <div class="image-wrapper">
                <img :src="image.url" :alt="`生成的图像 ${index + 1}`" loading="lazy" decoding="async" @click="previewImage(image)" />
                <div class="image-overlay">
                  <div class="image-actions">
                    <el-button 
                      circle 
                      size="small" 
                      @click="downloadImage(image, index)"
                      title="下载"
                    >
                      ⬇️
                    </el-button>
                    <el-button 
                      circle 
                      size="small" 
                      @click="copyToClipboard(image)"
                      title="复制"
                    >
                      📋
                    </el-button>
                    <el-button 
                      circle 
                      size="small" 
                      @click="addToChat(image)"
                      title="添加到对话"
                    >
                      💬
                    </el-button>
                  </div>
                </div>
              </div>
              <div class="image-info">
                <p class="image-prompt" v-if="image.revised_prompt">{{ image.revised_prompt }}</p>
                <div class="image-meta">
                  <span>{{ form.size }}</span>
                  <span>{{ getModelDisplayName(form.model) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-state">
            <div class="empty-icon">🎨</div>
            <p>在左侧输入描述，开始AI创作之旅</p>
            <div class="example-prompts">
              <p>试试这些示例：</p>
              <el-tag 
                v-for="example in examplePrompts" 
                :key="example"
                class="example-tag"
                @click="useExample(example)"
              >
                {{ example }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图像预览对话框 -->
    <el-dialog v-model="previewVisible" title="图像预览" width="70%">
      <div class="preview-container" v-if="currentPreviewImage">
        <img :src="currentPreviewImage.url" class="preview-image" loading="lazy" decoding="async" />
        <div class="preview-info">
          <p><strong>提示词:</strong> {{ currentPreviewImage.revised_prompt || form.prompt }}</p>
          <p><strong>尺寸:</strong> {{ form.size }}</p>
          <p><strong>模型:</strong> {{ getModelDisplayName(form.model) }}</p>
        </div>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ImageGenerationService, type ImageGenerationRequest } from '../../services/ImageGenerationService';
import { useChatStore } from '../../store/chat';

const store = useChatStore();

const visible = computed({
  get: () => store.isImageGenerationOpen || false,
  set: (value: boolean) => {
    (store as any).isImageGenerationOpen = value;
  }
});

// 表单数据
const form = ref<ImageGenerationRequest & { provider: string }>({
  prompt: '',
  provider: 'aliyun', // 默认使用阿里云
  model: 'stable-diffusion-3.5-large',
  size: '1024x1024',
  quality: 'standard',
  style: 'natural',
  n: 1,
  steps: 20, // 阿里云特有参数
  guidance_scale: 7.5 // 阿里云特有参数
});

// 设置数据
const settings = ref({
  openaiApiKey: '',
  stabilityApiKey: '',
  midjourneyApiKey: '',
  localSdUrl: 'http://127.0.0.1:7860',
  aliyunApiKey: ''
});

// 状态
const generating = ref(false);
const progressPercent = ref(0);
const progressText = ref('正在与模型建立任务...');
let cancelRequested = false;
const generatedImages = ref<Array<{ url: string; revised_prompt?: string }>>([]);
const previewVisible = ref(false);
const currentPreviewImage = ref<{ url: string; revised_prompt?: string } | null>(null);

// 可用服务商
const availableProviders = computed(() => {
  return ImageGenerationService.getProviders();
});

// 当前服务商
const currentProvider = computed(() => {
  return availableProviders.value.find(p => p.name === form.value.provider);
});

// 检查服务商是否已配置
const isProviderConfigured = (providerName: string) => {
  return ImageGenerationService.isProviderConfigured(providerName);
};

// 是否可以生成
const canGenerate = computed(() => {
  return form.value.prompt.trim().length > 0 && 
         availableProviders.value.length > 0 &&
         !generating.value;
});

// 成本预估
const estimatedCost = computed(() => {
  if (!currentProvider.value?.pricing) return 0;
  
  const model = form.value.model || Object.keys(currentProvider.value.pricing)[0];
  const size = form.value.size || '1024x1024';
  const count = form.value.n || 1;
  
  const unitCost = currentProvider.value.pricing[model]?.[size] || 0;
  return unitCost * count;
});

// 示例提示词
const examplePrompts = [
  '一只橘猫在窗台上晒太阳',
  '未来城市的天际线，赛博朋克风格',
  '宁静的湖边小屋，水彩画风格',
  '宇航员在太空中漂浮',
  '魔法森林中的发光蘑菇'
];

// 生命周期
onMounted(() => {
  loadSettings();
  if (availableProviders.value.length > 0) {
    form.value.provider = availableProviders.value[0].name;
    onProviderChange();
  }
});

// 方法
const loadSettings = () => {
  try {
    const saved = localStorage.getItem('imageGenerationSettings');
    if (saved) {
      Object.assign(settings.value, JSON.parse(saved));
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
};

const saveSettings = () => {
  ImageGenerationService.saveSettings(settings.value);
  // 重新检查可用服务商
  if (availableProviders.value.length === 0) {
    ElMessage.warning('请先配置至少一个API密钥');
  }
};

const onProviderChange = () => {
  const provider = currentProvider.value;
  if (provider) {
    // 设置默认值
    form.value.model = provider.supportedModels[0] as any;
    form.value.size = provider.supportedSizes.includes('1024x1024') ? '1024x1024' : provider.supportedSizes[0] as any;
    form.value.n = Math.min(form.value.n || 1, provider.maxImages || 1);
  }
};

const optimizePrompt = () => {
  if (!form.value.prompt.trim()) {
    ElMessage.warning('请先输入描述');
    return;
  }
  
  const optimized = ImageGenerationService.optimizePrompt(form.value.prompt);
  form.value.prompt = optimized;
  ElMessage.success('提示词已优化');
};

const showPromptExamples = () => {
  ElMessageBox.alert(
    examplePrompts.join('\n\n'),
    '提示词示例',
    {
      confirmButtonText: '知道了'
    }
  );
};

const useExample = (example: string) => {
  form.value.prompt = example;
};

const generateImage = async () => {
  // 验证提示词
  const validation = ImageGenerationService.validatePrompt(form.value.prompt);
  if (!validation.valid) {
    ElMessage.error(validation.message);
    return;
  }

  if (availableProviders.value.length === 0) {
    ElMessage.error('请先配置API密钥');
    return;
  }

  generating.value = true;
  
  try {
    cancelRequested = false;
    progressPercent.value = 10;
    progressText.value = '提交任务中...';
    const response = await ImageGenerationService.generateImage(form.value, form.value.provider);
    if (cancelRequested) throw new Error('已取消');
    progressPercent.value = 80;
    progressText.value = '接收结果中...';
    
    if (response.success && response.images) {
      generatedImages.value.unshift(...response.images);
      ElMessage.success(`成功生成 ${response.images.length} 张图像`);
      
      if (response.usage?.cost) {
        ElMessage.info(`本次生成费用: $${response.usage.cost.toFixed(4)}`);
      }
    } else {
      throw new Error(response.error || '生成失败');
    }
  } catch (error) {
    console.error('Image generation failed:', error);
    ElMessage.error(error instanceof Error ? error.message : '生成失败');
  } finally {
    progressPercent.value = 100;
    generating.value = false;
  }
};

const cancelGeneration = () => {
  // 当前为 IPC 轮询任务，取消为软取消：仅更新状态并提示用户
  cancelRequested = true;
  generating.value = false;
  progressText.value = '已取消';
  progressPercent.value = 0;
  ElMessage.info('已取消生成');
};

const previewImage = (image: { url: string; revised_prompt?: string }) => {
  currentPreviewImage.value = image;
  previewVisible.value = true;
};

const downloadImage = (image: { url: string; revised_prompt?: string }, index: number) => {
  const link = document.createElement('a');
  link.href = image.url;
  link.download = `ai-generated-${Date.now()}-${index + 1}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  ElMessage.success('图像已下载');
};

const downloadAll = () => {
  generatedImages.value.forEach((image, index) => {
    setTimeout(() => {
      downloadImage(image, index);
    }, index * 100); // 避免同时下载太多文件
  });
};

const copyToClipboard = async (image: { url: string; revised_prompt?: string }) => {
  try {
    if (image.url.startsWith('data:')) {
      // Base64图像
      const response = await fetch(image.url);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } else {
      // URL图像
      await navigator.clipboard.writeText(image.url);
    }
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};

const addToChat = (image: { url: string; revised_prompt?: string }) => {
  // 将图像添加到当前对话
  if (store.currentTab) {
    const messageId = `msg-${Date.now()}`;
    store.currentTab.messages.push({
      id: messageId,
      role: 'assistant',
      content: `🎨 AI生成的图像\n\n**提示词:** ${image.revised_prompt || form.value.prompt}\n**模型:** ${getModelDisplayName(form.value.model)}\n**尺寸:** ${form.value.size}`,
      timestamp: Date.now(),
      richContent: [{
        type: 'image_url',
        image_url: { url: image.url }
      }]
    });
    store.saveTabsToStorage?.();
    ElMessage.success('图像已添加到对话');
    visible.value = false;
  }
};

const clearResults = () => {
  generatedImages.value = [];
  ElMessage.success('结果已清空');
};

const getModelDisplayName = (model?: string) => {
  const names = {
    'dall-e-3': 'DALL-E 3',
    'dall-e-2': 'DALL-E 2',
    'stable-diffusion': 'Stable Diffusion',
    'midjourney-style': 'Midjourney风格',
    'flux-schnell': 'Flux Schnell',
    'flux-dev': 'Flux Dev',
    'wanx-v1': '万象 Wanx V1',
    'wanx-v1-lite': '万象 Wanx V1 Lite',
    'stable-diffusion-3.5-large': 'Stable Diffusion 3.5 Large (部分账号不可用)',
    'stable-diffusion-3.5-large-turbo': 'Stable Diffusion 3.5 Large Turbo (部分账号不可用)'
  };
  return names[model as keyof typeof names] || model || '';
};

// 监听服务商变化
watch(() => form.value.provider, onProviderChange);
</script>

<style scoped>
.image-generation-dialog {
  --panel-border: 1px solid var(--border-light);
}

.generation-container {
  display: flex;
  gap: 20px;
  height: 70vh;
}

.control-panel {
  width: 320px;
  border-right: var(--panel-border);
  padding-right: 20px;
  overflow-y: auto;
}

.prompt-tools {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.provider-option {
  display: flex;
  flex-direction: column;
}

.provider-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.provider-status {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.provider-status.configured {
  background-color: #f0f9ff;
  color: #0369a1;
}

.provider-status.not-configured {
  background-color: #fffbeb;
  color: #d97706;
}

.provider-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 图像生成对话框中的选择器样式优化 */
.control-panel .el-select {
  min-width: 200px;
}

/* 确保下拉选项文本完整显示 */
.control-panel .el-select-dropdown {
  min-width: 250px !important;
}

.control-panel .el-select-dropdown .el-select-dropdown__item {
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
  padding-right: 20px;
}

.cost-estimate {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cost-amount {
  font-weight: bold;
  color: var(--brand-primary);
}

.cost-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

.settings-panel {
  margin-top: 20px;
  padding-top: 20px;
  border-top: var(--panel-border);
}

.result-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.result-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.result-content {
  flex: 1;
  overflow-y: auto;
}

.generating-status {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.image-item {
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease;
}

.image-item:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

.image-wrapper {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-wrapper:hover .image-overlay {
  opacity: 1;
}

.image-actions {
  display: flex;
  gap: 8px;
}

.image-info {
  padding: 12px;
}

.image-prompt {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.image-meta {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.example-prompts {
  margin-top: 20px;
}

.example-prompts p {
  margin-bottom: 12px;
  font-size: 14px;
}

.example-tag {
  margin: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.example-tag:hover {
  background: var(--brand-primary);
  color: white;
}

.preview-container {
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 60vh;
  border-radius: 8px;
  margin-bottom: 16px;
}

.preview-info {
  text-align: left;
  background: var(--bg-surface);
  padding: 16px;
  border-radius: 8px;
}

.preview-info p {
  margin: 8px 0;
  line-height: 1.5;
}

/* 响应式 */
@media (max-width: 768px) {
  .generation-container {
    flex-direction: column;
    height: auto;
  }
  
  .control-panel {
    width: 100%;
    border-right: none;
    border-bottom: var(--panel-border);
    padding-right: 0;
    padding-bottom: 20px;
  }
  
  .image-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }
}
</style>
