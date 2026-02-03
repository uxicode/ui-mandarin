import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskWithComputed } from '@/types/task'
import { computeTask } from '@/utils/score-calculator'
import { apiService } from '@/services/api'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const tasksWithComputed = computed<TaskWithComputed[]>(() => {
    return tasks.value.map(computeTask)
  })

  // 미완료 업무만
  const incompleteTasks = computed<Task[]>(() => {
    return tasks.value.filter(task => !task.completed)
  })

  // 완료된 업무만
  const completedTasks = computed<Task[]>(() => {
    return tasks.value.filter(task => task.completed)
  })

  async function fetchTasks() {
    isLoading.value = true
    error.value = null
    try {
      const fetchedTasks = await apiService.getTasks()
      tasks.value = fetchedTasks
    } catch (err) {
      error.value = err instanceof Error ? err.message : '업무 목록을 불러오는데 실패했습니다.'
      console.error('업무 목록 불러오기 오류:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function addTask(task: Omit<Task, 'id' | 'completed'>) {
    isLoading.value = true
    error.value = null
    try {
      const newTask = await apiService.createTask(task)
      tasks.value.push(newTask)
      return newTask
    } catch (err) {
      error.value = err instanceof Error ? err.message : '업무 추가에 실패했습니다.'
      console.error('업무 추가 오류:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function updateTask(id: string, updates: Partial<Omit<Task, 'id'>>) {
    isLoading.value = true
    error.value = null
    try {
      const updatedTask = await apiService.updateTask(id, updates)
      const index = tasks.value.findIndex((task) => task.id === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
      return updatedTask
    } catch (err) {
      error.value = err instanceof Error ? err.message : '업무 수정에 실패했습니다.'
      console.error('업무 수정 오류:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function toggleTaskComplete(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const updatedTask = await apiService.toggleTaskComplete(id)
      const index = tasks.value.findIndex((task) => task.id === id)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }
      return updatedTask
    } catch (err) {
      error.value = err instanceof Error ? err.message : '업무 완료 상태 변경에 실패했습니다.'
      console.error('업무 완료 토글 오류:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function deleteTask(id: string) {
    isLoading.value = true
    error.value = null
    try {
      await apiService.deleteTask(id)
      const index = tasks.value.findIndex((task) => task.id === id)
      if (index !== -1) {
        tasks.value.splice(index, 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '업무 삭제에 실패했습니다.'
      console.error('업무 삭제 오류:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function getTaskById(id: string): Task | undefined {
    return tasks.value.find((task) => task.id === id)
  }

  return {
    tasks,
    tasksWithComputed,
    incompleteTasks,
    completedTasks,
    isLoading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    getTaskById,
  }
})
