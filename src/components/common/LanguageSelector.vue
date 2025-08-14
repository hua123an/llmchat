<template>
  <div class="language-selector" :class="{ 'is-dropdown': dropdown }">
    <!-- 下拉模式 -->
    <div v-if="dropdown" class="dropdown-trigger" @click="toggleDropdown">
      <div class="current-language">
        <span class="language-flag">{{ currentLocaleInfo?.flag }}</span>
        <span v-if="showName" class="language-name">{{ currentLocaleInfo?.nativeName }}</span>
        <span v-if="showCode" class="language-code">{{ locale }}</span>
        <svg class="dropdown-icon" :class="{ 'is-open': isDropdownOpen }" viewBox="0 0 24 24" width="16" height="16">
          <path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
        </svg>
      </div>
      
      <Transition name="dropdown">
        <div v-if="isDropdownOpen" class="dropdown-menu" @click.stop>
          <div class="dropdown-header" v-if="showHeader">
            <span class="dropdown-title">{{ t('settings.select_language') }}</span>
            <button @click="closeDropdown" class="close-btn">×</button>
          </div>
          
          <div class="language-list">
            <button
              v-for="localeInfo in availableLocales"
              :key="localeInfo.code"
              class="language-item"
              :class="{ 'is-active': localeInfo.code === locale }"
              @click="selectLanguage(localeInfo.code)"
            >
              <span class="language-flag">{{ localeInfo.flag }}</span>
              <div class="language-info">
                <span class="language-name">{{ localeInfo.nativeName }}</span>
                <span class="language-english">{{ localeInfo.name }}</span>
              </div>
              <span v-if="localeInfo.code === locale" class="check-icon">✓</span>
            </button>
          </div>
          
          <div v-if="showAutoDetect" class="dropdown-footer">
            <button @click="autoDetectLanguage" class="auto-detect-btn">
              🌐 {{ t('settings.auto_detect') }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
    
    <!-- 列表模式 -->
    <div v-else class="language-list-mode">
      <div v-if="title" class="list-title">{{ title }}</div>
      
      <div class="language-grid" :class="gridClass">
        <button
          v-for="localeInfo in availableLocales"
          :key="localeInfo.code"
          class="language-card"
          :class="{ 'is-active': localeInfo.code === locale }"
          @click="selectLanguage(localeInfo.code)"
        >
          <span class="language-flag">{{ localeInfo.flag }}</span>
          <div class="language-info">
            <span class="language-name">{{ localeInfo.nativeName }}</span>
            <span v-if="showEnglishName" class="language-english">{{ localeInfo.name }}</span>
            <span v-if="showRegion" class="language-region">{{ localeInfo.region }}</span>
          </div>
        </button>
      </div>
      
      <div v-if="showAutoDetect" class="auto-detect-section">
        <button @click="autoDetectLanguage" class="auto-detect-btn">
          <span class="auto-detect-icon">🌐</span>
          <span>{{ t('settings.auto_detect') }}</span>
          <span v-if="detectedLocale" class="detected-language">
            ({{ getLocaleInfo(detectedLocale)?.nativeName }})
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from '../../composables/useI18n';
import type { LocaleInfo } from '../../i18n';

interface Props {
  dropdown?: boolean;
  showName?: boolean;
  showCode?: boolean;
  showEnglishName?: boolean;
  showRegion?: boolean;
  showHeader?: boolean;
  showAutoDetect?: boolean;
  title?: string;
  gridColumns?: number;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  dropdown: true,
  showName: true,
  showCode: false,
  showEnglishName: true,
  showRegion: false,
  showHeader: true,
  showAutoDetect: true,
  gridColumns: 2,
  compact: false,
});

const emit = defineEmits<{
  change: [locale: string];
  'auto-detect': [locale: string];
}>();

// I18n composable
const {
  locale,
  availableLocales,
  currentLocaleInfo,
  setLocale,
  getLocaleInfo,
  detectUserPreferredLocale,
  t,
} = useI18n();

// 状态
const isDropdownOpen = ref(false);
const detectedLocale = ref<string>('');

// 计算属性
const gridClass = computed(() => {
  if (props.compact) return 'grid-compact';
  return `grid-cols-${props.gridColumns}`;
});

// 方法
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

const closeDropdown = () => {
  isDropdownOpen.value = false;
};

const selectLanguage = (localeCode: string) => {
  if (localeCode !== locale) {
    setLocale(localeCode);
    emit('change', localeCode);
  }
  
  if (props.dropdown) {
    closeDropdown();
  }
};

const autoDetectLanguage = () => {
  const detected = detectUserPreferredLocale();
  detectedLocale.value = detected;
  
  if (detected !== locale) {
    selectLanguage(detected);
    emit('auto-detect', detected);
  }
  
  if (props.dropdown) {
    closeDropdown();
  }
};

// 点击外部关闭下拉菜单
const handleClickOutside = (event: Event) => {
  const target = event.target as Element;
  const selector = target.closest('.language-selector');
  
  if (!selector && isDropdownOpen.value) {
    closeDropdown();
  }
};

// 键盘导航
const handleKeydown = (event: KeyboardEvent) => {
  if (!isDropdownOpen.value) return;
  
  switch (event.key) {
    case 'Escape':
      closeDropdown();
      break;
    case 'Enter':
    case ' ':
      if (document.activeElement?.classList.contains('language-item')) {
        event.preventDefault();
        (document.activeElement as HTMLButtonElement).click();
      }
      break;
  }
};

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
  
  // 初始检测
  if (props.showAutoDetect) {
    detectedLocale.value = detectUserPreferredLocale();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.language-selector {
  position: relative;
  font-family: var(--font-family);
}

/* 下拉模式 */
.dropdown-trigger {
  position: relative;
  cursor: pointer;
}

.current-language {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  transition: all 0.2s ease;
  min-width: 120px;
}

.current-language:hover {
  border-color: var(--border-hover);
  background: var(--bg-tertiary);
}

.language-flag {
  font-size: 18px;
  line-height: 1;
}

.language-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
}

.language-code {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
}

.dropdown-icon {
  color: var(--text-secondary);
  transition: transform 0.2s ease;
}

.dropdown-icon.is-open {
  transform: rotate(180deg);
}

/* 下拉菜单 */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  max-height: 400px;
  min-width: 280px;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.dropdown-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.language-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.language-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.language-item:hover {
  background: var(--bg-secondary);
}

.language-item.is-active {
  background: var(--primary-color);
  color: white;
}

.language-item.is-active .language-info {
  color: white;
}

.language-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.language-info .language-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.language-info .language-english {
  font-size: 12px;
  color: var(--text-secondary);
}

.check-icon {
  color: var(--success-color);
  font-weight: bold;
}

.language-item.is-active .check-icon {
  color: white;
}

.dropdown-footer {
  border-top: 1px solid var(--border-color);
  padding: 8px;
}

.auto-detect-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.auto-detect-btn:hover {
  border-color: var(--primary-color);
  background: var(--primary-light);
  color: var(--primary-color);
}

/* 列表模式 */
.language-list-mode {
  width: 100%;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.language-grid {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid-cols-4 { grid-template-columns: repeat(4, 1fr); }

.grid-compact {
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.language-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  min-height: 60px;
}

.language-card:hover {
  border-color: var(--primary-color);
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.language-card.is-active {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: white;
  box-shadow: var(--shadow-md);
}

.language-card.is-active .language-info {
  color: white;
}

.language-card .language-flag {
  font-size: 24px;
}

.language-card .language-info .language-name {
  font-size: 14px;
  font-weight: 600;
}

.language-card .language-info .language-english {
  font-size: 12px;
  opacity: 0.8;
}

.language-card .language-info .language-region {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 2px;
}

.auto-detect-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.auto-detect-section .auto-detect-btn {
  justify-content: center;
  font-size: 14px;
}

.auto-detect-icon {
  font-size: 16px;
}

.detected-language {
  font-size: 12px;
  opacity: 0.7;
}

/* 过渡动画 */
.dropdown-enter-active {
  transition: all 0.2s ease-out;
}

.dropdown-leave-active {
  transition: all 0.15s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dropdown-menu {
    min-width: 250px;
  }
  
  .language-grid {
    grid-template-columns: 1fr;
  }
  
  .grid-compact {
    grid-template-columns: 1fr;
  }
  
  .language-card {
    min-height: 50px;
    padding: 10px;
  }
}

/* 无障碍访问 */
.language-item:focus,
.language-card:focus,
.auto-detect-btn:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .language-item,
  .language-card {
    border-width: 2px;
  }
  
  .language-item.is-active,
  .language-card.is-active {
    border-color: var(--text-primary);
  }
}

/* 减少动画的用户偏好 */
@media (prefers-reduced-motion: reduce) {
  .dropdown-icon,
  .language-item,
  .language-card,
  .auto-detect-btn,
  .dropdown-enter-active,
  .dropdown-leave-active {
    transition: none !important;
  }
  
  .language-card:hover {
    transform: none;
  }
}
</style>
