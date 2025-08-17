<template>
  <div class="shengsuanyun-demo">
    <div class="demo-header">
      <h2>🎯 胜算云功能演示</h2>
      <p>体验联网搜索、思考模式和文生图功能</p>
    </div>

    <!-- 联网搜索演示 -->
    <div class="demo-section">
      <h3>🔍 联网搜索</h3>
      <div class="search-input">
        <input 
          v-model="searchQuery" 
          placeholder="输入搜索关键词..."
          @keyup.enter="performWebSearch"
        />
        <button @click="performWebSearch" :disabled="isSearching">
          {{ isSearching ? '搜索中...' : '搜索' }}
        </button>
      </div>
      
      <div v-if="searchResults.length > 0" class="search-results">
        <h4>搜索结果 ({{ searchResults.length }})</h4>
        <div v-for="(result, index) in searchResults" :key="index" class="search-result">
          <h5>{{ result.title }}</h5>
          <p>{{ result.snippet }}</p>
          <small>来源: {{ result.source }} | 时间: {{ formatTime(result.timestamp) }}</small>
        </div>
      </div>
    </div>

    <!-- 思考模式演示 -->
    <div class="demo-section">
      <h3>🧠 思考模式</h3>
      <div class="thinking-input">
        <textarea 
          v-model="thinkingQuery" 
          placeholder="输入需要深度思考的问题..."
          rows="3"
        ></textarea>
        <button @click="performThinkingSearch" :disabled="isThinking">
          {{ isThinking ? '思考中...' : '开始思考' }}
        </button>
      </div>
      
      <div v-if="thinkingResult.thinkingProcess || thinkingResult.finalAnswer" class="thinking-results">
        <div v-if="thinkingResult.thinkingProcess" class="thinking-process">
          <h4>思考过程</h4>
          <div class="process-content">{{ thinkingResult.thinkingProcess }}</div>
        </div>
        
        <div v-if="thinkingResult.finalAnswer" class="final-answer">
          <h4>最终答案</h4>
          <div class="answer-content">{{ thinkingResult.finalAnswer }}</div>
        </div>
      </div>
    </div>

    <!-- 文生图演示 -->
    <div class="demo-section">
      <h3>🎨 文生图</h3>
      
      <!-- 配置检查 -->
      <div v-if="!isConfigured" class="config-check">
        <ShengsuanyunConfig />
      </div>
      
      <!-- 文生图功能 -->
      <div v-else>
        <div class="image-input">
          <textarea 
            v-model="imagePrompt" 
            placeholder="描述你想要生成的图像..."
            rows="3"
          ></textarea>
          
          <div class="image-options">
            <select v-model="selectedModel">
              <option value="stable-diffusion">Stable Diffusion</option>
              <option value="dall-e-3">DALL-E 3</option>
              <option value="dall-e-2">DALL-E 2</option>
              <option value="midjourney-style">Midjourney风格</option>
            </select>
            
            <select v-model="selectedSize">
              <option value="512x512">512x512</option>
              <option value="1024x1024">1024x1024</option>
              <option value="1792x1024">1792x1024</option>
              <option value="1024x1792">1024x1792</option>
            </select>
          </div>
          
          <button @click="generateImage" :disabled="isGenerating">
            {{ isGenerating ? '生成中...' : '生成图像' }}
          </button>
        </div>
        
        <div v-if="generatedImages.length > 0" class="generated-images">
          <h4>生成的图像 ({{ generatedImages.length }})</h4>
          <div class="image-grid">
            <div v-for="(image, index) in generatedImages" :key="index" class="image-item">
              <img :src="image.url" :alt="`生成的图像 ${index + 1}`" />
              <p v-if="image.revised_prompt" class="revised-prompt">
                优化提示词: {{ image.revised_prompt }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索建议演示 -->
    <div class="demo-section">
      <h3>💡 搜索建议</h3>
      <div class="suggestions-input">
        <input 
          v-model="suggestionsQuery" 
          placeholder="输入部分关键词获取搜索建议..."
          @input="getSearchSuggestions"
        />
      </div>
      
      <div v-if="searchSuggestions.length > 0" class="suggestions-results">
        <h4>搜索建议</h4>
        <div class="suggestions-list">
          <span 
            v-for="(suggestion, index) in searchSuggestions" 
            :key="index"
            class="suggestion-tag"
            @click="useSuggestion(suggestion)"
          >
            {{ suggestion }}
          </span>
        </div>
      </div>
    </div>

    <!-- 状态信息 -->
    <div class="demo-status">
      <p v-if="lastError" class="error-message">❌ {{ lastError }}</p>
      <p v-if="lastSuccess" class="success-message">✅ {{ lastSuccess }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { 
  shengsuanyunWebSearch, 
  shengsuanyunThinkingSearch, 
  shengsuanyunSearchSuggestions,
  type ShengsuanyunSearchResult 
} from '../../services/search/shengsuanyun';
import { ImageGenerationService } from '../../services/ImageGenerationService';
import ShengsuanyunConfig from './ShengsuanyunConfig.vue';

// 响应式数据
const searchQuery = ref('');
const thinkingQuery = ref('');
const imagePrompt = ref('');
const selectedModel = ref('stable-diffusion');
const selectedSize = ref('1024x1024');
const suggestionsQuery = ref('');

// 状态
const isSearching = ref(false);
const isThinking = ref(false);
const isGenerating = ref(false);
const isConfigured = ref(false);

// 结果
const searchResults = ref<ShengsuanyunSearchResult[]>([]);
const thinkingResult = reactive({
  thinkingProcess: '',
  finalAnswer: ''
});
const generatedImages = ref<Array<{ url: string; revised_prompt?: string }>>([]);
const searchSuggestions = ref<string[]>([]);

// 消息
const lastError = ref('');
const lastSuccess = ref('');

// 检查配置状态
async function checkConfiguration() {
  try {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const hasKey = await (window as any).electronAPI.hasProviderKey('shengsuanyun');
      isConfigured.value = hasKey.hasKey;
    } else {
      isConfigured.value = false;
    }
  } catch (error) {
    console.error('检查配置失败:', error);
    isConfigured.value = false;
  }
}

// 组件挂载时检查配置
onMounted(() => {
  checkConfiguration();
});

// 联网搜索
async function performWebSearch() {
  if (!searchQuery.value.trim()) {
    showError('请输入搜索关键词');
    return;
  }

  isSearching.value = true;
  lastError.value = '';
  lastSuccess.value = '';

  try {
    const results = await shengsuanyunWebSearch(searchQuery.value, {
      search_context_size: 'medium',
      max_results: 5
    });
    
    searchResults.value = results;
    showSuccess(`搜索完成，获得 ${results.length} 个结果`);
  } catch (error) {
    showError(`搜索失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    isSearching.value = false;
  }
}

// 思考模式搜索
async function performThinkingSearch() {
  if (!thinkingQuery.value.trim()) {
    showError('请输入需要思考的问题');
    return;
  }

  isThinking.value = true;
  lastError.value = '';
  lastSuccess.value = '';

  try {
    const result = await shengsuanyunThinkingSearch(thinkingQuery.value, {
      search_context_size: 'high',
      max_results: 3
    });
    
    thinkingResult.thinkingProcess = result.thinkingProcess;
    thinkingResult.finalAnswer = result.finalAnswer;
    showSuccess('思考模式搜索完成');
  } catch (error) {
    showError(`思考模式搜索失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    isThinking.value = false;
  }
}

// 生成图像
async function generateImage() {
  if (!imagePrompt.value.trim()) {
    showError('请输入图像描述');
    return;
  }

  isGenerating.value = true;
  lastError.value = '';
  lastSuccess.value = '';

  try {
    const result = await ImageGenerationService.generateImage({
      prompt: imagePrompt.value,
      model: selectedModel.value as any,
      size: selectedSize.value as any,
      n: 1
    }, 'shengsuanyun');
    
    if (result.success && result.images) {
      generatedImages.value = result.images;
      showSuccess('图像生成完成');
    } else {
      throw new Error(result.error || '图像生成失败');
    }
  } catch (error) {
    showError(`图像生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    isGenerating.value = false;
  }
}

// 获取搜索建议
async function getSearchSuggestions() {
  if (!suggestionsQuery.value.trim()) {
    searchSuggestions.value = [];
    return;
  }

  try {
    const suggestions = await shengsuanyunSearchSuggestions(suggestionsQuery.value, 5);
    searchSuggestions.value = suggestions;
  } catch (error) {
    console.error('获取搜索建议失败:', error);
    searchSuggestions.value = [];
  }
}

// 使用搜索建议
function useSuggestion(suggestion: string) {
  searchQuery.value = suggestion;
  suggestionsQuery.value = suggestion;
  performWebSearch();
}

// 工具函数
function showError(message: string) {
  lastError.value = message;
  lastSuccess.value = '';
}

function showSuccess(message: string) {
  lastSuccess.value = message;
  lastError.value = '';
}

function formatTime(timestamp: string | undefined): string {
  if (!timestamp) return '未知时间';
  try {
    return new Date(timestamp).toLocaleString('zh-CN');
  } catch {
    return timestamp;
  }
}
</script>

<style scoped>
.shengsuanyun-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.demo-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.demo-header h2 {
  margin: 0 0 10px 0;
  font-size: 28px;
}

.demo-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 16px;
}

.demo-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
}

.demo-section h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 20px;
}

.search-input,
.thinking-input,
.image-input,
.suggestions-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.search-input {
  flex-direction: row;
}

.search-input input,
.thinking-input textarea,
.image-input textarea,
.suggestions-input input {
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.search-input input:focus,
.thinking-input textarea:focus,
.image-input textarea:focus,
.suggestions-input input:focus {
  outline: none;
  border-color: #667eea;
}

.search-input button,
.thinking-input button,
.image-input button {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.search-input button:hover,
.thinking-input button:hover,
.image-input button:hover {
  background: #5a6fd8;
}

.search-input button:disabled,
.thinking-input button:disabled,
.image-input button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.image-options {
  display: flex;
  gap: 10px;
}

.image-options select {
  padding: 8px;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  font-size: 14px;
}

.search-results,
.thinking-results,
.generated-images,
.suggestions-results {
  margin-top: 20px;
}

.search-results h4,
.thinking-results h4,
.generated-images h4,
.suggestions-results h4 {
  margin: 0 0 15px 0;
  color: #34495e;
  font-size: 18px;
}

.search-result {
  padding: 15px;
  margin-bottom: 10px;
  border: 1px solid #ecf0f1;
  border-radius: 6px;
  background: #f8f9fa;
}

.search-result h5 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 16px;
}

.search-result p {
  margin: 0 0 8px 0;
  color: #34495e;
  line-height: 1.5;
}

.search-result small {
  color: #7f8c8d;
  font-size: 12px;
}

.thinking-process,
.final-answer {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ecf0f1;
  border-radius: 6px;
  background: #f8f9fa;
}

.process-content,
.answer-content {
  line-height: 1.6;
  color: #34495e;
  white-space: pre-wrap;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.image-item {
  text-align: center;
}

.image-item img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.revised-prompt {
  margin-top: 10px;
  font-size: 12px;
  color: #7f8c8d;
  line-height: 1.4;
}

.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-tag {
  padding: 6px 12px;
  background: #ecf0f1;
  color: #34495e;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.suggestion-tag:hover {
  background: #bdc3c7;
}

.config-check {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #e1e5e9;
  border-radius: 6px;
  background: #f8f9fa;
  text-align: center;
}

.demo-status {
  margin-top: 20px;
  text-align: center;
}

.error-message {
  color: #e74c3c;
  background: #fdf2f2;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #fecaca;
}

.success-message {
  color: #27ae60;
  background: #f0fdf4;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

@media (max-width: 768px) {
  .shengsuanyun-demo {
    padding: 15px;
  }
  
  .search-input {
    flex-direction: column;
  }
  
  .image-options {
    flex-direction: column;
  }
  
  .image-grid {
    grid-template-columns: 1fr;
  }
}
</style>
