<template>
  <Teleport to="body">
    <div
      v-if="message"
      class="app-loading-root"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      :aria-label="message"
    >
      <div class="app-loading-panel">
        <div class="app-loading-donut" aria-hidden="true" />
        <span class="app-loading-text">{{ message }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import { useAuthStore } from '@/stores/auth-store'

const taskStore = useTaskStore()
const authStore = useAuthStore()

const message = computed(() => authStore.loadingMessage ?? taskStore.loadingMessage)
</script>

<style lang="scss">
@use '@/styles/variables.scss' as *;

.app-loading-root {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-md;
  background: rgba($color-gray-900, 0.55);
  pointer-events: auto;
  isolation: isolate;
}

.app-loading-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-xl $spacing-2xl;
  background: $color-white;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
  pointer-events: auto;
}

.app-loading-donut {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 4px solid rgba($color-primary, 0.2);
  border-top-color: $color-primary;
  animation: app-loading-spin 0.75s linear infinite;
}

@keyframes app-loading-spin {
  to { transform: rotate(360deg); }
}

.app-loading-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-700;
}
</style>
