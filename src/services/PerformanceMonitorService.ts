import { injectable, SERVICE_TOKENS, inject } from './container';
import type { IEventService } from '../types/services';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'runtime' | 'network' | 'memory' | 'render' | 'user';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export interface PerformanceReport {
  id: string;
  timestamp: number;
  duration: number;
  metrics: PerformanceMetric[];
  summary: {
    avgFPS: number;
    memoryUsage: number;
    networkLatency: number;
    renderTime: number;
    jsHeapSize: number;
  };
  recommendations: string[];
  issues: Array<{
    type: string;
    severity: string;
    description: string;
    suggestion: string;
  }>;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface UserAction {
  id: string;
  type: string;
  timestamp: number;
  duration?: number;
  element?: string;
  metadata?: Record<string, any>;
}

@injectable(SERVICE_TOKENS.PERFORMANCE_MONITOR_SERVICE)
export class PerformanceMonitorService {
  private eventService: IEventService;
  private metrics: PerformanceMetric[] = [];
  private reports: PerformanceReport[] = [];
  private userActions: UserAction[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private intervals: Map<string, number> = new Map();
  private isMonitoring = false;
  private startTime = 0;

  // 默认性能阈值
  private thresholds: PerformanceThreshold[] = [
    { metric: 'FPS', warning: 30, critical: 15, unit: 'fps' },
    { metric: 'MemoryUsage', warning: 100, critical: 200, unit: 'MB' },
    { metric: 'NetworkLatency', warning: 1000, critical: 3000, unit: 'ms' },
    { metric: 'RenderTime', warning: 16.67, critical: 33.33, unit: 'ms' },
    { metric: 'JSHeapSize', warning: 50, critical: 100, unit: 'MB' },
    { metric: 'DOMNodes', warning: 5000, critical: 10000, unit: 'nodes' },
    { metric: 'LongTask', warning: 50, critical: 100, unit: 'ms' },
  ];

  constructor() {
    this.eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);
    this.setupEventListeners();
  }

  // 启动性能监控
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.startTime = performance.now();
    
    console.log('🚀 Performance monitoring started');

    // 启动各种监控
    this.startFPSMonitoring();
    this.startMemoryMonitoring();
    this.startNetworkMonitoring();
    this.startRenderMonitoring();
    this.startLongTaskMonitoring();
    this.startNavigationMonitoring();
    this.startUserActionTracking();

    // 发送监控开始事件
    this.eventService.emit('performance:monitoring:started', {
      timestamp: Date.now(),
    });
  }

  // 停止性能监控
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // 清理监控器
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // 清理定时器
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    console.log('⏹️ Performance monitoring stopped');

    // 生成最终报告
    this.generateReport();

    // 发送监控停止事件
    this.eventService.emit('performance:monitoring:stopped', {
      timestamp: Date.now(),
      duration: performance.now() - this.startTime,
    });
  }

  // FPS监控
  private startFPSMonitoring(): void {
    let frames = 0;
    let lastTime = performance.now();

    const measureFPS = () => {
      frames++;
      const now = performance.now();
      
      if (now - lastTime >= 1000) {
        const fps = Math.round((frames * 1000) / (now - lastTime));
        
        this.addMetric({
          name: 'FPS',
          value: fps,
          unit: 'fps',
          category: 'render',
          severity: this.getSeverity('FPS', fps),
        });

        frames = 0;
        lastTime = now;
      }

      if (this.isMonitoring) {
        requestAnimationFrame(measureFPS);
      }
    };

    requestAnimationFrame(measureFPS);
  }

  // 内存监控
  private startMemoryMonitoring(): void {
    const measureMemory = () => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        
        // JS堆大小
        const jsHeapSize = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        this.addMetric({
          name: 'JSHeapSize',
          value: jsHeapSize,
          unit: 'MB',
          category: 'memory',
          severity: this.getSeverity('JSHeapSize', jsHeapSize),
          context: {
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
          },
        });

        // 内存使用率
        const memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        this.addMetric({
          name: 'MemoryUsage',
          value: memoryUsage,
          unit: '%',
          category: 'memory',
          severity: this.getSeverity('MemoryUsage', memoryUsage),
        });
      }

      // DOM节点数量
      const domNodes = document.querySelectorAll('*').length;
      this.addMetric({
        name: 'DOMNodes',
        value: domNodes,
        unit: 'nodes',
        category: 'render',
        severity: this.getSeverity('DOMNodes', domNodes),
      });
    };

    const interval = setInterval(measureMemory, 2000);
    this.intervals.set('memory', interval);
  }

  // 网络监控
  private startNetworkMonitoring(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            
            // DNS查询时间
            this.addMetric({
              name: 'DNSLookup',
              value: nav.domainLookupEnd - nav.domainLookupStart,
              unit: 'ms',
              category: 'network',
            });

            // TCP连接时间
            this.addMetric({
              name: 'TCPConnect',
              value: nav.connectEnd - nav.connectStart,
              unit: 'ms',
              category: 'network',
            });

            // 页面加载时间
            this.addMetric({
              name: 'PageLoad',
              value: nav.loadEventEnd - nav.loadEventStart,
              unit: 'ms',
              category: 'network',
            });
          }

          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            
            // 资源加载时间
            this.addMetric({
              name: 'ResourceLoad',
              value: resource.responseEnd - resource.requestStart,
              unit: 'ms',
              category: 'network',
              context: {
                name: resource.name,
                type: this.getResourceType(resource.name),
                size: resource.transferSize,
              },
            });
          }
        });
      });

      observer.observe({ entryTypes: ['navigation', 'resource'] });
      this.observers.set('network', observer);
    }
  }

  // 渲染性能监控
  private startRenderMonitoring(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'paint') {
            this.addMetric({
              name: entry.name,
              value: entry.startTime,
              unit: 'ms',
              category: 'render',
              severity: this.getSeverity('RenderTime', entry.startTime),
            });
          }

          if (entry.entryType === 'largest-contentful-paint') {
            this.addMetric({
              name: 'LCP',
              value: entry.startTime,
              unit: 'ms',
              category: 'render',
              severity: this.getSeverity('RenderTime', entry.startTime),
            });
          }

          if (entry.entryType === 'first-input') {
            const fid = entry as PerformanceEventTiming;
            this.addMetric({
              name: 'FID',
              value: fid.processingStart - fid.startTime,
              unit: 'ms',
              category: 'render',
              severity: this.getSeverity('RenderTime', fid.processingStart - fid.startTime),
            });
          }

          if (entry.entryType === 'layout-shift') {
            const cls = entry as any;
            if (!cls.hadRecentInput) {
              this.addMetric({
                name: 'CLS',
                value: cls.value,
                unit: 'score',
                category: 'render',
                severity: cls.value > 0.25 ? 'critical' : cls.value > 0.1 ? 'high' : 'low',
              });
            }
          }
        });
      });

      observer.observe({ 
        entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
      });
      this.observers.set('render', observer);
    }
  }

  // 长任务监控
  private startLongTaskMonitoring(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.addMetric({
            name: 'LongTask',
            value: entry.duration,
            unit: 'ms',
            category: 'runtime',
            severity: this.getSeverity('LongTask', entry.duration),
            context: {
              startTime: entry.startTime,
              attribution: (entry as any).attribution?.[0],
            },
          });
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    }
  }

  // 导航性能监控
  private startNavigationMonitoring(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            
            // TTFB (Time to First Byte)
            this.addMetric({
              name: 'TTFB',
              value: nav.responseStart - nav.requestStart,
              unit: 'ms',
              category: 'network',
              severity: this.getSeverity('NetworkLatency', nav.responseStart - nav.requestStart),
            });

            // DOM内容加载时间
            this.addMetric({
              name: 'DOMContentLoaded',
              value: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
              unit: 'ms',
              category: 'render',
            });
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', observer);
    }
  }

  // 用户行为追踪
  private startUserActionTracking(): void {
    // 点击事件
    document.addEventListener('click', (event) => {
      this.trackUserAction({
        type: 'click',
        element: this.getElementSelector(event.target as Element),
        metadata: {
          x: event.clientX,
          y: event.clientY,
          button: event.button,
        },
      });
    });

    // 键盘事件
    document.addEventListener('keydown', (event) => {
      this.trackUserAction({
        type: 'keydown',
        element: this.getElementSelector(event.target as Element),
        metadata: {
          key: event.key,
          code: event.code,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        },
      });
    });

    // 滚动事件
    let scrollTimeout: number;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        this.trackUserAction({
          type: 'scroll',
          metadata: {
            scrollY: window.scrollY,
            scrollX: window.scrollX,
          },
        });
      }, 100);
    });
  }

  // 添加性能指标
  private addMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...metric,
    };

    this.metrics.push(fullMetric);

    // 发送实时指标事件
    this.eventService.emit('performance:metric:added', fullMetric);

    // 检查阈值警报
    this.checkThresholds(fullMetric);

    // 清理旧指标（保留最近1小时）
    this.cleanupOldMetrics();
  }

  // 追踪用户行为
  private trackUserAction(action: Omit<UserAction, 'id' | 'timestamp'>): void {
    const fullAction: UserAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...action,
    };

    this.userActions.push(fullAction);

    // 发送用户行为事件
    this.eventService.emit('performance:user-action', fullAction);

    // 清理旧行为数据（保留最近30分钟）
    this.cleanupOldUserActions();
  }

  // 生成性能报告
  generateReport(): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000); // 最近1分钟

    const summary = this.calculateSummary(recentMetrics);
    const issues = this.detectIssues(recentMetrics);
    const recommendations = this.generateRecommendations(issues);

    const report: PerformanceReport = {
      id: `report-${now}`,
      timestamp: now,
      duration: performance.now() - this.startTime,
      metrics: recentMetrics,
      summary,
      recommendations,
      issues,
    };

    this.reports.push(report);

    // 发送报告生成事件
    this.eventService.emit('performance:report:generated', report);

    return report;
  }

  // 计算摘要统计
  private calculateSummary(metrics: PerformanceMetric[]): PerformanceReport['summary'] {
    const fps = metrics.filter(m => m.name === 'FPS').map(m => m.value);
    const memory = metrics.filter(m => m.name === 'MemoryUsage').map(m => m.value);
    const network = metrics.filter(m => m.category === 'network').map(m => m.value);
    const render = metrics.filter(m => m.category === 'render').map(m => m.value);
    const jsHeap = metrics.filter(m => m.name === 'JSHeapSize').map(m => m.value);

    return {
      avgFPS: fps.length ? fps.reduce((a, b) => a + b, 0) / fps.length : 0,
      memoryUsage: memory.length ? memory[memory.length - 1] : 0,
      networkLatency: network.length ? network.reduce((a, b) => a + b, 0) / network.length : 0,
      renderTime: render.length ? render.reduce((a, b) => a + b, 0) / render.length : 0,
      jsHeapSize: jsHeap.length ? jsHeap[jsHeap.length - 1] : 0,
    };
  }

  // 检测性能问题
  private detectIssues(metrics: PerformanceMetric[]): PerformanceReport['issues'] {
    const issues: PerformanceReport['issues'] = [];

    // 检查低FPS
    const lowFPS = metrics.filter(m => m.name === 'FPS' && m.value < 30);
    if (lowFPS.length > 0) {
      issues.push({
        type: 'low_fps',
        severity: 'high',
        description: `检测到低帧率：平均 ${Math.round(lowFPS.reduce((a, b) => a + b.value, 0) / lowFPS.length)} FPS`,
        suggestion: '考虑优化渲染逻辑，减少DOM操作，使用虚拟滚动等技术',
      });
    }

    // 检查内存泄漏
    const memoryMetrics = metrics.filter(m => m.name === 'JSHeapSize').sort((a, b) => a.timestamp - b.timestamp);
    if (memoryMetrics.length > 5) {
      const trend = this.calculateTrend(memoryMetrics.map(m => m.value));
      if (trend > 0.1) {
        issues.push({
          type: 'memory_leak',
          severity: 'critical',
          description: '检测到可能的内存泄漏，内存使用持续增长',
          suggestion: '检查事件监听器、定时器、闭包等可能导致内存泄漏的代码',
        });
      }
    }

    // 检查长任务
    const longTasks = metrics.filter(m => m.name === 'LongTask' && m.value > 50);
    if (longTasks.length > 0) {
      issues.push({
        type: 'long_tasks',
        severity: 'medium',
        description: `检测到 ${longTasks.length} 个长任务，可能导致界面卡顿`,
        suggestion: '将长时间运行的任务分解为更小的块，或使用Web Workers',
      });
    }

    return issues;
  }

  // 生成优化建议
  private generateRecommendations(issues: PerformanceReport['issues']): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.type === 'low_fps')) {
      recommendations.push('启用GPU加速渲染');
      recommendations.push('减少重排和重绘操作');
      recommendations.push('使用CSS transform代替直接修改位置');
    }

    if (issues.some(i => i.type === 'memory_leak')) {
      recommendations.push('定期检查和清理事件监听器');
      recommendations.push('避免创建循环引用');
      recommendations.push('使用WeakMap和WeakSet处理临时引用');
    }

    if (issues.some(i => i.type === 'long_tasks')) {
      recommendations.push('使用requestIdleCallback延迟非关键任务');
      recommendations.push('实现任务分片和时间分片');
      recommendations.push('考虑使用Web Workers处理计算密集型任务');
    }

    // 通用建议
    recommendations.push('启用浏览器缓存优化');
    recommendations.push('压缩和合并静态资源');
    recommendations.push('使用CDN加速资源加载');

    return recommendations;
  }

  // 其他辅助方法
  private getSeverity(metric: string, value: number): PerformanceMetric['severity'] {
    const threshold = this.thresholds.find(t => t.metric === metric);
    if (!threshold) return 'low';

    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'high';
    return 'low';
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const scriptTypes = ['js', 'ts'];
    const styleTypes = ['css'];
    const fontTypes = ['woff', 'woff2', 'ttf', 'otf'];

    if (imageTypes.includes(extension || '')) return 'image';
    if (scriptTypes.includes(extension || '')) return 'script';
    if (styleTypes.includes(extension || '')) return 'stylesheet';
    if (fontTypes.includes(extension || '')) return 'font';
    return 'other';
  }

  private getElementSelector(element: Element): string {
    if (!element) return '';
    
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    return (last - first) / first;
  }

  private checkThresholds(metric: PerformanceMetric): void {
    if (metric.severity === 'critical' || metric.severity === 'high') {
      this.eventService.emit('performance:threshold:exceeded', {
        metric,
        threshold: this.thresholds.find(t => t.metric === metric.name),
      });
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (60 * 60 * 1000); // 1小时前
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  private cleanupOldUserActions(): void {
    const cutoff = Date.now() - (30 * 60 * 1000); // 30分钟前
    this.userActions = this.userActions.filter(a => a.timestamp > cutoff);
  }

  private setupEventListeners(): void {
    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.addMetric({
          name: 'PageHidden',
          value: 1,
          unit: 'event',
          category: 'user',
        });
      } else {
        this.addMetric({
          name: 'PageVisible',
          value: 1,
          unit: 'event',
          category: 'user',
        });
      }
    });

    // 页面卸载
    window.addEventListener('beforeunload', () => {
      this.generateReport();
    });
  }

  // 公共方法
  getMetrics(filter?: { category?: string; timeRange?: number }): PerformanceMetric[] {
    let filtered = [...this.metrics];

    if (filter?.category) {
      filtered = filtered.filter(m => m.category === filter.category);
    }

    if (filter?.timeRange) {
      const cutoff = Date.now() - filter.timeRange;
      filtered = filtered.filter(m => m.timestamp > cutoff);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  getReports(): PerformanceReport[] {
    return [...this.reports].sort((a, b) => b.timestamp - a.timestamp);
  }

  getUserActions(timeRange?: number): UserAction[] {
    let filtered = [...this.userActions];

    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      filtered = filtered.filter(a => a.timestamp > cutoff);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  updateThresholds(thresholds: PerformanceThreshold[]): void {
    this.thresholds = [...thresholds];
  }

  getThresholds(): PerformanceThreshold[] {
    return [...this.thresholds];
  }

  exportData(): { metrics: PerformanceMetric[]; reports: PerformanceReport[]; userActions: UserAction[] } {
    return {
      metrics: this.getMetrics(),
      reports: this.getReports(),
      userActions: this.getUserActions(),
    };
  }
}
