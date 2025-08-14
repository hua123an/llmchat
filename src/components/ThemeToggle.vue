<template>
  <div class="theme-toggle">
    <el-button @click="toggleTheme" class="theme-button icon-only" :title="currentThemeLabel">
      <span class="theme-icon">{{ currentThemeIcon }}</span>
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { themeManager, theme, isDark } from '../utils/themeManager';

const { t } = useI18n();

const currentThemeIcon = computed(() => {
  if (theme.value === 'auto') {
    return isDark.value ? '🌙' : '☀️';
  }
  return theme.value === 'dark' ? '🌙' : '☀️';
});

const currentThemeLabel = computed(() => {
  if (theme.value === 'auto') {
    return isDark.value ? t('themeToggle.darkMode') : t('themeToggle.lightMode');
  }
  return theme.value === 'dark' ? t('themeToggle.darkMode') : t('themeToggle.lightMode');
});

const toggleTheme = () => {
  themeManager.toggleTheme();
};
</script>

<style scoped>
.theme-toggle {
  position: relative;
}

.theme-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
  cursor: pointer;
  font-size: 14px;
  min-width: 100px;
}

.theme-button:hover {
  background: var(--bg-secondary);
  border-color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.theme-icon {
  font-size: 16px;
}

.theme-text {
  font-weight: 500;
  white-space: nowrap;
}

/* 只显示图标的样式 */
.theme-button.icon-only {
  min-width: 40px;
  width: 40px;
  padding: 8px;
  justify-content: center;
}

.theme-button.icon-only .theme-text {
  display: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .theme-button.icon-only {
    padding: 6px;
    min-width: 36px;
    width: 36px;
  }
}
</style>