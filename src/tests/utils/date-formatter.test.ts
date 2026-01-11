import { describe, it, expect } from 'vitest'
import {
  format,
  formatDeadline,
  formatStartDate,
  isOverdue,
  hasStarted,
  getTimeRemaining,
  getStartStatus,
  getTaskDuration,
} from '@/utils/date-formatter'

describe('date-formatter', () => {
  describe('format', () => {
    it('should format date with YYYY.MM.DD HH:mm pattern', () => {
      const date = new Date('2026-01-11T11:20:30')
      const result = format(date, 'YYYY.MM.DD HH:mm')
      expect(result).toBe('2026.01.11 11:20')
    })

    it('should format date with YYYY/MM/DD HH:mm pattern', () => {
      const date = new Date('2026-01-11T11:20:30')
      const result = format(date, 'YYYY/MM/DD HH:mm')
      expect(result).toBe('2026/01/11 11:20')
    })

    it('should format date with custom pattern including seconds', () => {
      const date = new Date('2026-01-11T11:20:30')
      const result = format(date, 'YYYY-MM-DD HH:mm:ss')
      expect(result).toBe('2026-01-11 11:20:30')
    })

    it('should handle ISO string input', () => {
      const isoString = '2026-01-11T11:20:30.000Z'
      const result = format(isoString, 'YYYY.MM.DD HH:mm')
      expect(result).toContain('2026.01.11')
    })

    it('should return empty string for undefined input', () => {
      const result = format(undefined, 'YYYY.MM.DD HH:mm')
      expect(result).toBe('')
    })

    it('should return empty string for invalid date', () => {
      const result = format('invalid-date', 'YYYY.MM.DD HH:mm')
      expect(result).toBe('')
    })

    it('should pad single digit months and days with zero', () => {
      const date = new Date('2026-01-05T09:05:05')
      const result = format(date, 'YYYY.MM.DD HH:mm:ss')
      expect(result).toBe('2026.01.05 09:05:05')
    })
  })

  describe('formatDeadline', () => {
    it('should format deadline with default pattern', () => {
      const deadline = '2026-01-11T11:20:00'
      const result = formatDeadline(deadline)
      expect(result).toBe('2026.01.11 11:20')
    })

    it('should return empty string for undefined', () => {
      const result = formatDeadline(undefined)
      expect(result).toBe('')
    })
  })

  describe('formatStartDate', () => {
    it('should format start date with default pattern', () => {
      const startDate = '2026-01-11T09:00:00'
      const result = formatStartDate(startDate)
      expect(result).toBe('2026.01.11 09:00')
    })

    it('should return empty string for undefined', () => {
      const result = formatStartDate(undefined)
      expect(result).toBe('')
    })
  })

  describe('isOverdue', () => {
    it('should return true for past deadline', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const result = isOverdue(pastDate)
      expect(result).toBe(true)
    })

    it('should return false for future deadline', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const result = isOverdue(futureDate)
      expect(result).toBe(false)
    })

    it('should return false for undefined', () => {
      const result = isOverdue(undefined)
      expect(result).toBe(false)
    })

    it('should return false for invalid date', () => {
      const result = isOverdue('invalid-date')
      expect(result).toBe(false)
    })
  })

  describe('hasStarted', () => {
    it('should return true for past start date', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const result = hasStarted(pastDate)
      expect(result).toBe(true)
    })

    it('should return false for future start date', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const result = hasStarted(futureDate)
      expect(result).toBe(false)
    })

    it('should return true for undefined (no start date means started)', () => {
      const result = hasStarted(undefined)
      expect(result).toBe(true)
    })

    it('should return true for current time', () => {
      const now = new Date().toISOString()
      const result = hasStarted(now)
      expect(result).toBe(true)
    })
  })

  describe('getTimeRemaining', () => {
    it('should return "지남" for past deadline', () => {
      const pastDate = new Date(Date.now() - 60 * 1000).toISOString()
      const result = getTimeRemaining(pastDate)
      expect(result).toBe('지남')
    })

    it('should return days for deadline more than 24 hours away', () => {
      const futureDate = new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString()
      const result = getTimeRemaining(futureDate)
      expect(result).toBe('2일 후')
    })

    it('should return hours for deadline within 24 hours', () => {
      const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
      const result = getTimeRemaining(futureDate)
      expect(result).toContain('시간 후')
    })

    it('should return minutes for deadline within 1 hour', () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000).toISOString()
      const result = getTimeRemaining(futureDate)
      expect(result).toContain('분 후')
    })

    it('should return empty string for undefined', () => {
      const result = getTimeRemaining(undefined)
      expect(result).toBe('')
    })
  })

  describe('getStartStatus', () => {
    it('should return "진행 중" for recently started task', () => {
      const recentPast = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      const result = getStartStatus(recentPast)
      expect(result).toBe('진행 중')
    })

    it('should return "X일 전 시작" for task started days ago', () => {
      const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const result = getStartStatus(daysAgo)
      expect(result).toBe('3일 전 시작')
    })

    it('should return "X일 후 시작" for future start date (days)', () => {
      const futureDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      const result = getStartStatus(futureDays)
      expect(result).toBe('5일 후 시작')
    })

    it('should return "X시간 후 시작" for future start date (hours)', () => {
      const futureHours = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
      const result = getStartStatus(futureHours)
      expect(result).toContain('시간 후 시작')
    })

    it('should return empty string for undefined', () => {
      const result = getStartStatus(undefined)
      expect(result).toBe('')
    })
  })

  describe('getTaskDuration', () => {
    it('should return weeks for duration of 7+ days', () => {
      const start = '2026-01-01T00:00:00'
      const end = '2026-01-15T00:00:00'
      const result = getTaskDuration(start, end)
      expect(result).toBe('2주간')
    })

    it('should return days for duration of 1-6 days', () => {
      const start = '2026-01-01T00:00:00'
      const end = '2026-01-04T00:00:00'
      const result = getTaskDuration(start, end)
      expect(result).toBe('3일간')
    })

    it('should return hours for duration less than a day', () => {
      const start = '2026-01-01T00:00:00'
      const end = '2026-01-01T05:00:00'
      const result = getTaskDuration(start, end)
      expect(result).toBe('5시간')
    })

    it('should return empty string if start date is missing', () => {
      const result = getTaskDuration(undefined, '2026-01-15T00:00:00')
      expect(result).toBe('')
    })

    it('should return empty string if end date is missing', () => {
      const result = getTaskDuration('2026-01-01T00:00:00', undefined)
      expect(result).toBe('')
    })

    it('should return empty string if end date is before start date', () => {
      const start = '2026-01-15T00:00:00'
      const end = '2026-01-01T00:00:00'
      const result = getTaskDuration(start, end)
      expect(result).toBe('')
    })
  })
})
