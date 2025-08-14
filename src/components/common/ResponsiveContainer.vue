<template>
  <component
    :is="tag"
    :class="containerClasses"
    :style="containerStyles"
    v-bind="$attrs"
  >
    <slot 
      :responsive="responsiveState"
      :device="deviceInfo"
      :breakpoint="currentBreakpoint"
      :is-mobile="responsiveState.isMobile"
      :is-tablet="responsiveState.isTablet"
      :is-desktop="responsiveState.isDesktop"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useResponsiveDesign } from '../../composables/useResponsiveDesign';

interface Props {
  tag?: string;
  maxWidth?: string | number;
  padding?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    xxl?: string;
  };
  margin?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    xxl?: string;
  };
  fluid?: boolean;
  centered?: boolean;
  gutter?: boolean;
  touch?: boolean;
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'div',
  fluid: false,
  centered: true,
  gutter: true,
  touch: true,
  className: 'responsive-container',
});

// 响应式设计 hook
const {
  responsiveState,
  currentBreakpoint,
  getDeviceInfo,
  getResponsiveClasses,
  getResponsiveStyles,
  touchOptimizations,
} = useResponsiveDesign();

// 设备信息
const deviceInfo = computed(() => getDeviceInfo());

// 容器类名
const containerClasses = computed(() => {
  const classes = getResponsiveClasses(props.className);
  
  // 添加配置相关的类
  if (props.fluid) classes.push(`${props.className}--fluid`);
  if (props.centered) classes.push(`${props.className}--centered`);
  if (props.gutter) classes.push(`${props.className}--gutter`);
  if (props.touch && responsiveState.value.isTouch) {
    classes.push(`${props.className}--touch-optimized`);
  }
  
  return classes;
});

// 容器样式
const containerStyles = computed(() => {
  let styles: Record<string, any> = {};
  
  // 最大宽度
  if (props.maxWidth && !props.fluid) {
    const maxWidth = typeof props.maxWidth === 'number' 
      ? `${props.maxWidth}px` 
      : props.maxWidth;
    styles.maxWidth = maxWidth;
  }
  
  // 响应式内边距
  if (props.padding) {
    const paddingStyles = getResponsiveStyles({
      xs: props.padding.xs ? { padding: props.padding.xs } : undefined,
      sm: props.padding.sm ? { padding: props.padding.sm } : undefined,
      md: props.padding.md ? { padding: props.padding.md } : undefined,
      lg: props.padding.lg ? { padding: props.padding.lg } : undefined,
      xl: props.padding.xl ? { padding: props.padding.xl } : undefined,
      xxl: props.padding.xxl ? { padding: props.padding.xxl } : undefined,
    });
    styles = { ...styles, ...paddingStyles };
  }
  
  // 响应式外边距
  if (props.margin) {
    const marginStyles = getResponsiveStyles({
      xs: props.margin.xs ? { margin: props.margin.xs } : undefined,
      sm: props.margin.sm ? { margin: props.margin.sm } : undefined,
      md: props.margin.md ? { margin: props.margin.md } : undefined,
      lg: props.margin.lg ? { margin: props.margin.lg } : undefined,
      xl: props.margin.xl ? { margin: props.margin.xl } : undefined,
      xxl: props.margin.xxl ? { margin: props.margin.xxl } : undefined,
    });
    styles = { ...styles, ...marginStyles };
  }
  
  // 触摸优化
  if (props.touch && responsiveState.value.isTouch) {
    const touchStyles = touchOptimizations.getTouchFriendlySpacing();
    styles = { ...styles, ...touchStyles };
  }
  
  return styles;
});
</script>

<style scoped>
.responsive-container {
  width: 100%;
  box-sizing: border-box;
}

.responsive-container--centered {
  margin-left: auto;
  margin-right: auto;
}

.responsive-container--fluid {
  max-width: none !important;
}

.responsive-container--gutter {
  padding-left: var(--gutter-xs, 16px);
  padding-right: var(--gutter-xs, 16px);
}

/* 断点特定的gutter */
.responsive-container--gutter.responsive-container--sm {
  padding-left: var(--gutter-sm, 20px);
  padding-right: var(--gutter-sm, 20px);
}

.responsive-container--gutter.responsive-container--md {
  padding-left: var(--gutter-md, 24px);
  padding-right: var(--gutter-md, 24px);
}

.responsive-container--gutter.responsive-container--lg {
  padding-left: var(--gutter-lg, 32px);
  padding-right: var(--gutter-lg, 32px);
}

.responsive-container--gutter.responsive-container--xl {
  padding-left: var(--gutter-xl, 40px);
  padding-right: var(--gutter-xl, 40px);
}

.responsive-container--gutter.responsive-container--xxl {
  padding-left: var(--gutter-xxl, 48px);
  padding-right: var(--gutter-xxl, 48px);
}

/* 触摸优化 */
.responsive-container--touch-optimized {
  /* 确保触摸目标足够大 */
  min-height: 44px;
}

.responsive-container--touch-optimized * {
  /* 禁用文本选择（在移动端） */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.responsive-container--touch-optimized input,
.responsive-container--touch-optimized textarea,
.responsive-container--touch-optimized [contenteditable] {
  /* 允许输入框的文本选择 */
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

/* 设备特定样式 */
.responsive-container--mobile {
  /* 移动端特定样式 */
}

.responsive-container--tablet {
  /* 平板特定样式 */
}

.responsive-container--desktop {
  /* 桌面端特定样式 */
}

/* 方向特定样式 */
.responsive-container--portrait {
  /* 竖屏特定样式 */
}

.responsive-container--landscape {
  /* 横屏特定样式 */
}

/* 高分辨率屏幕优化 */
.responsive-container--retina {
  /* 高分辨率屏幕的图像和边框优化 */
}

/* 无障碍访问优化 */
@media (prefers-reduced-motion: reduce) {
  .responsive-container * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .responsive-container {
    outline: 1px solid;
  }
}

/* 暗色主题 */
@media (prefers-color-scheme: dark) {
  .responsive-container {
    color-scheme: dark;
  }
}

/* 强制横屏时的样式调整 */
@media screen and (orientation: landscape) and (max-height: 500px) {
  .responsive-container--gutter {
    padding-top: 8px;
    padding-bottom: 8px;
  }
}

/* 打印样式 */
@media print {
  .responsive-container--gutter {
    padding: 0;
  }
  
  .responsive-container--touch-optimized {
    min-height: auto;
  }
}
</style>
