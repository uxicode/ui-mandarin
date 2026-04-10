import type { Memo } from '@/types/memo'

const STORAGE_KEY = 'mandarin_guest_memos'

function parseMemos(raw: string | null): Memo[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as Memo[]
  } catch {
    return []
  }
}

export const localMemoStorage = {
  load(): Memo[] {
    if (typeof localStorage === 'undefined') return []
    return parseMemos(localStorage.getItem(STORAGE_KEY))
  },

  save(memos: Memo[]): void {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memos))
  },

  clear(): void {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  },
}
