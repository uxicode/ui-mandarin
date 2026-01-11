import { describe, it, expect } from 'vitest'
import { calculateScores, getQuadrant, computeTask } from '@/utils/score-calculator'
import type { Task, TaskScores } from '@/types/task'

describe('score-calculator', () => {
  describe('calculateScores', () => {
    it('should calculate importance and urgency scores correctly', () => {
      const scores: TaskScores = {
        importance: 5,
        urgency: 4,
      }
      const result = calculateScores(scores)
      expect(result.importanceScore).toBe(2) // 5 - 3 = 2
      expect(result.urgencyScore).toBe(1) // 4 - 3 = 1
    })

    it('should handle minimum scores (1)', () => {
      const scores: TaskScores = {
        importance: 1,
        urgency: 1,
      }
      const result = calculateScores(scores)
      expect(result.importanceScore).toBe(-2) // 1 - 3 = -2
      expect(result.urgencyScore).toBe(-2) // 1 - 3 = -2
    })

    it('should handle neutral scores (3)', () => {
      const scores: TaskScores = {
        importance: 3,
        urgency: 3,
      }
      const result = calculateScores(scores)
      expect(result.importanceScore).toBe(0) // 3 - 3 = 0
      expect(result.urgencyScore).toBe(0) // 3 - 3 = 0
    })

    it('should handle maximum scores (5)', () => {
      const scores: TaskScores = {
        importance: 5,
        urgency: 5,
      }
      const result = calculateScores(scores)
      expect(result.importanceScore).toBe(2) // 5 - 3 = 2
      expect(result.urgencyScore).toBe(2) // 5 - 3 = 2
    })
  })

  describe('getQuadrant', () => {
    it('should return A for high importance and high urgency', () => {
      const scores = { importanceScore: 2, urgencyScore: 2 }
      const result = getQuadrant(scores)
      expect(result).toBe('A')
    })

    it('should return B for high importance and low urgency', () => {
      const scores = { importanceScore: 2, urgencyScore: -2 }
      const result = getQuadrant(scores)
      expect(result).toBe('B')
    })

    it('should return C for low importance and high urgency', () => {
      const scores = { importanceScore: -2, urgencyScore: 2 }
      const result = getQuadrant(scores)
      expect(result).toBe('C')
    })

    it('should return D for low importance and low urgency', () => {
      const scores = { importanceScore: -2, urgencyScore: -2 }
      const result = getQuadrant(scores)
      expect(result).toBe('D')
    })

    it('should handle boundary case - importance positive, urgency zero', () => {
      const scores = { importanceScore: 1, urgencyScore: 0 }
      const result = getQuadrant(scores)
      expect(result).toBe('A') // importance >= 0, urgency >= 0
    })

    it('should handle boundary case - importance zero, urgency positive', () => {
      const scores = { importanceScore: 0, urgencyScore: 1 }
      const result = getQuadrant(scores)
      expect(result).toBe('A') // importance >= 0, urgency >= 0
    })

    it('should handle boundary case - both zero', () => {
      const scores = { importanceScore: 0, urgencyScore: 0 }
      const result = getQuadrant(scores)
      expect(result).toBe('A') // both >= 0 means quadrant A
    })
  })

  describe('computeTask', () => {
    it('should compute task with all properties', () => {
      const task: Task = {
        id: '1',
        title: 'Test Task',
        description: 'Test Description',
        scores: {
          importance: 5,
          urgency: 4,
        },
        completed: false,
        startDate: '2026-01-01T00:00:00',
        deadline: '2026-01-15T00:00:00',
      }

      const result = computeTask(task)

      expect(result.id).toBe('1')
      expect(result.title).toBe('Test Task')
      expect(result.computedScores.importanceScore).toBe(2)
      expect(result.computedScores.urgencyScore).toBe(1)
      expect(result.quadrant).toBe('A')
    })

    it('should compute task for quadrant B', () => {
      const task: Task = {
        id: '2',
        title: 'Important but not urgent',
        scores: {
          importance: 5,
          urgency: 1,
        },
        completed: false,
      }

      const result = computeTask(task)
      expect(result.quadrant).toBe('B')
      expect(result.computedScores.importanceScore).toBe(2)
      expect(result.computedScores.urgencyScore).toBe(-2)
    })

    it('should compute task for quadrant C', () => {
      const task: Task = {
        id: '3',
        title: 'Urgent but not important',
        scores: {
          importance: 1,
          urgency: 5,
        },
        completed: false,
      }

      const result = computeTask(task)
      expect(result.quadrant).toBe('C')
      expect(result.computedScores.importanceScore).toBe(-2)
      expect(result.computedScores.urgencyScore).toBe(2)
    })

    it('should compute task for quadrant D', () => {
      const task: Task = {
        id: '4',
        title: 'Neither important nor urgent',
        scores: {
          importance: 2,
          urgency: 2,
        },
        completed: false,
      }

      const result = computeTask(task)
      expect(result.quadrant).toBe('D')
      expect(result.computedScores.importanceScore).toBe(-1)
      expect(result.computedScores.urgencyScore).toBe(-1)
    })
  })
})
