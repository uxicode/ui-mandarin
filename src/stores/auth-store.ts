import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '')

export interface AuthUser {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const initDone = ref(false)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!user.value)

  /** 로그인 상태에 맞게 서버 tasks 또는 게스트 localStorage 로드 */
  async function refreshTasksAfterAuthChange() {
    const { useTaskStore } = await import('@/stores/task-store')
    await useTaskStore().fetchTasks().catch(() => {})
  }

  async function initAuth() {
    try {
      const res = await fetch(`${apiBase}/auth/me`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await parseJson(res)
        if (data.success && data.user && typeof data.user === 'object') {
          user.value = data.user as AuthUser
        } else {
          user.value = null
        }
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    }
    // 세션 복원 직후: 회원이면 API, 게스트면 localStorage 에서 목록 로드
    await refreshTasksAfterAuthChange()
    initDone.value = true
  }

  async function signIn(email: string, password: string) {
    isLoading.value = true
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await parseJson(res)
      if (!res.ok || !data.success) {
        throw new Error(typeof data.error === 'string' ? data.error : '로그인에 실패했습니다.')
      }
      if (data.user && typeof data.user === 'object') {
        user.value = data.user as AuthUser
      }
      await refreshTasksAfterAuthChange()
      return data
    } finally {
      isLoading.value = false
    }
  }

  async function signUp(email: string, password: string, displayName?: string) {
    isLoading.value = true
    try {
      const res = await fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      })
      const data = await parseJson(res)
      if (!res.ok || !data.success) {
        throw new Error(typeof data.error === 'string' ? data.error : '회원가입에 실패했습니다.')
      }
      if (data.sessionCreated && data.user && typeof data.user === 'object') {
        user.value = data.user as AuthUser
      } else {
        user.value = null
      }
      await refreshTasksAfterAuthChange()
      return data
    } finally {
      isLoading.value = false
    }
  }

  async function signOut() {
    isLoading.value = true
    try {
      await fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      user.value = null
      await refreshTasksAfterAuthChange()
      isLoading.value = false
    }
  }

  async function updateProfile(updates: { displayName?: string }) {
    isLoading.value = true
    try {
      const res = await fetch(`${apiBase}/auth/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: updates.displayName }),
      })
      const data = await parseJson(res)
      if (!res.ok || !data.success) {
        throw new Error(typeof data.error === 'string' ? data.error : '프로필 수정에 실패했습니다.')
      }
      if (data.user && typeof data.user === 'object') {
        user.value = data.user as AuthUser
      }
      return data
    } finally {
      isLoading.value = false
    }
  }

  return {
    user,
    initDone,
    isLoading,
    isAuthenticated,
    initAuth,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
})
