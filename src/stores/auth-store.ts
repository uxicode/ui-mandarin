import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const initDone = ref(false)

  const user = computed<User | null>(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!session.value?.access_token)
  const accessToken = computed(() => session.value?.access_token ?? null)

  async function initAuth() {
    const { data: { session: s } } = await supabase.auth.getSession()
    session.value = s

    supabase.auth.onAuthStateChange(async (event, newSession) => {
      session.value = newSession
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        const { useTaskStore } = await import('@/stores/task-store')
        await useTaskStore().fetchTasks().catch(() => {})
      }
    })

    initDone.value = true
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
    return data
  }

  async function signUp(email: string, password: string, displayName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName } : undefined,
      },
    })
    if (error) throw error
    session.value = data.session
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    session.value = null
  }

  async function updateProfile(updates: { displayName?: string }) {
    const { data, error } = await supabase.auth.updateUser({
      data: updates.displayName !== undefined ? { display_name: updates.displayName } : undefined,
    })
    if (error) throw error
    if (data.user) {
      const { data: { session: s } } = await supabase.auth.getSession()
      session.value = s
    }
    return data
  }

  return {
    session,
    initDone,
    user,
    isAuthenticated,
    accessToken,
    initAuth,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
})
