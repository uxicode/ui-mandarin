<template>
  <div class="auth-view">
    <div class="auth-card">
      <h1 class="auth-card__title">프로필</h1>
      <template v-if="authStore.isAuthenticated">
        <p class="profile-email"><strong>이메일</strong> {{ authStore.user?.email }}</p>
        <form class="auth-form" @submit.prevent="onSave">
          <label class="auth-form__label">
            표시 이름
            <input v-model="displayName" type="text" class="auth-form__input" />
          </label>
          <p v-if="errorMessage" class="auth-form__error">{{ errorMessage }}</p>
          <p v-if="successMessage" class="auth-form__info">{{ successMessage }}</p>
          <button type="submit" class="auth-form__submit" :disabled="loading">
            {{ loading ? '저장 중…' : '저장' }}
          </button>
        </form>
        <button type="button" class="auth-form__secondary" :disabled="loading" @click="onLogout">
          로그아웃
        </button>
      </template>
      <p v-else class="auth-form__error">로그인이 필요합니다.</p>
      <RouterLink to="/" class="auth-card__back">← 홈으로</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const router = useRouter()
const authStore = useAuthStore()

const displayName = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function syncDisplayName() {
  const meta = authStore.user?.user_metadata as { display_name?: string } | undefined
  displayName.value = meta?.display_name ?? ''
}

onMounted(() => {
  if (!authStore.isAuthenticated) {
    router.replace({ path: '/login', query: { redirect: '/profile' } })
    return
  }
  syncDisplayName()
})

watch(
  () => authStore.user,
  () => syncDisplayName(),
  { immediate: true }
)

async function onSave() {
  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true
  try {
    await authStore.updateProfile({ displayName: displayName.value.trim() })
    successMessage.value = '저장되었습니다.'
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '저장에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function onLogout() {
  loading.value = true
  try {
    await authStore.signOut()
    await router.push('/')
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '로그아웃에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/index.scss' as *;

.auth-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  padding: $spacing-xl;
  background: $color-white;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
}

.auth-card__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: $spacing-lg;
}

.profile-email {
  font-size: 0.875rem;
  color: $color-gray-700;
  margin-bottom: $spacing-lg;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.auth-form__label {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-gray-700;
}

.auth-form__input {
  padding: $spacing-sm $spacing-md;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-size: 1rem;
}

.auth-form__error {
  font-size: 0.875rem;
  color: $color-danger;
}

.auth-form__info {
  font-size: 0.875rem;
  color: $color-success;
}

.auth-form__submit {
  padding: $spacing-sm $spacing-md;
  background: $color-primary;
  color: $color-white;
  border: none;
  border-radius: $radius-md;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.auth-form__secondary {
  margin-top: $spacing-md;
  padding: $spacing-sm $spacing-md;
  width: 100%;
  background: transparent;
  color: $color-gray-700;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-weight: 600;
  cursor: pointer;
}

.auth-card__back {
  display: inline-block;
  margin-top: $spacing-lg;
  font-size: 0.875rem;
  color: $color-gray-500;
}
</style>
