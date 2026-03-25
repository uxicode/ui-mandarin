import type { Task } from '@/types/task'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

const fetchDefaults: RequestInit = {
  credentials: 'include',
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface SupabaseTask {
  id: string
  title: string
  description: string | null
  importance: number
  urgency: number
  start_date: string | null
  deadline: string | null
  completed: boolean
  created_at: string
  updated_at: string
}

function transformSupabaseTask(task: SupabaseTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description || undefined,
    scores: {
      importance: task.importance,
      urgency: task.urgency,
    },
    startDate: task.start_date || undefined,
    deadline: task.deadline || undefined,
    completed: task.completed,
    updatedAt: task.updated_at,
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data: ApiResponse<T> = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`)
  }

  return data.data as T
}

export const apiService = {
  async getTasks(): Promise<Task[]> {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      ...fetchDefaults,
    })
    const tasks = await handleResponse<SupabaseTask[]>(response)
    return tasks.map(transformSupabaseTask)
  },

  async createTask(task: Omit<Task, 'id' | 'completed'>): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      ...fetchDefaults,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        scores: task.scores,
        startDate: task.startDate,
        deadline: task.deadline,
        completed: false,
      }),
    })

    const supabaseTask = await handleResponse<SupabaseTask>(response)
    return transformSupabaseTask(supabaseTask)
  },

  async updateTask(id: string, updates: Partial<Omit<Task, 'id'>>): Promise<Task> {
    const body: Record<string, unknown> = {}

    if (updates.title !== undefined) body.title = updates.title
    if (updates.description !== undefined) body.description = updates.description
    if (updates.scores) {
      body.scores = updates.scores
    }
    if (updates.startDate !== undefined) body.startDate = updates.startDate || null
    if (updates.deadline !== undefined) body.deadline = updates.deadline || null
    if (updates.completed !== undefined) body.completed = updates.completed

    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      ...fetchDefaults,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const supabaseTask = await handleResponse<SupabaseTask>(response)
    return transformSupabaseTask(supabaseTask)
  },

  async deleteTask(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      ...fetchDefaults,
    })

    await handleResponse<void>(response)
  },

  async toggleTaskComplete(id: string): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}/toggle`, {
      method: 'PATCH',
      ...fetchDefaults,
    })

    const supabaseTask = await handleResponse<SupabaseTask>(response)
    return transformSupabaseTask(supabaseTask)
  },

  async fetchUrlTitle(url: string): Promise<{ title: string; openGraph?: Record<string, string>; meta?: Record<string, string> }> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/fetch-url-title?url=${encodeURIComponent(url)}`,
        { ...fetchDefaults }
      )
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'URL 제목을 가져오는데 실패했습니다.')
      }

      return {
        title: data.title || url,
        openGraph: data.openGraph,
        meta: data.meta,
      }
    } catch (error) {
      console.error('URL 제목 가져오기 오류:', error)
      return { title: url }
    }
  },
}
