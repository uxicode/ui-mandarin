import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Memo } from '@/types/memo'
import { apiService } from '@/services/api'
import { localMemoStorage } from '@/services/localMemoStorage'
import { useAuthStore } from '@/stores/auth-store'

function sortMemosDesc(memos: Memo[]): Memo[] {
  return [...memos].sort((a, b) => {
    const at = new Date(a.updatedAt).getTime()
    const bt = new Date(b.updatedAt).getTime()
    return bt - at
  })
}

export const useMemoStore = defineStore('memo', () => {
  const memos = ref<Memo[]>([])
  const selectedMemoId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const selectedMemo = computed(() =>
    selectedMemoId.value ? memos.value.find((m) => m.id === selectedMemoId.value) ?? null : null
  )

  function isGuest(): boolean {
    return !useAuthStore().isAuthenticated
  }

  async function fetchMemos() {
    isLoading.value = true
    error.value = null
    try {
      if (isGuest()) {
        memos.value = sortMemosDesc(localMemoStorage.load())
      } else {
        memos.value = sortMemosDesc(await apiService.getMemos())
      }
      if (selectedMemoId.value && !memos.value.some((m) => m.id === selectedMemoId.value)) {
        selectedMemoId.value = memos.value[0]?.id ?? null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load memos.'
      console.error(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function addMemo(partial: { title?: string; body?: string } = {}) {
    isLoading.value = true
    error.value = null
    try {
      if (isGuest()) {
        const now = new Date().toISOString()
        const memo: Memo = {
          id: crypto.randomUUID(),
          title: partial.title ?? '',
          body: partial.body ?? '',
          createdAt: now,
          updatedAt: now,
        }
        memos.value = sortMemosDesc([...memos.value, memo])
        localMemoStorage.save(memos.value)
        selectedMemoId.value = memo.id
        return memo
      }
      const memo = await apiService.createMemo(partial)
      memos.value = sortMemosDesc([...memos.value, memo])
      selectedMemoId.value = memo.id
      return memo
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create memo.'
      console.error(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function saveMemo(id: string, updates: { title?: string; body?: string }) {
    error.value = null
    try {
      if (isGuest()) {
        const idx = memos.value.findIndex((m) => m.id === id)
        if (idx === -1) throw new Error('Memo not found.')
        const now = new Date().toISOString()
        const merged: Memo = {
          ...memos.value[idx]!,
          ...(updates.title !== undefined ? { title: updates.title } : {}),
          ...(updates.body !== undefined ? { body: updates.body } : {}),
          updatedAt: now,
        }
        const next = [...memos.value]
        next[idx] = merged
        memos.value = sortMemosDesc(next)
        localMemoStorage.save(memos.value)
        return merged
      }
      const updated = await apiService.updateMemo(id, updates)
      const idx = memos.value.findIndex((m) => m.id === id)
      if (idx !== -1) {
        const next = [...memos.value]
        next[idx] = updated
        memos.value = sortMemosDesc(next)
      }
      return updated
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save memo.'
      console.error(err)
      throw err
    }
  }

  async function removeMemo(id: string) {
    isLoading.value = true
    error.value = null
    try {
      if (isGuest()) {
        memos.value = memos.value.filter((m) => m.id !== id)
        localMemoStorage.save(memos.value)
        if (selectedMemoId.value === id) {
          selectedMemoId.value = memos.value[0]?.id ?? null
        }
        return
      }
      await apiService.deleteMemo(id)
      memos.value = memos.value.filter((m) => m.id !== id)
      if (selectedMemoId.value === id) {
        selectedMemoId.value = memos.value[0]?.id ?? null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete memo.'
      console.error(err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function selectMemo(id: string | null) {
    selectedMemoId.value = id
  }

  /** 선택한 메모를 목록 상단으로 (나머지는 상대 순서 유지). 게스트는 로컬 저장순서 동기화. */
  function pinMemoToTop(id: string) {
    const idx = memos.value.findIndex((m) => m.id === id)
    if (idx === -1 || idx === 0) return
    const next = [...memos.value]
    const [row] = next.splice(idx, 1)
    memos.value = [row, ...next]
    if (isGuest()) localMemoStorage.save(memos.value)
  }

  return {
    memos,
    selectedMemoId,
    selectedMemo,
    isLoading,
    error,
    fetchMemos,
    addMemo,
    saveMemo,
    removeMemo,
    selectMemo,
    pinMemoToTop,
  }
})
