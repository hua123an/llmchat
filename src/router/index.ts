import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
import ChatView from '../views/ChatView.vue';

const routes = [
  {
    path: '/',
    name: 'Chat',
    component: ChatView,
  }
];

const router = createRouter({
  // In packaged Electron apps, pages are loaded via file:// protocol.
  // Using history mode there leads to path like /C:/.../index.html which won't match '/'.
  // Switch to hash history under file:// to avoid white screen.
  history: (typeof window !== 'undefined' && window.location.protocol === 'file:')
    ? createWebHashHistory()
    : createWebHistory(),
  routes,
});

export default router;
