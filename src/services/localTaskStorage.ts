import type { Task } from '@/types/task'

const STORAGE_KEY = 'mandarin_guest_tasks'

function parseTasks(raw: string | null): Task[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as Task[]
  } catch {
    return []
  }
}

export const localTaskStorage = {
  load(): Task[] {
    if (typeof localStorage === 'undefined') return []
    return parseTasks(localStorage.getItem(STORAGE_KEY))
  },

  save(tasks: Task[]): void {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  },

  clear(): void {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  },
}
