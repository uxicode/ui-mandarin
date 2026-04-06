<template>
  <div
    class="app-loading-bar"
    :class="{ 'app-loading-bar--active': isActive }"
    role="progressbar"
    aria-label="로딩 중"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import { useAuthStore } from '@/stores/auth-store'

const taskStore = useTaskStore()
const authStore = useAuthStore()

const isActive = computed(() => taskStore.isLoading || authStore.isLoading)
</script>

<style lang="scss" scoped>
@use '@/styles/index.scss' as *;

.app-loading-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;

  &--active {
    opacity: 1;
    background: linear-gradient(
      90deg,
      $color-primary-dark 0%,
      $color-primary 40%,
      $color-primary-light 60%,
      $color-primary 100%
    );
    background-size: 200% 100%;
    animation: app-loading-shimmer 1.1s linear infinite;
  }
}

@keyframes app-loading-shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
</style>
