import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTaskStore } from '@/stores/task-store'
import type { Task } from '@/types/task'

describe('task-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('should have empty tasks array initially', () => {
      const store = useTaskStore()
      expect(store.tasks).toEqual([])
    })

    it('should have empty computed tasks', () => {
      const store = useTaskStore()
      expect(store.tasksWithComputed).toEqual([])
    })

    it('should have empty incomplete tasks', () => {
      const store = useTaskStore()
      expect(store.incompleteTasks).toEqual([])
    })

    it('should have empty completed tasks', () => {
      const store = useTaskStore()
      expect(store.completedTasks).toEqual([])
    })
  })

  describe('addTask', () => {
    it('should add a new task', () => {
      const store = useTaskStore()
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        scores: {
          importance: 5,
          urgency: 4,
        },
        completed: false,
      }

      store.addTask(taskData)

      expect(store.tasks.length).toBe(1)
      expect(store.tasks[0].title).toBe('Test Task')
      expect(store.tasks[0].description).toBe('Test Description')
      expect(store.tasks[0].scores.importance).toBe(5)
      expect(store.tasks[0].scores.urgency).toBe(4)
      expect(store.tasks[0].completed).toBe(false)
      expect(store.tasks[0].id).toBeDefined()
    })

    it('should generate unique IDs for multiple tasks', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Task 1',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      store.addTask({
        title: 'Task 2',
        scores: { importance: 4, urgency: 4 },
        completed: false,
      })

      expect(store.tasks.length).toBe(2)
      expect(store.tasks[0].id).not.toBe(store.tasks[1].id)
    })

    it('should add task with optional fields', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Task with dates',
        scores: { importance: 5, urgency: 5 },
        completed: false,
        startDate: '2026-01-01T00:00:00',
        deadline: '2026-01-15T00:00:00',
      })

      expect(store.tasks[0].startDate).toBe('2026-01-01T00:00:00')
      expect(store.tasks[0].deadline).toBe('2026-01-15T00:00:00')
    })
  })

  describe('updateTask', () => {
    it('should update existing task', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Original Title',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      const taskId = store.tasks[0].id

      store.updateTask(taskId, {
        title: 'Updated Title',
        scores: { importance: 5, urgency: 4 },
      })

      expect(store.tasks[0].title).toBe('Updated Title')
      expect(store.tasks[0].scores.importance).toBe(5)
      expect(store.tasks[0].scores.urgency).toBe(4)
    })

    it('should not affect other tasks when updating', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Task 1',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      store.addTask({
        title: 'Task 2',
        scores: { importance: 4, urgency: 4 },
        completed: false,
      })

      const taskId = store.tasks[0].id
      store.updateTask(taskId, { title: 'Updated Task 1' })

      expect(store.tasks[0].title).toBe('Updated Task 1')
      expect(store.tasks[1].title).toBe('Task 2')
    })

    it('should do nothing for non-existent task ID', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Test Task',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      const originalLength = store.tasks.length
      store.updateTask('non-existent-id', { title: 'Updated' })

      expect(store.tasks.length).toBe(originalLength)
      expect(store.tasks[0].title).toBe('Test Task')
    })
  })

  describe('toggleTaskComplete', () => {
    it('should toggle task completion status', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Test Task',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      const taskId = store.tasks[0].id
      expect(store.tasks[0].completed).toBe(false)

      store.toggleTaskComplete(taskId)
      expect(store.tasks[0].completed).toBe(true)

      store.toggleTaskComplete(taskId)
      expect(store.tasks[0].completed).toBe(false)
    })

    it('should do nothing for non-existent task ID', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Test Task',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      store.toggleTaskComplete('non-existent-id')
      expect(store.tasks[0].completed).toBe(false)
    })
  })

  describe('deleteTask', () => {
    it('should delete task by ID', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Task to delete',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      const taskId = store.tasks[0].id
      expect(store.tasks.length).toBe(1)

      store.deleteTask(taskId)
      expect(store.tasks.length).toBe(0)
    })

    it('should only delete the specified task', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Task 1',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      store.addTask({
        title: 'Task 2',
        scores: { importance: 4, urgency: 4 },
        completed: false,
      })

      const taskId = store.tasks[0].id
      store.deleteTask(taskId)

      expect(store.tasks.length).toBe(1)
      expect(store.tasks[0].title).toBe('Task 2')
    })

    it('should do nothing for non-existent task ID', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Test Task',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      const originalLength = store.tasks.length
      store.deleteTask('non-existent-id')

      expect(store.tasks.length).toBe(originalLength)
    })
  })

  describe('getTaskById', () => {
    it('should return task by ID', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Test Task',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      const taskId = store.tasks[0].id
      const task = store.getTaskById(taskId)

      expect(task).toBeDefined()
      expect(task?.title).toBe('Test Task')
    })

    it('should return undefined for non-existent ID', () => {
      const store = useTaskStore()
      const task = store.getTaskById('non-existent-id')
      expect(task).toBeUndefined()
    })
  })

  describe('computed properties', () => {
    it('should filter incomplete tasks', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Incomplete Task',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      const taskId = store.tasks[0].id
      store.updateTask(taskId, { completed: true })

      store.addTask({
        title: 'Complete Task',
        scores: { importance: 4, urgency: 4 },
        completed: false,
      })

      expect(store.incompleteTasks.length).toBe(1)
      expect(store.incompleteTasks[0].title).toBe('Complete Task')
    })

    it('should filter completed tasks', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'Incomplete Task',
        scores: { importance: 3, urgency: 3 },
        completed: false,
      })

      store.addTask({
        title: 'Will be completed Task',
        scores: { importance: 4, urgency: 4 },
        completed: false,
      })

      const taskId = store.tasks[1].id
      store.updateTask(taskId, { completed: true })

      expect(store.completedTasks.length).toBe(1)
      expect(store.completedTasks[0].title).toBe('Will be completed Task')
    })

    it('should compute tasks with scores and quadrants', () => {
      const store = useTaskStore()
      
      store.addTask({
        title: 'High Priority Task',
        scores: { importance: 5, urgency: 5 },
        completed: false,
      })

      const computed = store.tasksWithComputed
      expect(computed.length).toBe(1)
      expect(computed[0].computedScores.importanceScore).toBe(2)
      expect(computed[0].computedScores.urgencyScore).toBe(2)
      expect(computed[0].quadrant).toBe('A')
    })
  })
})
