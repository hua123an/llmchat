import { ref, computed, onMounted, onUnmounted } from 'vue';
import { inject, SERVICE_TOKENS } from '../services/container';
import type { PerformanceMonitorService, PerformanceMetric, PerformanceReport } from '../services/PerformanceMonitorService';
import type { IEventService } from '../types/services';

export interface PerformanceStats {
  fps: number;
  memoryUsage: number;
  jsHeapSize: number;
  domNodes: number;
  networkLatency: number;
  renderTime: number;
  isHealthy: boolean;
}

export interface ComponentPerformance {
  name: string;
  renderCount: number;
  totalRenderTime: number;
  avgRenderTime: number;
  lastRenderTime: number;
  warnings: string[];
}

export function usePerformanceMonitor(options: {
  componentName?: string;
  trackRenders?: boolean;
  trackProps?: boolean;
  autoStart?: boolean;
} = {}) {
  const {
    componentName = 'Anonymous',
    trackRenders = true,
    trackProps = false,
    autoStart = true,
  } = options;

  // 服务注入
  const performanceService = inject<PerformanceMonitorService>(SERVICE_TOKENS.PERFORMANCE_MONITOR_SERVICE);
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);

  // 状态
  const isMonitoring = ref(false);
  const currentStats = ref<PerformanceStats>({
    fps: 0,
    memoryUsage: 0,
    jsHeapSize: 0,
    domNodes: 0,
    networkLatency: 0,
    renderTime: 0,
    isHealthy: true,
  });

  const componentPerf = ref<ComponentPerformance>({
    name: componentName,
    renderCount: 0,
    totalRenderTime: 0,
    avgRenderTime: 0,
    lastRenderTime: 0,
    warnings: [],
  });

  const recentMetrics = ref<PerformanceMetric[]>([]);
  const latestReport = ref<PerformanceReport | null>(null);

  // 性能警告
  const warnings = ref<string[]>([]);
  const hasPerformanceIssues = computed(() => warnings.value.length > 0);

  // 组件渲染性能追踪
  const renderStartTime = ref(0);
  const renderEndTime = ref(0);

  // 计算属性
  const healthScore = computed(() => {
    const stats = currentStats.value;
    let score = 100;

    // FPS影响 (30%)
    if (stats.fps < 15) score -= 30;
    else if (stats.fps < 30) score -= 15;
    else if (stats.fps < 45) score -= 5;

    // 内存影响 (25%)
    if (stats.memoryUsage > 80) score -= 25;
    else if (stats.memoryUsage > 60) score -= 15;
    else if (stats.memoryUsage > 40) score -= 5;

    // 渲染时间影响 (25%)
    if (stats.renderTime > 33) score -= 25;
    else if (stats.renderTime > 16) score -= 15;
    else if (stats.renderTime > 8) score -= 5;

    // 网络延迟影响 (20%)
    if (stats.networkLatency > 3000) score -= 20;
    else if (stats.networkLatency > 1000) score -= 10;
    else if (stats.networkLatency > 500) score -= 5;

    return Math.max(0, Math.min(100, score));
  });

  const performanceGrade = computed(() => {
    const score = healthScore.value;
    if (score >= 90) return { grade: 'A', color: '#10b981', description: '优秀' };
    if (score >= 80) return { grade: 'B', color: '#f59e0b', description: '良好' };
    if (score >= 70) return { grade: 'C', color: '#f97316', description: '一般' };
    if (score >= 60) return { grade: 'D', color: '#ef4444', description: '较差' };
    return { grade: 'F', color: '#dc2626', description: '很差' };
  });

  // 方法
  const startMonitoring = () => {
    if (!performanceService || isMonitoring.value) return;

    isMonitoring.value = true;
    performanceService.startMonitoring();

    // 监听性能指标
    const unsubscribeMetric = eventService?.on('performance:metric:added', handleMetricUpdate);
    const unsubscribeReport = eventService?.on('performance:report:generated', handleReportUpdate);
    const unsubscribeThreshold = eventService?.on('performance:threshold:exceeded', handleThresholdExceeded);

    // 清理函数
    return () => {
      unsubscribeMetric?.();
      unsubscribeReport?.();
      unsubscribeThreshold?.();
    };
  };

  const stopMonitoring = () => {
    if (!performanceService || !isMonitoring.value) return;

    isMonitoring.value = false;
    performanceService.stopMonitoring();
  };

  const handleMetricUpdate = (metric: PerformanceMetric) => {
    // 更新最近指标
    recentMetrics.value.unshift(metric);
    if (recentMetrics.value.length > 100) {
      recentMetrics.value = recentMetrics.value.slice(0, 100);
    }

    // 更新当前统计
    updateCurrentStats();
  };

  const handleReportUpdate = (report: PerformanceReport) => {
    latestReport.value = report;
    
    // 更新警告
    warnings.value = report.issues.map(issue => issue.description);
  };

  const handleThresholdExceeded = (data: { metric: PerformanceMetric }) => {
    const warning = `性能警告: ${data.metric.name} 超过阈值 (${data.metric.value}${data.metric.unit})`;
    
    if (!warnings.value.includes(warning)) {
      warnings.value.push(warning);
    }

    // 自动清理旧警告
    setTimeout(() => {
      const index = warnings.value.indexOf(warning);
      if (index !== -1) {
        warnings.value.splice(index, 1);
      }
    }, 30000); // 30秒后清除警告
  };

  const updateCurrentStats = () => {
    if (!performanceService) return;

    const recent = performanceService.getMetrics({ timeRange: 10000 }); // 最近10秒

    // 计算平均值
    const fps = recent.filter(m => m.name === 'FPS');
    const memory = recent.filter(m => m.name === 'MemoryUsage');
    const jsHeap = recent.filter(m => m.name === 'JSHeapSize');
    const dom = recent.filter(m => m.name === 'DOMNodes');
    const network = recent.filter(m => m.category === 'network');
    const render = recent.filter(m => m.category === 'render');

    currentStats.value = {
      fps: fps.length ? fps.reduce((sum, m) => sum + m.value, 0) / fps.length : 0,
      memoryUsage: memory.length ? memory[0].value : 0,
      jsHeapSize: jsHeap.length ? jsHeap[0].value : 0,
      domNodes: dom.length ? dom[0].value : 0,
      networkLatency: network.length ? network.reduce((sum, m) => sum + m.value, 0) / network.length : 0,
      renderTime: render.length ? render.reduce((sum, m) => sum + m.value, 0) / render.length : 0,
      isHealthy: healthScore.value >= 70,
    };
  };

  // 组件渲染追踪
  const startRenderTracking = () => {
    if (!trackRenders) return;

    renderStartTime.value = performance.now();
  };

  const endRenderTracking = () => {
    if (!trackRenders || renderStartTime.value === 0) return;

    renderEndTime.value = performance.now();
    const renderTime = renderEndTime.value - renderStartTime.value;

    // 更新组件性能统计
    componentPerf.value.renderCount++;
    componentPerf.value.totalRenderTime += renderTime;
    componentPerf.value.avgRenderTime = componentPerf.value.totalRenderTime / componentPerf.value.renderCount;
    componentPerf.value.lastRenderTime = renderTime;

    // 检查渲染性能警告
    checkRenderWarnings(renderTime);

    renderStartTime.value = 0;
  };

  const checkRenderWarnings = (renderTime: number) => {
    const warnings: string[] = [];

    if (renderTime > 16.67) {
      warnings.push(`渲染时间过长: ${renderTime.toFixed(2)}ms (建议<16.67ms)`);
    }

    if (componentPerf.value.renderCount > 100 && componentPerf.value.avgRenderTime > 10) {
      warnings.push(`平均渲染时间偏高: ${componentPerf.value.avgRenderTime.toFixed(2)}ms`);
    }

    if (componentPerf.value.renderCount > 50) {
      const recentRenders = componentPerf.value.renderCount;
      if (recentRenders > 100) {
        warnings.push(`渲染次数过多: ${recentRenders} 次，可能存在不必要的重渲染`);
      }
    }

    componentPerf.value.warnings = warnings;
  };

  // 性能分析
  const analyzePerformance = () => {
    if (!performanceService) return null;

    const metrics = performanceService.getMetrics({ timeRange: 60000 }); // 最近1分钟
    const analysis = {
      summary: currentStats.value,
      healthScore: healthScore.value,
      grade: performanceGrade.value,
      trends: calculateTrends(metrics),
      recommendations: generateRecommendations(),
      component: componentPerf.value,
    };

    return analysis;
  };

  const calculateTrends = (metrics: PerformanceMetric[]) => {
    const groupByMetric = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) acc[metric.name] = [];
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    const trends: Record<string, 'improving' | 'stable' | 'degrading'> = {};

    Object.entries(groupByMetric).forEach(([name, values]) => {
      if (values.length < 5) {
        trends[name] = 'stable';
        return;
      }

      const recent = values.slice(-5);
      const earlier = values.slice(-10, -5);
      
      if (earlier.length === 0) {
        trends[name] = 'stable';
        return;
      }

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      
      const change = (recentAvg - earlierAvg) / earlierAvg;

      if (Math.abs(change) < 0.05) {
        trends[name] = 'stable';
      } else if (name === 'FPS' ? change > 0 : change < 0) {
        trends[name] = 'improving';
      } else {
        trends[name] = 'degrading';
      }
    });

    return trends;
  };

  const generateRecommendations = (): string[] => {
    const recommendations: string[] = [];
    const stats = currentStats.value;

    if (stats.fps < 30) {
      recommendations.push('考虑优化动画和减少DOM操作频率');
      recommendations.push('使用requestAnimationFrame进行动画');
    }

    if (stats.memoryUsage > 70) {
      recommendations.push('检查内存泄漏，清理不必要的引用');
      recommendations.push('使用对象池技术重用对象');
    }

    if (stats.renderTime > 16) {
      recommendations.push('优化组件渲染逻辑，避免不必要的重渲染');
      recommendations.push('使用React.memo或Vue的v-memo进行优化');
    }

    if (componentPerf.value.avgRenderTime > 10) {
      recommendations.push(`${componentName}组件渲染时间过长，考虑拆分为更小的组件`);
      recommendations.push('检查props变化是否导致不必要的重渲染');
    }

    return recommendations;
  };

  // 性能测试
  const runPerformanceTest = async (testName: string, testFn: () => void | Promise<void>) => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    try {
      await testFn();
    } catch (error) {
      console.error(`Performance test "${testName}" failed:`, error);
      return null;
    }

    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

    const result = {
      name: testName,
      duration: endTime - startTime,
      memoryDelta: endMemory - startMemory,
      timestamp: Date.now(),
    };

    console.log(`🧪 Performance test "${testName}":`, result);
    return result;
  };

  // 内存使用监控
  const checkMemoryUsage = () => {
    if (!(performance as any).memory) return null;

    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      usage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
    };
  };

  // 生命周期
  onMounted(() => {
    if (autoStart) {
      startMonitoring();
    }

    if (trackRenders) {
      startRenderTracking();
    }
  });

  onUnmounted(() => {
    if (trackRenders) {
      endRenderTracking();
    }

    if (isMonitoring.value) {
      stopMonitoring();
    }
  });

  return {
    // 状态
    isMonitoring: isMonitoring.value,
    currentStats: currentStats.value,
    componentPerf: componentPerf.value,
    recentMetrics: recentMetrics.value,
    latestReport: latestReport.value,
    warnings: warnings.value,
    hasPerformanceIssues,
    healthScore,
    performanceGrade,

    // 方法
    startMonitoring,
    stopMonitoring,
    startRenderTracking,
    endRenderTracking,
    analyzePerformance,
    runPerformanceTest,
    checkMemoryUsage,

    // 获取数据
    getMetrics: (filter?: any) => performanceService?.getMetrics(filter) || [],
    getReports: () => performanceService?.getReports() || [],
    exportData: () => performanceService?.exportData() || { metrics: [], reports: [], userActions: [] },
  };
}
