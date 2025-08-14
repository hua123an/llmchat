<template>
  <div class="notification-container">
    <!-- 各个位置的通知容器 -->
    <div
      v-for="position in positions"
      :key="position"
      :class="[
        'notification-group',
        `notification-group--${position}`
      ]"
    >
      <TransitionGroup
        name="notification-group"
        tag="div"
        class="notification-list"
      >
        <Notification
          v-for="notification in getNotificationsByPosition(position)"
          :key="notification.id"
          v-bind="notification"
          @dismiss="handleDismiss(notification.id)"
          @action="handleAction(notification.id, $event)"
          @click="handleClick(notification.id)"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { inject, SERVICE_TOKENS } from '../../services/container';
import type { NotificationService, Notification as NotificationData } from '../../services/NotificationService';
import type { NotificationAction } from './Notification.vue';
import Notification from './Notification.vue';

// 服务注入
const notificationService = inject<NotificationService>(SERVICE_TOKENS.NOTIFICATION_SERVICE);

// Props
interface Props {
  maxPerPosition?: number;
  enableKeyboardShortcuts?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  maxPerPosition: 5,
  enableKeyboardShortcuts: true,
});

// Emits
const emit = defineEmits<{
  notificationDismiss: [id: string];
  notificationAction: [id: string, action: NotificationAction];
  notificationClick: [id: string];
}>();

// 支持的位置
const positions = [
  'top-left',
  'top-center', 
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

// 计算属性
const notifications = computed(() => {
  return notificationService?.getNotifications() || [];
});

const getNotificationsByPosition = (position: typeof positions[number]) => {
  if (!notificationService) return [];
  
  const positionNotifications = notificationService.getNotificationsByPosition(position);
  
  // 限制每个位置的通知数量
  return positionNotifications.slice(0, props.maxPerPosition);
};

// 方法
const handleDismiss = (id: string) => {
  notificationService?.dismiss(id);
  emit('notificationDismiss', id);
};

const handleAction = (id: string, action: NotificationAction) => {
  emit('notificationAction', id, action);
};

const handleClick = (id: string) => {
  emit('notificationClick', id);
};

// 键盘快捷键
const handleKeyboard = (event: KeyboardEvent) => {
  if (!props.enableKeyboardShortcuts) return;

  // Esc - 关闭所有非持久化通知
  if (event.key === 'Escape') {
    notificationService?.dismissAll(true);
    event.preventDefault();
  }

  // Ctrl+Shift+N - 关闭所有通知（包括持久化）
  if (event.ctrlKey && event.shiftKey && event.key === 'N') {
    notificationService?.dismissAll(false);
    event.preventDefault();
  }
};

// 生命周期
onMounted(() => {
  if (props.enableKeyboardShortcuts) {
    document.addEventListener('keydown', handleKeyboard);
  }
});

onUnmounted(() => {
  if (props.enableKeyboardShortcuts) {
    document.removeEventListener('keydown', handleKeyboard);
  }
});

// 暴露方法给父组件
defineExpose({
  dismissAll: () => notificationService?.dismissAll(),
  getStats: () => notificationService?.getStats(),
});
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 9999;
}

.notification-group {
  position: absolute;
  pointer-events: none;
  max-width: 90vw;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-group > * {
  pointer-events: auto;
}

/* 位置样式 */
.notification-group--top-left {
  top: 20px;
  left: 20px;
}

.notification-group--top-center {
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.notification-group--top-right {
  top: 20px;
  right: 20px;
}

.notification-group--bottom-left {
  bottom: 20px;
  left: 20px;
}

.notification-group--bottom-center {
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.notification-group--bottom-right {
  bottom: 20px;
  right: 20px;
}

/* 底部位置的通知从下往上排列 */
.notification-group--bottom-left .notification-list,
.notification-group--bottom-center .notification-list,
.notification-group--bottom-right .notification-list {
  flex-direction: column-reverse;
}

/* 过渡动画 */
.notification-group-enter-active {
  transition: all 0.3s ease-out;
}

.notification-group-leave-active {
  transition: all 0.2s ease-in;
}

.notification-group-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.notification-group-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 底部位置的动画方向相反 */
.notification-group--bottom-left .notification-group-enter-from,
.notification-group--bottom-center .notification-group-enter-from,
.notification-group--bottom-right .notification-group-enter-from {
  transform: translateY(20px);
}

.notification-group--bottom-left .notification-group-leave-to,
.notification-group--bottom-center .notification-group-leave-to,
.notification-group--bottom-right .notification-group-leave-to {
  transform: translateY(20px);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .notification-group {
    max-width: calc(100vw - 16px);
  }
  
  .notification-group--top-left,
  .notification-group--bottom-left {
    left: 8px;
  }
  
  .notification-group--top-right,
  .notification-group--bottom-right {
    right: 8px;
  }
  
  .notification-group--top-center,
  .notification-group--bottom-center {
    left: 8px;
    right: 8px;
    transform: none;
    max-width: none;
  }
  
  .notification-group--top-left,
  .notification-group--top-center,
  .notification-group--top-right {
    top: 10px;
  }
  
  .notification-group--bottom-left,
  .notification-group--bottom-center,
  .notification-group--bottom-right {
    bottom: 10px;
  }
}

/* 高度受限时的滚动 */
@media (max-height: 600px) {
  .notification-list {
    max-height: 50vh;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border-color) transparent;
  }
  
  .notification-list::-webkit-scrollbar {
    width: 4px;
  }
  
  .notification-list::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .notification-list::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 2px;
  }
}

/* 减少动画的用户偏好 */
@media (prefers-reduced-motion: reduce) {
  .notification-group-enter-active,
  .notification-group-leave-active {
    transition: none;
  }
  
  .notification-group-enter-from,
  .notification-group-leave-to {
    transform: none;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .notification-group {
    filter: contrast(1.2);
  }
}

/* 打印时隐藏通知 */
@media print {
  .notification-container {
    display: none;
  }
}
</style>
