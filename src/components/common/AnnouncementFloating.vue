<template>
  <transition name="fade">
    <div v-if="visible" class="announcement-floating" role="dialog" aria-modal="false" :aria-label="`版本公告 ${latest?.version || ''}`">
      <div class="header">
        <div class="title">📢 版本公告</div>
        <div class="version">v{{ latest?.version }}（{{ latest?.date }}）</div>
        <button class="close" @click="visible=false" title="关闭">×</button>
      </div>
      <div class="content">
        <template v-if="latest">
          <div v-for="section in latest.items" :key="section.type" class="section">
            <div class="section-title">{{ section.type }}</div>
            <ul>
              <li v-for="(p, idx) in section.points" :key="idx">{{ p }}</li>
            </ul>
          </div>
        </template>
        <div class="history">
          <el-dropdown trigger="click">
            <span class="el-dropdown-link">
              查看历史版本
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="note in notes" :key="note.version" @click="selectVersion(note.version)">
                  v{{ note.version }}（{{ note.date }}）
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <div class="footer">
        <el-button size="small" @click="openChangelog">查看完整更新日志</el-button>
        <el-button size="small" type="primary" @click="visible=false">我知道了</el-button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { releaseNotes } from '../../assets/announcements';

const notes = releaseNotes;
const selectedVersion = ref<string | null>(null);
const visible = ref(false);

const latest = computed(() => {
  const ver = selectedVersion.value || notes[0]?.version;
  return notes.find(n => n.version === ver) || notes[0];
});

const STORAGE_KEY = 'announcement_dismissed_version';

onMounted(() => {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY) || '';
    const current = notes[0]?.version || '';
    if (dismissed !== current) {
      visible.value = true;
    }
  } catch { visible.value = true; }
});

const selectVersion = (ver: string) => {
  selectedVersion.value = ver;
};

const openChangelog = () => {
  window.open('https://github.com/hua123an/llmchat/blob/main/CHANGELOG.md', '_blank');
};

// 自动存储“已读”状态
watch(visible, (v) => {
  if (!v) {
    try {
      localStorage.setItem(STORAGE_KEY, notes[0]?.version || '');
    } catch {}
  }
});
</script>

<style scoped>
.announcement-floating {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 360px;
  max-width: calc(100vw - 40px);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
}
.header { display:flex; align-items:center; gap:8px; padding:12px 14px; border-bottom: 1px solid var(--border-light); }
.title { font-weight: 600; color: var(--text-primary); }
.version { margin-left: auto; color: var(--text-secondary); font-size: 12px; }
.close { background: transparent; border:none; font-size:18px; cursor:pointer; color: var(--text-secondary); }
.content { padding: 12px 14px; max-height: 280px; overflow:auto; }
.section { margin-bottom: 10px; }
.section-title { font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
ul { margin: 0 0 0 18px; padding: 0; color: var(--text-secondary); }
.history { margin-top: 8px; }
.footer { display:flex; justify-content:flex-end; gap:8px; padding: 10px 14px; border-top: 1px solid var(--border-light); }

.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(8px); }
.fade-enter-active, .fade-leave-active { transition: all .2s ease; }
</style>

