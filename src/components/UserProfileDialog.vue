<template>
  <el-dialog
    v-model="store.isUserProfileOpen"
    :title="t('sidebar.userProfile') || t('sidebar.profile') || '用户资料'"
    class="user-profile-dialog"
    width="420px"
    append-to-body
  >
    <div class="profile-header">
      <div class="avatar">
        <img v-if="store.userAvatar" :src="store.userAvatar" alt="avatar" />
        <span v-else>{{ store.userInitial }}</span>
      </div>
      <div class="basic">
        <div class="name">{{ store.user.name }}</div>
        <div class="email">{{ store.user.email }}</div>
      </div>
    </div>

    <div class="profile-body">
      <el-form label-position="top" class="profile-form">
        <el-form-item :label="t('common.name') || '姓名'">
          <el-input v-model="localName" />
        </el-form-item>
        <el-form-item :label="t('common.email') || '邮箱'">
          <el-input v-model="localEmail" />
        </el-form-item>
        <el-form-item :label="t('common.avatar') || '头像'">
          <div class="avatar-actions">
            <el-button @click="triggerFile">{{ t('common.upload') || '上传图片' }}</el-button>
            <el-button v-if="store.userAvatar" type="danger" plain @click="removeAvatar">{{ t('common.remove') || '移除' }}</el-button>
            <input ref="fileRef" type="file" accept="image/*" @change="onFileChange" style="display:none" />
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="store.closeUserProfile">{{ t('agent.buttons.cancel') }}</el-button>
        <el-button type="primary" @click="save">{{ t('agent.buttons.confirm') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChatStore } from '../store/chat';

const store = useChatStore();
const { t } = useI18n();

const localName = ref(store.user.name);
const localEmail = ref(store.user.email);
const fileRef = ref<HTMLInputElement | null>(null);

watch(() => store.isUserProfileOpen, (open) => {
  if (open) {
    localName.value = store.user.name;
    localEmail.value = store.user.email;
  }
});

const save = () => {
  store.setUser({ name: localName.value, email: localEmail.value });
  store.closeUserProfile();
};

const triggerFile = () => fileRef.value?.click();

const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files && input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as string;
    store.setUserAvatar(result);
  };
  reader.readAsDataURL(file);
  input.value = '';
};

const removeAvatar = () => {
  store.removeUserAvatar();
};
</script>

<style scoped>
.user-profile-dialog :deep(.el-dialog__header) {
  background: var(--header-bg);
  color: var(--text-primary);
  border-bottom: none;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.avatar-actions { display: flex; gap: 8px; }
.basic .name { font-weight: 600; color: var(--text-primary); }
.basic .email { color: var(--text-secondary); font-size: 12px; }
.profile-form { margin-top: 12px; }
</style>

