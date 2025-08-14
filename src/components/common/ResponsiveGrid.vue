<template>
  <div :class="gridClasses" :style="gridStyles">
    <slot 
      :responsive="responsiveState"
      :columns="currentColumns"
      :gap="currentGap"
      :is-mobile="responsiveState.isMobile"
      :is-tablet="responsiveState.isTablet"
      :is-desktop="responsiveState.isDesktop"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useResponsiveDesign } from '../../composables/useResponsiveDesign';

interface GridConfig {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  xxl?: number;
}

interface Props {
  columns?: GridConfig | number;
  gap?: GridConfig | string;
  rows?: GridConfig | number;
  autoFit?: boolean;
  minItemWidth?: string;
  maxItemWidth?: string;
  itemAspectRatio?: string;
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';
  alignContent?: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  justifyContent?: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => ({ xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }),
  gap: () => ({ xs: '16px', sm: '20px', md: '24px', lg: '32px', xl: '40px', xxl: '48px' }),
  autoFit: false,
  alignItems: 'stretch',
  justifyItems: 'stretch',
  className: 'responsive-grid',
});

// 响应式设计 hook
const {
  responsiveState,
  currentBreakpoint,
  getResponsiveClasses,
  getResponsiveStyles,
} = useResponsiveDesign();

// 获取当前列数
const currentColumns = computed(() => {
  if (typeof props.columns === 'number') {
    return props.columns;
  }

  const bp = currentBreakpoint.value;
  const config = props.columns as GridConfig;
  
  // 从当前断点向下查找可用配置
  if (bp === 'xxl' && config.xxl) return config.xxl;
  if ((bp === 'xxl' || bp === 'xl') && config.xl) return config.xl;
  if ((bp === 'xxl' || bp === 'xl' || bp === 'lg') && config.lg) return config.lg;
  if ((bp === 'xxl' || bp === 'xl' || bp === 'lg' || bp === 'md') && config.md) return config.md;
  if (bp !== 'xs' && config.sm) return config.sm;
  return config.xs || 1;
});

// 获取当前间距
const currentGap = computed(() => {
  if (typeof props.gap === 'string') {
    return props.gap;
  }

  const bp = currentBreakpoint.value;
  const config = props.gap as GridConfig;
  
  // 从当前断点向下查找可用配置
  if (bp === 'xxl' && config.xxl) return `${config.xxl}px`;
  if ((bp === 'xxl' || bp === 'xl') && config.xl) return `${config.xl}px`;
  if ((bp === 'xxl' || bp === 'xl' || bp === 'lg') && config.lg) return `${config.lg}px`;
  if ((bp === 'xxl' || bp === 'xl' || bp === 'lg' || bp === 'md') && config.md) return `${config.md}px`;
  if (bp !== 'xs' && config.sm) return `${config.sm}px`;
  return config.xs ? `${config.xs}px` : '16px';
});

// 获取当前行数
const currentRows = computed(() => {
  if (!props.rows) return undefined;
  
  if (typeof props.rows === 'number') {
    return props.rows;
  }

  const bp = currentBreakpoint.value;
  const config = props.rows as GridConfig;
  
  if (bp === 'xxl' && config.xxl) return config.xxl;
  if ((bp === 'xxl' || bp === 'xl') && config.xl) return config.xl;
  if ((bp === 'xxl' || bp === 'xl' || bp === 'lg') && config.lg) return config.lg;
  if ((bp === 'xxl' || bp === 'xl' || bp === 'lg' || bp === 'md') && config.md) return config.md;
  if (bp !== 'xs' && config.sm) return config.sm;
  return config.xs;
});

// 网格类名
const gridClasses = computed(() => {
  const classes = getResponsiveClasses(props.className);
  
  // 添加配置相关的类
  if (props.autoFit) {
    classes.push(`${props.className}--auto-fit`);
  }
  
  return classes;
});

// 网格样式
const gridStyles = computed(() => {
  let styles: Record<string, any> = {
    display: 'grid',
    gap: currentGap.value,
  };

  // 列配置
  if (props.autoFit && props.minItemWidth) {
    styles.gridTemplateColumns = `repeat(auto-fit, minmax(${props.minItemWidth}, ${props.maxItemWidth || '1fr'}))`;
  } else {
    styles.gridTemplateColumns = `repeat(${currentColumns.value}, 1fr)`;
  }

  // 行配置
  if (currentRows.value) {
    styles.gridTemplateRows = `repeat(${currentRows.value}, 1fr)`;
  }

  // 项目纵横比
  if (props.itemAspectRatio) {
    styles['--item-aspect-ratio'] = props.itemAspectRatio;
  }

  // 对齐方式
  if (props.alignItems) {
    styles.alignItems = props.alignItems;
  }

  if (props.justifyItems) {
    styles.justifyItems = props.justifyItems;
  }

  if (props.alignContent) {
    styles.alignContent = props.alignContent;
  }

  if (props.justifyContent) {
    styles.justifyContent = props.justifyContent;
  }

  return styles;
});
</script>

<style scoped>
.responsive-grid {
  width: 100%;
  box-sizing: border-box;
}

/* 自动适应网格 */
.responsive-grid--auto-fit {
  /* 在某些情况下可能需要额外的样式 */
}

/* 项目纵横比支持 */
.responsive-grid :deep(.grid-item) {
  aspect-ratio: var(--item-aspect-ratio, auto);
}

/* 移动端优化 */
.responsive-grid--mobile {
  /* 移动端可能需要更小的间距 */
}

.responsive-grid--mobile :deep(.grid-item) {
  /* 确保移动端的触摸目标足够大 */
  min-height: 44px;
}

/* 平板优化 */
.responsive-grid--tablet {
  /* 平板特定的网格优化 */
}

/* 桌面优化 */
.responsive-grid--desktop {
  /* 桌面端可以有更复杂的布局 */
}

/* 触摸优化 */
.responsive-grid--touch :deep(.grid-item) {
  /* 触摸设备上的项目需要更大的间距 */
  touch-action: manipulation;
}

/* 方向适配 */
.responsive-grid--landscape {
  /* 横屏时可能需要调整列数 */
}

.responsive-grid--portrait {
  /* 竖屏时的特殊处理 */
}

/* 高分辨率屏幕 */
.responsive-grid--retina {
  /* 高分辨率屏幕可能需要更精细的间距 */
}

/* 性能优化 */
.responsive-grid :deep(.grid-item) {
  /* 启用GPU加速 */
  will-change: transform;
  /* 优化渲染 */
  contain: layout style paint;
}

/* 无障碍访问 */
@media (prefers-reduced-motion: reduce) {
  .responsive-grid :deep(.grid-item) {
    transition: none !important;
    animation: none !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .responsive-grid :deep(.grid-item) {
    outline: 1px solid;
  }
}

/* 超小屏幕优化 */
@media screen and (max-width: 320px) {
  .responsive-grid {
    gap: 8px !important;
  }
}

/* 超宽屏幕优化 */
@media screen and (min-width: 1920px) {
  .responsive-grid {
    /* 超宽屏幕可能需要限制最大列数 */
    max-width: 1800px;
    margin: 0 auto;
  }
}

/* 打印样式 */
@media print {
  .responsive-grid {
    gap: 0 !important;
    grid-template-columns: 1fr !important;
  }
  
  .responsive-grid :deep(.grid-item) {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}

/* CSS Grid不支持时的回退 */
@supports not (display: grid) {
  .responsive-grid {
    display: flex;
    flex-wrap: wrap;
  }
  
  .responsive-grid :deep(.grid-item) {
    flex: 1 1 auto;
    margin: 8px;
  }
}
</style>
