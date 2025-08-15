<template>
  <div class="welcome-page">
    <!-- 顶部区域 -->
    <div class="welcome-header">
      <div class="welcome-logo">
        <div class="app-logo-icon" aria-hidden="true"></div>
      </div>
      <h1 class="welcome-title">欢迎使用 ChatLLM</h1>
      <p class="welcome-subtitle">您的个人专业AI助手，可以帮助您完成几乎任何想象得到的任务</p>
    </div>

    <!-- 快速操作（设置 / 提示词库 / 插件） -->
    <div class="quick-ctas">
      <button class="cta-btn" @click="openProviders"><span>⚙️</span> 配置模型</button>
      <button class="cta-btn" @click="openPrompts"><span>📚</span> 提示词库</button>
      <button class="cta-btn" @click="openPlugins"><span>🧩</span> 插件中心</button>
    </div>

    <!-- 快速模板栅格 -->
    <div class="prompt-grid">
      <div class="prompt-card" v-for="p in quickPrompts" :key="p.key" @click="applyQuickPrompt(p)">
        <div class="prompt-icon" :class="p.key">{{ p.icon }}</div>
        <div class="prompt-meta">
          <div class="prompt-title">{{ p.title }}</div>
          <div class="prompt-desc">{{ p.desc }}</div>
        </div>
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

    
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useChatStore } from '../store/chat';

const store = useChatStore();
// 快速模板
const quickPrompts = ref([
  { key: 'summarize', icon: '📝', title: '总结/要点', desc: '把文本提炼为要点与行动项', tpl: '请将以下内容用要点总结，并给出可执行的行动项：\n\n' },
  { key: 'translate', icon: '🌐', title: '多语言翻译', desc: '自动检测语言并翻译到英文', tpl: '请将以下内容翻译成英文：\n\n' },
  { key: 'rewrite', icon: '✨', title: '润色改写', desc: '输出精简/正式/口语三版', tpl: '请基于以下文本，输出精简/正式/口语三种改写版本：\n\n' },
  { key: 'url', icon: '🔗', title: 'URL 抓取总结', desc: '输入网址，获取正文并总结', tpl: '请抓取并总结该网页的要点：' },
  { key: 'doc', icon: '📄', title: '文档速读', desc: '上传文档，一键读懂', tpl: '请阅读已上传的文档并生成摘要/关键要点/目录。' },
  { key: 'ocr', icon: '🖼️', title: 'OCR 识图', desc: '粘贴或上传图片提取文字', tpl: '请从图片中识别文字，并按小节整理。' },
]);

const applyQuickPrompt = (p: any) => {
  store.userInput = p.tpl;
};

const openProviders = () => { store.isSettingsOpen = true; };
const openPrompts = () => { (store as any).openPrompts?.(); };
const openPlugins = () => { (store as any).openPlugins?.(); };

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
// const handleFeatureClick = (_feature: string) => {
//   // 根据功能类型设置输入框内容
//   const prompts = {
//     'general-writing': '帮我写一篇关于',
//     'academic-writing': '帮我写一篇学术论文关于',
//     'generate-image': '帮我生成一张图片：',
//     'code-snippet': '帮我写代码：',
//     'get-idea': '给我一些创意想法关于'
//   };
//   
//   // 直接设置用户输入内容，让用户完善后发送
//   if (prompts[_feature as keyof typeof prompts]) {
//     store.userInput = prompts[_feature as keyof typeof prompts];
//   }
// };

// 处理历史记录点击
const handleHistoryClick = (item: any) => {
  console.log('History item clicked:', item);
  // 这里可以恢复历史对话或创建基于历史项的新对话
};

// 处理升级点击
// const handleUpgradeClick = () => {
//   console.log('Upgrade clicked');
//   // 这里可以打开升级页面或弹窗
// };
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

/* 顶部区域 logo 使用与侧栏一致的渐变方块 */
.app-logo-icon { width:56px; height:56px; border-radius:12px; margin:0 auto; background: conic-gradient(from 45deg, #f59e0b, #ef4444, #8b5cf6, #10b981, #f59e0b); box-shadow: 0 2px 4px rgba(0,0,0,.18); }

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

/* 快速 CTA */
.quick-ctas { display:flex; gap:12px; margin: 16px 0 24px; }
.cta-btn { display:flex; gap:6px; align-items:center; padding:8px 12px; border-radius:10px; border:1px solid var(--border-light); background: var(--bg-container); color: var(--text-primary); cursor:pointer; }
.cta-btn:hover { border-color: var(--brand-primary); background: var(--bg-hover); }

/* 模板栅格 */
.prompt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 1000px;
  margin-bottom: 40px;
}

.prompt-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px;
  background: var(--bg-container);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  cursor: pointer;
  transition: all .2s ease;
}
.prompt-card:hover { transform: translateY(-1px); border-color: var(--brand-primary); background: var(--bg-hover); }

.prompt-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; }
.prompt-icon.summarize { background: rgba(59,130,246,.1); color:#3b82f6; }
.prompt-icon.translate { background: rgba(20,184,166,.12); color:#14b8a6; }
.prompt-icon.rewrite { background: rgba(168,85,247,.12); color:#a855f7; }
.prompt-icon.url { background: rgba(234,179,8,.12); color:#eab308; }
.prompt-icon.doc { background: rgba(99,102,241,.12); color:#6366f1; }
.prompt-icon.ocr { background: rgba(34,197,94,.12); color:#22c55e; }

.prompt-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.prompt-desc { font-size: 13px; color: var(--text-secondary); }

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
