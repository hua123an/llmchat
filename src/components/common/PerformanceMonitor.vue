<template>
  <div class="performance-monitor" :class="{ 'is-expanded': isExpanded }">
    <!-- 性能指示器 -->
    <div class="performance-indicator" @click="toggleExpanded">
      <div class="indicator-icon" :class="performanceGrade.grade.toLowerCase()">
        <component :is="getStatusIcon()" />
      </div>
      <div v-if="!isExpanded" class="indicator-text">
        {{ performanceGrade.grade }}
      </div>
    </div>

    <!-- 详细面板 -->
    <Transition name="performance-panel">
      <div v-if="isExpanded" class="performance-panel">
        <!-- 标题栏 -->
        <div class="panel-header">
          <h3 class="panel-title">性能监控</h3>
          <div class="panel-actions">
            <button @click="generateReport" class="action-btn" title="生成报告">
              <ReportIcon />
            </button>
            <button @click="exportData" class="action-btn" title="导出数据">
              <ExportIcon />
            </button>
            <button @click="toggleExpanded" class="action-btn" title="关闭">
              <CloseIcon />
            </button>
          </div>
        </div>

        <!-- 健康度评分 -->
        <div class="health-score">
          <div class="score-circle" :style="{ background: getScoreGradient() }">
            <span class="score-value">{{ healthScore }}</span>
            <span class="score-label">分</span>
          </div>
          <div class="score-info">
            <div class="score-grade" :style="{ color: performanceGrade.color }">
              {{ performanceGrade.grade }} 级 - {{ performanceGrade.description }}
            </div>
            <div v-if="warnings.length" class="score-warnings">
              <div v-for="warning in warnings.slice(0, 2)" :key="warning" class="warning-item">
                ⚠️ {{ warning }}
              </div>
            </div>
          </div>
        </div>

        <!-- 实时指标 -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon fps">
              <FPSIcon />
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ Math.round(currentStats.fps) }}</div>
              <div class="metric-label">FPS</div>
              <div class="metric-trend" :class="getTrendClass('FPS')">
                {{ getTrendText('FPS') }}
              </div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon memory">
              <MemoryIcon />
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ Math.round(currentStats.memoryUsage) }}%</div>
              <div class="metric-label">内存</div>
              <div class="metric-sub">{{ Math.round(currentStats.jsHeapSize) }}MB</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon network">
              <NetworkIcon />
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ Math.round(currentStats.networkLatency) }}</div>
              <div class="metric-label">网络延迟</div>
              <div class="metric-unit">ms</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon render">
              <RenderIcon />
            </div>
            <div class="metric-content">
              <div class="metric-value">{{ Math.round(currentStats.renderTime) }}</div>
              <div class="metric-label">渲染时间</div>
              <div class="metric-unit">ms</div>
            </div>
          </div>
        </div>

        <!-- 组件性能 -->
        <div v-if="componentPerf.renderCount > 0" class="component-perf">
          <h4 class="section-title">组件性能</h4>
          <div class="component-stats">
            <div class="stat-item">
              <span class="stat-label">渲染次数:</span>
              <span class="stat-value">{{ componentPerf.renderCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">平均渲染时间:</span>
              <span class="stat-value">{{ componentPerf.avgRenderTime.toFixed(2) }}ms</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最近渲染时间:</span>
              <span class="stat-value">{{ componentPerf.lastRenderTime.toFixed(2) }}ms</span>
            </div>
          </div>
          <div v-if="componentPerf.warnings.length" class="component-warnings">
            <div v-for="warning in componentPerf.warnings" :key="warning" class="warning-item">
              ⚠️ {{ warning }}
            </div>
          </div>
        </div>

        <!-- 建议 -->
        <div v-if="recommendations.length" class="recommendations">
          <h4 class="section-title">优化建议</h4>
          <ul class="recommendation-list">
            <li v-for="rec in recommendations.slice(0, 3)" :key="rec" class="recommendation-item">
              💡 {{ rec }}
            </li>
          </ul>
        </div>

        <!-- 性能图表 -->
        <div v-if="showChart" class="performance-chart">
          <h4 class="section-title">性能趋势</h4>
          <div class="chart-container">
            <canvas ref="chartCanvas" class="chart-canvas"></canvas>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { usePerformanceMonitor } from '../../composables/usePerformanceMonitor';

// 图标组件
const FPSIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const MemoryIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M15,9H9V7H15M15,16H9V14H15M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
  </svg>
);

const NetworkIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M1,9L3,7.5L5,9V11.5L3,13L1,11.5V9M3,6A1,1 0 0,1 4,7A1,1 0 0,1 3,8A1,1 0 0,1 2,7A1,1 0 0,1 3,6M3,14A1,1 0 0,1 4,15A1,1 0 0,1 3,16A1,1 0 0,1 2,15A1,1 0 0,1 3,14M19,9L21,7.5L23,9V11.5L21,13L19,11.5V9M21,6A1,1 0 0,1 22,7A1,1 0 0,1 21,8A1,1 0 0,1 20,7A1,1 0 0,1 21,6M21,14A1,1 0 0,1 22,15A1,1 0 0,1 21,16A1,1 0 0,1 20,15A1,1 0 0,1 21,14M12,10L14,8.5L16,10V12.5L14,14L12,12.5V10M14,7A1,1 0 0,1 15,8A1,1 0 0,1 14,9A1,1 0 0,1 13,8A1,1 0 0,1 14,7M14,15A1,1 0 0,1 15,16A1,1 0 0,1 14,17A1,1 0 0,1 13,16A1,1 0 0,1 14,15M8,12L9,11L10,12V13.5L9,15L8,13.5V12M9,10A1,1 0 0,1 10,11A1,1 0 0,1 9,12A1,1 0 0,1 8,11A1,1 0 0,1 9,10M9,16A1,1 0 0,1 10,17A1,1 0 0,1 9,18A1,1 0 0,1 8,17A1,1 0 0,1 9,16"/>
  </svg>
);

const RenderIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/>
  </svg>
);

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path fill="currentColor" d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19Z"/>
  </svg>
);

const ExportIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
  </svg>
);

interface Props {
  componentName?: string;
  showChart?: boolean;
  autoStart?: boolean;
  position?: 'fixed' | 'relative';
}

const props = withDefaults(defineProps<Props>(), {
  componentName: 'PerformanceMonitor',
  showChart: false,
  autoStart: true,
  position: 'fixed',
});

// 性能监控 hook
const {
  currentStats,
  componentPerf,
  warnings,
  healthScore,
  performanceGrade,
  analyzePerformance,
  exportData: exportPerformanceData,
} = usePerformanceMonitor({
  componentName: props.componentName,
  autoStart: props.autoStart,
});

// 状态
const isExpanded = ref(false);
const chartCanvas = ref<HTMLCanvasElement>();
const trends = ref<Record<string, 'improving' | 'stable' | 'degrading'>>({});

// 计算属性
const recommendations = computed(() => {
  const analysis = analyzePerformance();
  return analysis?.recommendations || [];
});

// 方法
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
  
  if (isExpanded.value && props.showChart) {
    nextTick(() => {
      initChart();
    });
  }
};

const getStatusIcon = () => {
  const grade = performanceGrade.value.grade;
  if (grade === 'A') return FPSIcon;
  if (grade === 'B') return MemoryIcon;
  if (grade === 'C') return NetworkIcon;
  return RenderIcon;
};

const getScoreGradient = () => {
  const score = healthScore.value;
  if (score >= 90) return 'conic-gradient(from 0deg, #10b981 0%, #10b981 100%)';
  if (score >= 80) return 'conic-gradient(from 0deg, #f59e0b 0%, #f59e0b 100%)';
  if (score >= 70) return 'conic-gradient(from 0deg, #f97316 0%, #f97316 100%)';
  if (score >= 60) return 'conic-gradient(from 0deg, #ef4444 0%, #ef4444 100%)';
  return 'conic-gradient(from 0deg, #dc2626 0%, #dc2626 100%)';
};

const getTrendClass = (metric: string) => {
  const trend = trends.value[metric];
  return trend ? `trend-${trend}` : 'trend-stable';
};

const getTrendText = (metric: string) => {
  const trend = trends.value[metric];
  switch (trend) {
    case 'improving': return '↗️ 改善';
    case 'degrading': return '↘️ 下降';
    default: return '→ 稳定';
  }
};

const generateReport = () => {
  const analysis = analyzePerformance();
  if (analysis) {
    console.log('性能分析报告:', analysis);
    // 这里可以显示详细报告或下载文件
  }
};

const exportData = () => {
  const data = exportPerformanceData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `performance-data-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const initChart = () => {
  if (!chartCanvas.value) return;

  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  const canvas = chartCanvas.value;
  const width = canvas.offsetWidth;
  const height = canvas.offsetHeight;

  canvas.width = width;
  canvas.height = height;

  // 简单的性能趋势图
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = performanceGrade.value.color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  // 模拟数据点
  const points = 20;
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * width;
    const y = height - (Math.random() * height * 0.8 + height * 0.1);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
};

// 生命周期
onMounted(() => {
  // 更新趋势数据
  const updateTrends = () => {
    const analysis = analyzePerformance();
    if (analysis?.trends) {
      trends.value = analysis.trends;
    }
  };

  updateTrends();
  const intervalId = setInterval(updateTrends, 5000);

  onUnmounted(() => {
    clearInterval(intervalId);
  });
});
</script>

<style scoped>
.performance-monitor {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  font-family: var(--font-family);
}

.performance-monitor.is-expanded {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 400px;
  max-width: calc(100vw - 40px);
}

/* 性能指示器 */
.performance-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
}

.performance-indicator:hover {
  background: var(--bg-hover);
  transform: scale(1.05);
}

.indicator-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
}

.indicator-icon.a { background: #10b981; }
.indicator-icon.b { background: #f59e0b; }
.indicator-icon.c { background: #f97316; }
.indicator-icon.d { background: #ef4444; }
.indicator-icon.f { background: #dc2626; }

.indicator-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

/* 详细面板 */
.performance-panel {
  margin-top: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 健康度评分 */
.health-score {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.score-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  position: relative;
}

.score-value {
  font-size: 18px;
  line-height: 1;
}

.score-label {
  font-size: 10px;
  opacity: 0.8;
}

.score-info {
  flex: 1;
}

.score-grade {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}

.score-warnings .warning-item {
  font-size: 12px;
  color: var(--warning-color);
  margin-bottom: 4px;
}

/* 指标网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.metric-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.metric-icon.fps { background: #10b981; }
.metric-icon.memory { background: #f59e0b; }
.metric-icon.network { background: #3b82f6; }
.metric-icon.render { background: #8b5cf6; }

.metric-content {
  flex: 1;
  min-width: 0;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1;
}

.metric-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.metric-unit {
  font-size: 10px;
  color: var(--text-tertiary);
}

.metric-sub {
  font-size: 10px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

.metric-trend {
  font-size: 10px;
  margin-top: 4px;
}

.trend-improving { color: var(--success-color); }
.trend-stable { color: var(--text-secondary); }
.trend-degrading { color: var(--error-color); }

/* 组件性能 */
.component-perf {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.component-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  color: var(--text-primary);
  font-weight: 500;
}

.component-warnings {
  margin-top: 12px;
}

.component-warnings .warning-item {
  font-size: 11px;
  color: var(--warning-color);
  margin-bottom: 4px;
}

/* 建议 */
.recommendations {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.recommendation-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recommendation-item {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.4;
}

/* 性能图表 */
.performance-chart {
  padding: 20px;
}

.chart-container {
  height: 100px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  position: relative;
}

.chart-canvas {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}

/* 过渡动画 */
.performance-panel-enter-active {
  transition: all 0.3s ease-out;
}

.performance-panel-leave-active {
  transition: all 0.2s ease-in;
}

.performance-panel-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.performance-panel-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .performance-monitor {
    top: 10px;
    right: 10px;
  }
  
  .performance-monitor.is-expanded {
    width: calc(100vw - 20px);
    right: 10px;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .health-score {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .performance-panel {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .performance-indicator,
  .performance-panel,
  .metric-card {
    border-width: 2px;
  }
}

/* 减少动画的用户偏好 */
@media (prefers-reduced-motion: reduce) {
  .performance-indicator,
  .action-btn,
  .performance-panel-enter-active,
  .performance-panel-leave-active {
    transition: none;
  }
}
</style>
