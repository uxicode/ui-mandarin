<template>
  <div class="auth-view">
    <div class="auth-card">
      <h1 class="auth-card__title">회원가입</h1>
      <p class="auth-card__hint">가입 후 이메일 인증이 필요한 경우 Supabase 설정을 확인하세요.</p>
      <form class="auth-form" @submit.prevent="onSubmit">
        <label class="auth-form__label">
          표시 이름 (선택)
          <input v-model="displayName" type="text" class="auth-form__input" autocomplete="name" />
        </label>
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
            minlength="6"
            autocomplete="new-password"
          />
        </label>
        <p v-if="errorMessage" class="auth-form__error">{{ errorMessage }}</p>
        <p v-if="infoMessage" class="auth-form__info">{{ infoMessage }}</p>
        <button type="submit" class="auth-form__submit" :disabled="loading">
          {{ loading ? '처리 중…' : '가입하기' }}
        </button>
      </form>
      <p class="auth-card__footer">
        이미 계정이 있으신가요?
        <RouterLink to="/login">로그인</RouterLink>
      </p>
      <RouterLink to="/" class="auth-card__back">← 홈으로</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth-store'

const router = useRouter()
const authStore = useAuthStore()

const displayName = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  infoMessage.value = ''
  loading.value = true
  try {
    const data = await authStore.signUp(
      email.value,
      password.value,
      displayName.value.trim() || undefined
    )
    if (data.sessionCreated) {
      await router.push('/')
    } else {
      infoMessage.value = '가입 확인 이메일을 확인한 뒤 로그인해 주세요.'
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '회원가입에 실패했습니다.'
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

  &--block {
    margin-bottom: 0;
    line-height: 1.5;

    code {
      font-size: 0.8125rem;
    }
  }
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
