<template>
  <Transition 
    name="notification"
    appear
    @enter="onEnter"
    @leave="onLeave"
  >
    <div 
      v-if="visible"
      class="notification"
      :class="[
        `notification--${type}`,
        { 'notification--dismissible': dismissible }
      ]"
      :style="{ zIndex: zIndex }"
      @click="handleClick"
    >
      <!-- 图标 -->
      <div class="notification__icon">
        <component :is="iconComponent" />
      </div>

      <!-- 内容 -->
      <div class="notification__content">
        <div v-if="title" class="notification__title">{{ title }}</div>
        <div class="notification__message">{{ message }}</div>
        
        <!-- 操作按钮 -->
        <div v-if="actions.length" class="notification__actions">
          <button
            v-for="action in actions"
            :key="action.label"
            @click.stop="handleAction(action)"
            class="notification__action"
            :class="action.type || 'primary'"
          >
            {{ action.label }}
          </button>
        </div>
      </div>

      <!-- 关闭按钮 -->
      <button
        v-if="dismissible"
        @click.stop="dismiss"
        class="notification__close"
        title="关闭"
      >
        <CloseIcon />
      </button>

      <!-- 进度条 -->
      <div
        v-if="duration && showProgress"
        class="notification__progress"
        :style="{ animationDuration: `${duration}ms` }"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

// 图标组件
const SuccessIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
  </svg>
);

const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

const LoadingIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" class="spinning">
    <path fill="currentColor" d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6z"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

export interface NotificationAction {
  label: string;
  type?: 'primary' | 'secondary' | 'danger';
  handler: () => void | Promise<void>;
}

interface Props {
  type?: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title?: string;
  message: string;
  duration?: number; // 自动关闭时间，0 表示不自动关闭
  dismissible?: boolean;
  showProgress?: boolean;
  actions?: NotificationAction[];
  zIndex?: number;
  persistent?: boolean; // 是否持久化（不会被批量清除）
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 5000,
  dismissible: true,
  showProgress: true,
  actions: () => [],
  zIndex: 1000,
  persistent: false,
});

const emit = defineEmits<{
  dismiss: [];
  action: [action: NotificationAction];
  click: [];
}>();

// 状态
const visible = ref(true);
const timer = ref<number>();

// 计算属性
const iconComponent = computed(() => {
  const iconMap = {
    success: SuccessIcon,
    error: ErrorIcon,
    warning: WarningIcon,
    info: InfoIcon,
    loading: LoadingIcon,
  };
  return iconMap[props.type];
});

// 生命周期
onMounted(() => {
  if (props.duration > 0) {
    timer.value = window.setTimeout(() => {
      dismiss();
    }, props.duration);
  }
});

onUnmounted(() => {
  if (timer.value) {
    clearTimeout(timer.value);
  }
});

// 方法
const dismiss = () => {
  visible.value = false;
  if (timer.value) {
    clearTimeout(timer.value);
  }
};

const handleClick = () => {
  emit('click');
};

const handleAction = async (action: NotificationAction) => {
  try {
    await action.handler();
    emit('action', action);
  } catch (error) {
    console.error('Notification action failed:', error);
  }
};

const onEnter = (el: Element) => {
  // 动画进入完成
};

const onLeave = (el: Element) => {
  // 动画离开完成
  emit('dismiss');
};

// 暴露方法
defineExpose({
  dismiss,
  extend: (additionalMs: number) => {
    if (timer.value) {
      clearTimeout(timer.value);
      timer.value = window.setTimeout(() => {
        dismiss();
      }, additionalMs);
    }
  },
});
</script>

<style scoped>
.notification {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border-left: 4px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  max-width: 400px;
  min-width: 300px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.notification--dismissible {
  padding-right: 48px;
}

/* 类型样式 */
.notification--success {
  border-left-color: var(--success-color);
}

.notification--success .notification__icon {
  color: var(--success-color);
}

.notification--error {
  border-left-color: var(--error-color);
}

.notification--error .notification__icon {
  color: var(--error-color);
}

.notification--warning {
  border-left-color: var(--warning-color);
}

.notification--warning .notification__icon {
  color: var(--warning-color);
}

.notification--info {
  border-left-color: var(--info-color);
}

.notification--info .notification__icon {
  color: var(--info-color);
}

.notification--loading {
  border-left-color: var(--primary-color);
}

.notification--loading .notification__icon {
  color: var(--primary-color);
}

/* 图标 */
.notification__icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 内容 */
.notification__content {
  flex: 1;
  min-width: 0;
}

.notification__title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.notification__message {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
  word-break: break-word;
}

/* 操作按钮 */
.notification__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.notification__action {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.notification__action.primary {
  background: var(--primary-color);
  color: white;
}

.notification__action.primary:hover {
  background: var(--primary-hover);
}

.notification__action.secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.notification__action.secondary:hover {
  background: var(--bg-hover);
}

.notification__action.danger {
  background: var(--error-color);
  color: white;
}

.notification__action.danger:hover {
  background: var(--error-hover);
}

/* 关闭按钮 */
.notification__close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification__close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 进度条 */
.notification__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--primary-color);
  width: 100%;
  transform-origin: left;
  animation: shrink-progress linear forwards;
}

@keyframes shrink-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* 过渡动画 */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.2s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification {
    max-width: calc(100vw - 32px);
    min-width: unset;
  }
  
  .notification__actions {
    flex-direction: column;
  }
  
  .notification__action {
    width: 100%;
  }
}

/* 可访问性 */
@media (prefers-reduced-motion: reduce) {
  .notification {
    transition: none;
  }
  
  .notification-enter-active,
  .notification-leave-active {
    transition: none;
  }
  
  .spinning {
    animation: none;
  }
  
  .notification__progress {
    animation: none;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .notification {
    border: 2px solid var(--text-primary);
  }
}
</style>
