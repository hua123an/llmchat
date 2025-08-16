<template>
  <router-view />
  <AnnouncementFloating />
  <KnowledgeFloating />
  
</template>

<script setup lang="ts">
import AnnouncementFloating from './components/common/AnnouncementFloating.vue';
import KnowledgeFloating from './components/KnowledgeFloating.vue';
</script>
