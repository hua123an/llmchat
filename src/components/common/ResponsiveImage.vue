<template>
  <div :class="containerClasses" :style="containerStyles">
    <img
      v-if="!isLoading && !hasError"
      :src="currentSrc"
      :srcset="srcSet"
      :sizes="sizesAttr"
      :alt="alt"
      :loading="lazyLoad ? 'lazy' : 'eager'"
      :decoding="decoding"
      :class="imageClasses"
      :style="imageStyles"
      @load="handleLoad"
      @error="handleError"
      @click="handleClick"
    />
    
    <!-- 加载状态 -->
    <div v-if="isLoading" :class="placeholderClasses">
      <slot name="loading">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
      </slot>
    </div>
    
    <!-- 错误状态 -->
    <div v-if="hasError" :class="errorClasses">
      <slot name="error">
        <div class="error-message">
          <svg class="error-icon" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,6A1.5,1.5 0 0,1 13.5,7.5A1.5,1.5 0 0,1 12,9A1.5,1.5 0 0,1 10.5,7.5A1.5,1.5 0 0,1 12,6M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z"/>
          </svg>
          <span>图片加载失败</span>
        </div>
      </slot>
    </div>
    
    <!-- 低质量占位符 -->
    <img
      v-if="placeholder && isLoading"
      :src="placeholder"
      :class="placeholderImageClasses"
      :alt="alt"
      loading="eager"
      decoding="sync"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useResponsiveDesign } from '../../composables/useResponsiveDesign';

interface ImageSource {
  src: string;
  width?: number;
  density?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
}

interface ResponsiveSources {
  xs?: ImageSource | string;
  sm?: ImageSource | string;
  md?: ImageSource | string;
  lg?: ImageSource | string;
  xl?: ImageSource | string;
  xxl?: ImageSource | string;
}

interface Props {
  src: string | ResponsiveSources;
  alt: string;
  width?: number | string;
  height?: number | string;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  placeholder?: string;
  lazyLoad?: boolean;
  priority?: boolean;
  quality?: number;
  formats?: ('webp' | 'avif' | 'jpeg' | 'png')[];
  sizes?: string;
  decoding?: 'auto' | 'sync' | 'async';
  fetchpriority?: 'high' | 'low' | 'auto';
  clickable?: boolean;
  className?: string;
}

const props = withDefaults(defineProps<Props>(), {
  aspectRatio: 'auto',
  objectFit: 'cover',
  objectPosition: 'center',
  lazyLoad: true,
  priority: false,
  quality: 0.8,
  formats: () => ['webp', 'jpeg'],
  sizes: '100vw',
  decoding: 'async',
  fetchpriority: 'auto',
  clickable: false,
  className: 'responsive-image',
});

const emit = defineEmits<{
  load: [event: Event];
  error: [event: Event];
  click: [event: Event];
}>();

// 响应式设计 hook
const {
  responsiveState,
  currentBreakpoint,
  getResponsiveClasses,
  performanceOptimizations,
} = useResponsiveDesign();

// 状态
const isLoading = ref(true);
const hasError = ref(false);
const retryCount = ref(0);
const maxRetries = 3;

// 获取当前图片源
const currentSrc = computed(() => {
  if (typeof props.src === 'string') {
    return props.src;
  }

  const bp = currentBreakpoint.value;
  const sources = props.src as ResponsiveSources;
  
  // 从当前断点向下查找可用的图片源
  let source: ImageSource | string | undefined;
  
  if (bp === 'xxl' && sources.xxl) source = sources.xxl;
  else if ((bp === 'xxl' || bp === 'xl') && sources.xl) source = sources.xl;
  else if ((bp === 'xxl' || bp === 'xl' || bp === 'lg') && sources.lg) source = sources.lg;
  else if ((bp === 'xxl' || bp === 'xl' || bp === 'lg' || bp === 'md') && sources.md) source = sources.md;
  else if (bp !== 'xs' && sources.sm) source = sources.sm;
  else source = sources.xs;

  if (!source) {
    console.warn('No image source found for current breakpoint');
    return '';
  }

  return typeof source === 'string' ? source : source.src;
});

// 生成srcset
const srcSet = computed(() => {
  if (typeof props.src === 'string') {
    return generateSrcSet(props.src);
  }

  const sources = props.src as ResponsiveSources;
  const srcsets: string[] = [];

  Object.entries(sources).forEach(([breakpoint, source]) => {
    if (source) {
      const src = typeof source === 'string' ? source : source.src;
      const density = typeof source === 'object' ? source.density : 1;
      if (density) {
        srcsets.push(`${src} ${density}x`);
      }
    }
  });

  return srcsets.join(', ');
});

// 生成sizes属性
const sizesAttr = computed(() => {
  if (typeof props.src === 'string') {
    return props.sizes;
  }

  // 为响应式图片生成更智能的sizes
  return '(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 992px) 33vw, 25vw';
});

// 生成srcset字符串
const generateSrcSet = (baseSrc: string): string => {
  if (!baseSrc) return '';

  const srcsets: string[] = [];
  const densities = responsiveState.value.isRetina ? [1, 2] : [1];
  
  densities.forEach(density => {
    // 这里可以集成图片处理服务（如Cloudinary、ImageKit等）
    // 目前使用原始图片，实际项目中应该根据密度生成不同尺寸的图片
    srcsets.push(`${baseSrc} ${density}x`);
  });

  return srcsets.join(', ');
};

// 容器类名
const containerClasses = computed(() => {
  const classes = getResponsiveClasses(props.className);
  
  if (props.clickable) {
    classes.push(`${props.className}--clickable`);
  }
  
  if (isLoading.value) {
    classes.push(`${props.className}--loading`);
  }
  
  if (hasError.value) {
    classes.push(`${props.className}--error`);
  }
  
  return classes;
});

// 容器样式
const containerStyles = computed(() => {
  const styles: Record<string, any> = {};
  
  if (props.width) {
    styles.width = typeof props.width === 'number' ? `${props.width}px` : props.width;
  }
  
  if (props.height) {
    styles.height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  }
  
  if (props.aspectRatio && props.aspectRatio !== 'auto') {
    styles.aspectRatio = props.aspectRatio;
  }
  
  return styles;
});

// 图片类名
const imageClasses = computed(() => [
  `${props.className}__image`,
  `${props.className}__image--${props.objectFit}`,
]);

// 图片样式
const imageStyles = computed(() => ({
  objectFit: props.objectFit,
  objectPosition: props.objectPosition,
}));

// 占位符类名
const placeholderClasses = computed(() => [
  `${props.className}__placeholder`,
]);

const placeholderImageClasses = computed(() => [
  `${props.className}__placeholder-image`,
]);

// 错误状态类名
const errorClasses = computed(() => [
  `${props.className}__error`,
]);

// 事件处理
const handleLoad = (event: Event) => {
  isLoading.value = false;
  hasError.value = false;
  emit('load', event);
};

const handleError = async (event: Event) => {
  if (retryCount.value < maxRetries) {
    retryCount.value++;
    
    // 指数退避重试
    const delay = Math.pow(2, retryCount.value) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 重新加载图片
    const img = event.target as HTMLImageElement;
    img.src = img.src; // 触发重新加载
  } else {
    isLoading.value = false;
    hasError.value = true;
    emit('error', event);
  }
};

const handleClick = (event: Event) => {
  if (props.clickable) {
    emit('click', event);
  }
};

// 监听源变化
watch(() => props.src, () => {
  isLoading.value = true;
  hasError.value = false;
  retryCount.value = 0;
});

// 生命周期
onMounted(() => {
  // 如果是高优先级图片，预加载
  if (props.priority && currentSrc.value) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = currentSrc.value;
    if (srcSet.value) {
      link.setAttribute('imagesrcset', srcSet.value);
    }
    document.head.appendChild(link);
  }
});
</script>

<style scoped>
.responsive-image {
  position: relative;
  display: inline-block;
  overflow: hidden;
  background-color: var(--bg-tertiary, #f5f5f5);
}

.responsive-image__image {
  width: 100%;
  height: 100%;
  display: block;
  transition: opacity 0.3s ease;
}

.responsive-image__image--contain {
  object-fit: contain;
}

.responsive-image__image--cover {
  object-fit: cover;
}

.responsive-image__image--fill {
  object-fit: fill;
}

.responsive-image__image--none {
  object-fit: none;
}

.responsive-image__image--scale-down {
  object-fit: scale-down;
}

/* 占位符样式 */
.responsive-image__placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary, #f5f5f5);
  color: var(--text-secondary, #666);
}

.responsive-image__placeholder-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(10px);
  opacity: 0.5;
  z-index: 1;
}

/* 加载动画 */
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color, #e0e0e0);
  border-top: 2px solid var(--primary-color, #007bff);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 错误状态 */
.responsive-image__error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-tertiary, #f5f5f5);
  color: var(--text-secondary, #666);
  text-align: center;
  padding: 16px;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.error-icon {
  color: var(--error-color, #ff4444);
}

/* 可点击状态 */
.responsive-image--clickable {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.responsive-image--clickable:hover {
  transform: scale(1.02);
}

.responsive-image--clickable:active {
  transform: scale(0.98);
}

/* 移动端优化 */
.responsive-image--mobile .responsive-image__image {
  /* 移动端可能需要禁用某些效果以提升性能 */
  image-rendering: -webkit-optimize-contrast;
}

/* 触摸设备优化 */
.responsive-image--touch {
  /* 确保触摸设备上的交互更加友好 */
  touch-action: manipulation;
}

/* 高分辨率屏幕优化 */
.responsive-image--retina .responsive-image__image {
  /* 高分辨率屏幕的图像优化 */
  image-rendering: crisp-edges;
}

/* 加载状态 */
.responsive-image--loading .responsive-image__image {
  opacity: 0;
}

.responsive-image--loading .responsive-image__placeholder {
  opacity: 1;
}

/* 错误状态 */
.responsive-image--error .responsive-image__placeholder {
  display: none;
}

/* 无障碍访问 */
@media (prefers-reduced-motion: reduce) {
  .responsive-image__image,
  .responsive-image--clickable {
    transition: none !important;
    animation: none !important;
  }
  
  .spinner {
    animation: none !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .responsive-image {
    outline: 1px solid;
  }
  
  .responsive-image__placeholder,
  .responsive-image__error {
    border: 2px solid;
  }
}

/* 打印模式 */
@media print {
  .responsive-image__placeholder,
  .responsive-image__error {
    display: none;
  }
  
  .responsive-image__image {
    opacity: 1 !important;
  }
}

/* 低质量网络优化 */
@media (prefers-reduced-data: reduce) {
  .responsive-image__image {
    /* 在低质量网络下可能需要减少图片质量 */
  }
}
</style>
