<template>
  <div class="auth-view">
    <div class="auth-card">
      <h1 class="auth-card__title">로그인</h1>
      <p class="auth-card__hint">로그인하면 서버에 업무가 저장됩니다. 비로그인 시 이 기기 로컬에만 저장됩니다.</p>
      <form class="auth-form" @submit.prevent="onSubmit">
        <label class="auth-form__label">
          이메일
          <input v-model="email" type="email" class="auth-form__input" required autocomplete="email" />
        </label>
        <label class="auth-form__label">
          비밀번호
          <input
            v-model="password"
            type="password"
            class="auth-form__input"
            required
            autocomplete="current-password"
          />
        </label>
        <p v-if="errorMessage" class="auth-form__error">{{ errorMessage }}</p>
        <button type="submit" class="auth-form__submit" :disabled="loading">
          {{ loading ? '처리 중…' : '로그인' }}
        </button>
      </form>
      <p class="auth-card__footer">
        계정이 없으신가요?
        <RouterLink to="/signup">회원가입</RouterLink>
      </p>
      <RouterLink to="/" class="auth-card__back">← 홈으로</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await authStore.signIn(email.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect || '/')
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '로그인에 실패했습니다.'
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
  margin-bottom: $spacing-sm;
}

.auth-card__hint {
  font-size: 0.8125rem;
  color: $color-gray-600;
  margin-bottom: $spacing-lg;
  line-height: 1.5;
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

.auth-card__footer {
  margin-top: $spacing-lg;
  font-size: 0.875rem;
  color: $color-gray-600;

  a {
    color: $color-primary;
    font-weight: 600;
  }
}

.auth-card__back {
  display: inline-block;
  margin-top: $spacing-md;
  font-size: 0.875rem;
  color: $color-gray-500;
}
</style>
