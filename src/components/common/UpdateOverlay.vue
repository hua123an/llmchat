<template>
  <transition name="fade">
    <div v-if="visible" class="overlay">
      <div class="panel">
        <div class="title">发现重要更新</div>
        <div class="notes" v-html="notesHtml"></div>
        <div class="progress" v-if="status==='downloading'">
          <div class="bar"><div class="fill" :style="{ width: (progress||0)+'%' }"></div></div>
          <div class="hint">正在下载 {{ progress || 0 }}%</div>
        </div>
        <div class="actions">
          <el-button type="primary" v-if="status!=='downloaded'" @click="downloadNow">立即下载</el-button>
          <el-button type="primary" v-else @click="installNow">立即重启安装</el-button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useChatStore } from '../../store/chat';
const store = useChatStore();
const visible = computed(() => store.forceUpdateState.required && ['available','downloading','downloaded'].includes(store.forceUpdateState.status));
const status = computed(() => store.forceUpdateState.status);
const progress = computed(() => store.forceUpdateState.progress || 0);
const notesHtml = computed(() => {
  const md = store.forceUpdateState.notes || '';
  return md
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^###\s?(.*)$/gm,'<h3>$1</h3>')
    .replace(/^##\s?(.*)$/gm,'<h2>$1</h2>')
    .replace(/^#\s?(.*)$/gm,'<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g,'<b>$1</b>')
    .replace(/\*(.*?)\*/g,'<i>$1</i>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\n/g,'<br/>');
});

const downloadNow = () => (window as any).electronAPI?.downloadUpdate?.();
const installNow = () => (window as any).electronAPI?.quitAndInstall?.();
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index: 9999; }
.panel { width: 520px; background: var(--bg-primary); border-radius: 12px; padding: 20px; box-shadow: 0 8px 30px rgba(0,0,0,.2); }
.title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
.notes { max-height: 40vh; overflow:auto; color: var(--text-primary); font-size: 14px; line-height: 1.6; }
.progress { margin-top: 12px; }
.bar { height: 8px; background: var(--bg-tertiary); border-radius: 6px; overflow: hidden; }
.fill { height: 100%; background: var(--primary-color); }
.actions { display:flex; justify-content:flex-end; gap:10px; margin-top: 16px; }
.fade-enter-active,.fade-leave-active{ transition: opacity .2s ease; }
.fade-enter-from,.fade-leave-to{ opacity: 0; }
</style>


