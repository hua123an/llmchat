import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface BreakpointConfig {
  xs: number;    // 手机竖屏
  sm: number;    // 手机横屏/小平板
  md: number;    // 平板
  lg: number;    // 桌面
  xl: number;    // 大桌面
  xxl: number;   // 超大桌面
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  isTouch: boolean;
  pixelRatio: number;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  userAgent: string;
  platform: string;
}

export interface ResponsiveState {
  currentBreakpoint: keyof BreakpointConfig;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isTouch: boolean;
  isRetina: boolean;
  viewportWidth: number;
  viewportHeight: number;
}

export function useResponsiveDesign(customBreakpoints?: Partial<BreakpointConfig>) {
  // 默认断点配置
  const defaultBreakpoints: BreakpointConfig = {
    xs: 0,      // 0px+     手机竖屏
    sm: 576,    // 576px+   手机横屏/小平板
    md: 768,    // 768px+   平板
    lg: 992,    // 992px+   桌面
    xl: 1200,   // 1200px+  大桌面
    xxl: 1400,  // 1400px+  超大桌面
  };

  const breakpoints = { ...defaultBreakpoints, ...customBreakpoints };

  // 响应式状态
  const viewportWidth = ref(0);
  const viewportHeight = ref(0);
  const orientation = ref<'portrait' | 'landscape'>('portrait');
  const isTouch = ref(false);
  const pixelRatio = ref(1);

  // 计算当前断点
  const currentBreakpoint = computed<keyof BreakpointConfig>(() => {
    const width = viewportWidth.value;
    
    if (width >= breakpoints.xxl) return 'xxl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  });

  // 设备类型判断
  const deviceType = computed<DeviceInfo['type']>(() => {
    const width = viewportWidth.value;
    
    if (width < breakpoints.md) return 'mobile';
    if (width < breakpoints.lg) return 'tablet';
    return 'desktop';
  });

  // 便捷的响应式状态
  const responsiveState = computed<ResponsiveState>(() => ({
    currentBreakpoint: currentBreakpoint.value,
    isMobile: deviceType.value === 'mobile',
    isTablet: deviceType.value === 'tablet',
    isDesktop: deviceType.value === 'desktop',
    isPortrait: orientation.value === 'portrait',
    isLandscape: orientation.value === 'landscape',
    isTouch: isTouch.value,
    isRetina: pixelRatio.value > 1,
    viewportWidth: viewportWidth.value,
    viewportHeight: viewportHeight.value,
  }));

  // 检查是否匹配指定断点
  const matches = (breakpoint: keyof BreakpointConfig) => {
    return viewportWidth.value >= breakpoints[breakpoint];
  };

  // 检查是否在断点范围内
  const between = (min: keyof BreakpointConfig, max: keyof BreakpointConfig) => {
    const width = viewportWidth.value;
    return width >= breakpoints[min] && width < breakpoints[max];
  };

  // 获取设备详细信息
  const getDeviceInfo = (): DeviceInfo => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    return {
      type: deviceType.value,
      orientation: orientation.value,
      isTouch: isTouch.value,
      pixelRatio: pixelRatio.value,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: viewportWidth.value,
      viewportHeight: viewportHeight.value,
      userAgent,
      platform,
    };
  };

  // 更新视口尺寸
  const updateViewportSize = () => {
    viewportWidth.value = window.innerWidth;
    viewportHeight.value = window.innerHeight;
  };

  // 更新屏幕方向
  const updateOrientation = () => {
    // 使用视口尺寸而不是screen.orientation，更可靠
    orientation.value = viewportWidth.value > viewportHeight.value ? 'landscape' : 'portrait';
  };

  // 检测触摸支持
  const detectTouch = () => {
    isTouch.value = 'ontouchstart' in window || 
                   navigator.maxTouchPoints > 0 || 
                   (navigator as any).msMaxTouchPoints > 0;
  };

  // 更新像素密度
  const updatePixelRatio = () => {
    pixelRatio.value = window.devicePixelRatio || 1;
  };

  // 处理窗口大小变化
  const handleResize = () => {
    updateViewportSize();
    updateOrientation();
  };

  // 处理方向变化
  const handleOrientationChange = () => {
    // 延迟更新，因为方向变化时尺寸更新可能有延迟
    setTimeout(() => {
      updateViewportSize();
      updateOrientation();
    }, 100);
  };

  // 响应式CSS类生成器
  const getResponsiveClasses = (baseClass: string) => {
    const classes = [baseClass];
    
    // 添加断点类
    classes.push(`${baseClass}--${currentBreakpoint.value}`);
    
    // 添加设备类型类
    classes.push(`${baseClass}--${deviceType.value}`);
    
    // 添加方向类
    classes.push(`${baseClass}--${orientation.value}`);
    
    // 添加触摸类
    if (isTouch.value) {
      classes.push(`${baseClass}--touch`);
    }
    
    // 添加高分辨率类
    if (pixelRatio.value > 1) {
      classes.push(`${baseClass}--retina`);
    }
    
    return classes;
  };

  // 响应式样式对象生成器
  const getResponsiveStyles = (config: {
    xs?: Record<string, any>;
    sm?: Record<string, any>;
    md?: Record<string, any>;
    lg?: Record<string, any>;
    xl?: Record<string, any>;
    xxl?: Record<string, any>;
  }) => {
    const bp = currentBreakpoint.value;
    
    // 从小到大应用样式
    let styles = {};
    
    if (config.xs) styles = { ...styles, ...config.xs };
    if (matches('sm') && config.sm) styles = { ...styles, ...config.sm };
    if (matches('md') && config.md) styles = { ...styles, ...config.md };
    if (matches('lg') && config.lg) styles = { ...styles, ...config.lg };
    if (matches('xl') && config.xl) styles = { ...styles, ...config.xl };
    if (matches('xxl') && config.xxl) styles = { ...styles, ...config.xxl };
    
    return styles;
  };

  // 触摸优化
  const touchOptimizations = {
    // 推荐的触摸目标尺寸（44px x 44px）
    getMinTouchTargetSize: () => ({ width: '44px', height: '44px' }),
    
    // 触摸友好的间距
    getTouchFriendlySpacing: () => ({
      padding: isTouch.value ? '12px' : '8px',
      margin: isTouch.value ? '8px' : '4px',
    }),
    
    // 禁用触摸时的默认行为
    preventTouchDefaults: (element: HTMLElement) => {
      if (isTouch.value) {
        element.style.touchAction = 'manipulation';
        element.style.webkitTouchCallout = 'none';
        element.style.webkitUserSelect = 'none';
      }
    },
  };

  // 可访问性增强
  const accessibilityEnhancements = {
    // 根据设备调整字体大小
    getFontSize: (baseSize: number) => {
      if (deviceType.value === 'mobile') {
        return Math.max(baseSize, 16); // 移动端最小字体16px
      }
      return baseSize;
    },
    
    // 获取推荐的行高
    getLineHeight: (fontSize: number) => {
      return Math.max(fontSize * 1.4, 20); // 最小行高20px
    },
    
    // 获取对比度友好的颜色
    getAccessibleColors: (isDark: boolean) => ({
      text: isDark ? '#ffffff' : '#000000',
      background: isDark ? '#000000' : '#ffffff',
      border: isDark ? '#333333' : '#cccccc',
    }),
  };

  // PWA支持检测
  const pwaSupport = {
    // 检查是否在PWA中运行
    isPWA: () => {
      return window.matchMedia('(display-mode: standalone)').matches ||
             (window.navigator as any).standalone ||
             document.referrer.includes('android-app://');
    },
    
    // 检查是否支持安装PWA
    canInstallPWA: () => {
      return 'serviceWorker' in navigator && 'PushManager' in window;
    },
    
    // 获取状态栏高度（iOS Safari）
    getStatusBarHeight: () => {
      if (deviceType.value === 'mobile' && /iPhone|iPad/.test(navigator.userAgent)) {
        return window.screen.height - window.innerHeight;
      }
      return 0;
    },
  };

  // 性能优化
  const performanceOptimizations = {
    // 是否应该使用低质量图片
    shouldUseLowQualityImages: () => {
      return deviceType.value === 'mobile' && 
             (navigator.connection as any)?.effectiveType === 'slow-2g';
    },
    
    // 是否应该延迟加载非关键资源
    shouldLazyLoad: () => {
      return deviceType.value === 'mobile';
    },
    
    // 获取推荐的图片质量
    getImageQuality: () => {
      if (deviceType.value === 'mobile') return 0.8;
      if (pixelRatio.value > 1) return 0.9;
      return 1.0;
    },
  };

  // 生命周期处理
  onMounted(() => {
    // 初始化状态
    updateViewportSize();
    updateOrientation();
    detectTouch();
    updatePixelRatio();

    // 添加事件监听器
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // 监听像素密度变化（较少见，但可能发生）
    const pixelRatioMedia = window.matchMedia(`(resolution: ${pixelRatio.value}dppx)`);
    pixelRatioMedia.addEventListener('change', updatePixelRatio);

    // 清理函数
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      pixelRatioMedia.removeEventListener('change', updatePixelRatio);
    });
  });

  return {
    // 状态
    viewportWidth: viewportWidth.value,
    viewportHeight: viewportHeight.value,
    orientation: orientation.value,
    currentBreakpoint: currentBreakpoint.value,
    deviceType: deviceType.value,
    responsiveState: responsiveState.value,
    breakpoints,

    // 检查方法
    matches,
    between,
    
    // 信息获取
    getDeviceInfo,
    
    // 样式生成
    getResponsiveClasses,
    getResponsiveStyles,
    
    // 优化功能
    touchOptimizations,
    accessibilityEnhancements,
    pwaSupport,
    performanceOptimizations,

    // 手动更新（通常不需要）
    updateViewportSize,
    updateOrientation,
  };
}
