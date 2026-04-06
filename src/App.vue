<template>
  <div class="app">
    <AppLoadingOverlay />
    <header class="app__header">
      <div class="app__header-row">
        <div class="app__brand">
          <RouterLink to="/" class="app__title-link">
            <h1 class="app__title">Weekly Priorities</h1>
          </RouterLink>
          <p class="app__subtitle">감정이 아닌 수치로 업무 우선순위를 시각화</p>
        </div>
        <nav class="app__nav">
          <template v-if="authStore.isAuthenticated">
            <span class="app__nav-user">{{ displayLabel }}</span>
            <RouterLink to="/profile" class="app__nav-link">프로필</RouterLink>
            <button type="button" class="app__nav-button" @click="onLogout">로그아웃</button>
          </template>
          <template v-else>
            <span class="app__guest-badge">게스트 · 로컬 저장</span>
            <RouterLink to="/login" class="app__nav-link">로그인</RouterLink>
            <RouterLink to="/signup" class="app__nav-link app__nav-link--primary">회원가입</RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'
import AppLoadingOverlay from '@/components/AppLoadingOverlay.vue'

const router = useRouter()
const authStore = useAuthStore()

const displayLabel = computed(() => {
  const u = authStore.user
  if (!u) return ''
  const meta = u.user_metadata as { display_name?: string } | undefined
  return meta?.display_name || u.email || ''
})

async function onLogout() {
  try {
    await authStore.signOut()
    await router.push('/')
  } catch (e) {
    console.error(e)
  }
}
</script>

<style lang="scss">
@use '@/styles/reset.scss';
@use '@/styles/index.scss' as *;

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app__header {
  padding: $spacing-md $spacing-xl;
  background: $color-white;
  border-bottom: 1px solid $color-gray-200;
  box-shadow: $shadow-sm;
}

.app__header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $spacing-lg;
  flex-wrap: wrap;
}

.app__brand {
  min-width: 0;
}

.app__title-link {
  text-decoration: none;
  color: inherit;
}

.app__title {
  font-size: 1.8rem;
  font-weight: 700;
  color: $color-gray-900;
  margin-bottom: $spacing-xs;
}

.app__subtitle {
  font-size: 0.875rem;
  color: $color-gray-600;
}

.app__nav {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  flex-wrap: wrap;
}

.app__nav-user {
  font-size: 0.875rem;
  color: $color-gray-700;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app__guest-badge {
  font-size: 0.75rem;
  color: $color-gray-600;
  background: $color-gray-100;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-md;
}

.app__nav-link {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-primary;
  text-decoration: none;

  &--primary {
    padding: $spacing-xs $spacing-sm;
    background: $color-primary;
    color: $color-white;
    border-radius: $radius-md;
  }
}

.app__nav-button {
  font-size: 0.875rem;
  font-weight: 600;
  padding: $spacing-xs $spacing-sm;
  background: transparent;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  cursor: pointer;
  color: $color-gray-700;

  &:hover {
    background: $color-gray-50;
  }
}

</style>
