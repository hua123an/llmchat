import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import { themeManager } from './utils/themeManager';
import { keyboardManager } from './utils/keyboardManager';
import i18n from './locales';
import './style.css';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
// 初始化主题管理器
themeManager;

// 初始化键盘管理器
keyboardManager;

// 全局暴露主题管理器
(window as any).__THEME_MANAGER__ = themeManager;

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(ElementPlus);
app.use(i18n);
app.use(VueQueryPlugin, { queryClient: new QueryClient() });

app.mount('#app');
// 初始化主题属性
themeManager.init();