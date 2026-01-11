import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Task, TaskWithComputed } from '@/types/task'
import { computeTask } from '@/utils/score-calculator'

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])

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

  function addTask(task: Omit<Task, 'id'>) {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      completed: false,
    }
    tasks.value.push(newTask)
  }

  function updateTask(id: string, updates: Partial<Omit<Task, 'id'>>) {
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...updates }
    }
  }

  function toggleTaskComplete(id: string) {
    const task = tasks.value.find((task) => task.id === id)
    if (task) {
      task.completed = !task.completed
    }
  }

  function deleteTask(id: string) {
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index !== -1) {
      tasks.value.splice(index, 1)
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
    addTask,
    updateTask,
    toggleTaskComplete,
    deleteTask,
    getTaskById,
  }
})

