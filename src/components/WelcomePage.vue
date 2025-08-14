<template>
  <div class="welcome-page">
    <!-- 顶部区域 -->
    <div class="welcome-header">
      <div class="welcome-logo">
        <div class="logo-icon">⚡</div>
      </div>
      <h1 class="welcome-title">欢迎使用 Clarity AI</h1>
      <p class="welcome-subtitle">您的个人专业AI助手，可以帮助您完成几乎任何想象得到的任务</p>
    </div>

    <!-- 功能卡片 -->
    <div class="feature-cards">
      <div class="feature-card" @click="handleFeatureClick('general-writing')">
        <div class="card-icon general-writing">📝</div>
        <h3 class="card-title">通用写作</h3>
        <p class="card-description">为所有需求提供全面的写作帮助</p>
      </div>
      
      <div class="feature-card" @click="handleFeatureClick('academic-writing')">
        <div class="card-icon academic-writing">🎓</div>
        <h3 class="card-title">学术写作</h3>
        <p class="card-description">通过 Clarity 帮助获得 4.0 学分</p>
      </div>
      
      <div class="feature-card" @click="handleFeatureClick('generate-image')">
        <div class="card-icon generate-image">🎨</div>
        <h3 class="card-title">生成图像</h3>
        <p class="card-description">由 Clarity AI 创建令人惊叹的图像</p>
      </div>
      
      <div class="feature-card" @click="handleFeatureClick('code-snippet')">
        <div class="card-icon code-snippet">💻</div>
        <h3 class="card-title">代码片段</h3>
        <p class="card-description">通过编码解决方案获得即时高效帮助</p>
      </div>
      
      <div class="feature-card" @click="handleFeatureClick('get-idea')">
        <div class="card-icon get-idea">💡</div>
        <h3 class="card-title">获取想法</h3>
        <p class="card-description">通过创新建议激发创造力</p>
      </div>
    </div>

    <!-- 历史记录区域 -->
    <div class="history-section">
      <div class="history-group">
        <h3 class="history-title">今天</h3>
        <div class="history-items">
          <div class="history-item" v-for="item in todayHistory" :key="item.id" @click="handleHistoryClick(item)">
            <div class="history-icon">📄</div>
            <span class="history-text">{{ item.title }}</span>
          </div>
        </div>
      </div>
      
      <div class="history-group" v-if="yesterdayHistory.length > 0">
        <h3 class="history-title">昨天</h3>
        <div class="history-items">
          <div class="history-item" v-for="item in yesterdayHistory" :key="item.id" @click="handleHistoryClick(item)">
            <div class="history-icon">📄</div>
            <span class="history-text">{{ item.title }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 升级提示 -->
    <div class="upgrade-banner">
      <div class="upgrade-content">
        <div class="upgrade-icon">👑</div>
        <span class="upgrade-text">升级到企业版以获得无限制的 Clarity 使用</span>
        <button class="upgrade-btn" @click="handleUpgradeClick">立即升级 →</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useChatStore } from '../store/chat';

const store = useChatStore();

// 模拟历史记录数据
const todayHistory = ref([
  { id: 1, title: '穿皮划艇要穿什么' },
  { id: 2, title: 'Redux代码示例' },
  { id: 3, title: '篮球运动员图像' }
]);

const yesterdayHistory = ref([
  { id: 4, title: 'React JS代码库' },
  { id: 5, title: '巴塞罗那旅行计划' },
  { id: 6, title: '颜色变量命名' },
  { id: 7, title: '学术写作示例' }
]);

// 处理功能卡片点击
const handleFeatureClick = (feature: string) => {
  // 根据功能类型设置输入框内容
  const prompts = {
    'general-writing': '帮我写一篇关于',
    'academic-writing': '帮我写一篇学术论文关于',
    'generate-image': '帮我生成一张图片：',
    'code-snippet': '帮我写代码：',
    'get-idea': '给我一些创意想法关于'
  };
  
  // 直接设置用户输入内容，让用户完善后发送
  if (prompts[feature as keyof typeof prompts]) {
    store.userInput = prompts[feature as keyof typeof prompts];
  }
};

// 处理历史记录点击
const handleHistoryClick = (item: any) => {
  console.log('History item clicked:', item);
  // 这里可以恢复历史对话或创建基于历史项的新对话
};

// 处理升级点击
const handleUpgradeClick = () => {
  console.log('Upgrade clicked');
  // 这里可以打开升级页面或弹窗
};
</script>

<style scoped>
.welcome-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  max-width: 1000px;
  margin: 0 auto;
  background: var(--bg-page);
  min-height: 100vh;
}

/* 顶部区域 */
.welcome-header {
  text-align: center;
  margin-bottom: 48px;
}

.welcome-logo {
  margin-bottom: 24px;
}

.logo-icon {
  font-size: 48px;
  color: var(--brand-primary);
}

.welcome-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px 0;
  letter-spacing: -0.025em;
}

.welcome-subtitle {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0;
  max-width: 600px;
  line-height: 1.5;
}

/* 功能卡片 */
.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  width: 100%;
  max-width: 900px;
  margin-bottom: 48px;
}

.feature-card {
  background: var(--bg-container);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 24px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 暗色主题下的卡片阴影 */
[data-theme="dark"] .feature-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: var(--brand-primary);
}

/* 暗色主题下的卡片悬停阴影 */
[data-theme="dark"] .feature-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.card-icon {
  font-size: 32px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 12px;
  margin: 0 auto 16px;
}

.card-icon.general-writing {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.card-icon.academic-writing {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.card-icon.generate-image {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}

.card-icon.code-snippet {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.card-icon.get-idea {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.card-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

/* 历史记录区域 */
.history-section {
  width: 100%;
  max-width: 600px;
  margin-bottom: 32px;
}

.history-group {
  margin-bottom: 32px;
}

.history-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
}

.history-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-container);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-item:hover {
  background: var(--bg-hover);
  border-color: var(--brand-primary);
}

.history-icon {
  font-size: 16px;
  margin-right: 12px;
  color: var(--text-tertiary);
}

.history-text {
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

/* 升级提示 */
.upgrade-banner {
  width: 100%;
  max-width: 600px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px 24px;
  margin-top: auto;
}

.upgrade-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.upgrade-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.upgrade-text {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
}

.upgrade-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.upgrade-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .welcome-page {
    padding: 20px 16px;
  }
  
  .welcome-title {
    font-size: 24px;
  }
  
  .feature-cards {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
  }
  
  .feature-card {
    padding: 20px 16px;
  }
  
  .card-icon {
    width: 50px;
    height: 50px;
    font-size: 24px;
  }
  
  .upgrade-content {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .upgrade-btn {
    align-self: stretch;
  }
}

@media (max-width: 480px) {
  .feature-cards {
    grid-template-columns: 1fr;
  }
}
</style>
