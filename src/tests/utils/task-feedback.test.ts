import { describe, it, expect } from 'vitest'
import {
  computeDailyFeedback,
  computeWeeklyFeedback,
  shouldShowDailyPraise,
  shouldShowWeeklyPraise,
  pickDailyPraiseMessage,
  pickWeeklyPraiseMessage,
  pickDailyAllClearMessage,
  pickWeeklyAllClearMessage,
  getTasksWithDeadlineOnDate,
  countCompletedOnSelectedDay,
  countCompletedOverlappingWeek,
} from '@/utils/task-feedback'
import { isoToLocalDateKey } from '@/utils/task-calendar'
import type { Task } from '@/types/task'

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '1',
    title: 't',
    scores: { importance: 3, urgency: 3 },
    completed: false,
    ...overrides,
  }
}

describe('task-feedback', () => {
  describe('computeDailyFeedback', () => {
    it('lists incomplete tasks visible on selected day (deadline on that day)', () => {
      const iso = '2026-06-15T12:00:00.000Z'
      const dk = isoToLocalDateKey(iso)!
      const tasks = [baseTask({ id: 'a', deadline: iso })]
      const r = computeDailyFeedback(tasks, dk)
      expect(r.incompleteOnDay).toHaveLength(1)
      expect(r.incompleteOnDay[0].id).toBe('a')
    })

    it('does not count incomplete when that day is outside task calendar span', () => {
      const tasks = [baseTask({ id: 'old', deadline: '2020-01-01T12:00:00.000Z' })]
      const r = computeDailyFeedback(tasks, '2099-06-15')
      expect(r.incompleteOnDay).toHaveLength(0)
    })

    it('includes overdue on span when task appears on selected day', () => {
      const tasks = [
        baseTask({
          id: 'old',
          startDate: '2020-06-01T12:00:00.000Z',
          deadline: '2020-06-05T12:00:00.000Z',
        }),
      ]
      const r = computeDailyFeedback(tasks, '2020-06-03')
      expect(r.incompleteOnDay).toHaveLength(1)
      expect(r.incompleteOnDay[0].id).toBe('old')
    })

    it('lists span task when deadline is not that day', () => {
      const dk = '2026-06-12'
      const tasks = [
        baseTask({
          id: 'span',
          startDate: '2026-06-10T12:00:00.000Z',
          deadline: '2026-06-20T12:00:00.000Z',
          completed: false,
        }),
      ]
      const r = computeDailyFeedback(tasks, dk)
      expect(r.incompleteOnDay).toHaveLength(1)
      expect(r.incompleteOnDay[0].id).toBe('span')
    })
  })

  describe('shouldShowDailyPraise', () => {
    it('is true when all tasks with deadline on that day are completed', () => {
      const iso = '2026-06-15T12:00:00.000Z'
      const dk = isoToLocalDateKey(iso)!
      const tasks = [
        baseTask({ id: 'a', deadline: iso, completed: true }),
        baseTask({ id: 'b', deadline: iso, completed: true }),
      ]
      expect(shouldShowDailyPraise(tasks, dk)).toBe(true)
    })

    it('is false when no task has deadline on that day', () => {
      const tasks = [baseTask({ id: 'a', deadline: '2026-07-01T12:00:00.000Z' })]
      const dk = isoToLocalDateKey('2026-06-15T12:00:00.000Z')!
      expect(shouldShowDailyPraise(tasks, dk)).toBe(false)
    })

    it('is false when any deadline on that day is incomplete', () => {
      const iso = '2026-06-15T12:00:00.000Z'
      const dk = isoToLocalDateKey(iso)!
      const tasks = [
        baseTask({ id: 'a', deadline: iso, completed: true }),
        baseTask({ id: 'b', deadline: iso, completed: false }),
      ]
      expect(shouldShowDailyPraise(tasks, dk)).toBe(false)
    })
  })

  describe('computeWeeklyFeedback', () => {
    const weekStart = '2026-06-08'
    const weekEnd = '2026-06-14'

    it('merges incomplete into incompleteInWeek (deadline in week)', () => {
      const tasks = [baseTask({ id: 'w', deadline: '2026-06-10T12:00:00.000Z' })]
      const r = computeWeeklyFeedback(tasks, weekStart, weekEnd)
      expect(r.incompleteInWeek).toHaveLength(1)
      expect(r.incompleteInWeek[0].id).toBe('w')
    })

    it('does not count incomplete when calendar span does not overlap week (과거 마감만 있고 주에 안 걸침)', () => {
      const tasks = [baseTask({ id: 'c', deadline: '1999-01-01T00:00:00.000Z' })]
      const r = computeWeeklyFeedback(tasks, weekStart, weekEnd)
      expect(r.incompleteInWeek).toHaveLength(0)
    })

    it('includes span overlap without double count', () => {
      const tasks = [
        baseTask({
          id: 'span',
          startDate: '2026-06-10T12:00:00.000Z',
          deadline: '2026-06-20T12:00:00.000Z',
          completed: false,
        }),
      ]
      const r = computeWeeklyFeedback(tasks, weekStart, weekEnd)
      expect(r.incompleteInWeek).toHaveLength(1)
      expect(r.incompleteInWeek[0].id).toBe('span')
    })
  })

  describe('shouldShowWeeklyPraise', () => {
    const weekStart = '2026-06-08'
    const weekEnd = '2026-06-14'

    it('is true when all week deadlines complete and no carry-over', () => {
      const tasks = [
        baseTask({
          id: 'a',
          deadline: '2026-06-10T12:00:00.000Z',
          completed: true,
        }),
      ]
      expect(shouldShowWeeklyPraise(tasks, weekStart, weekEnd)).toBe(true)
    })

    it('is false when no deadline falls in week', () => {
      const tasks = [baseTask({ id: 'a', deadline: '2026-08-01T12:00:00.000Z' })]
      expect(shouldShowWeeklyPraise(tasks, weekStart, weekEnd)).toBe(false)
    })

    it('is false when incomplete in week', () => {
      const tasks = [baseTask({ id: 'a', deadline: '2026-06-10T12:00:00.000Z' })]
      expect(shouldShowWeeklyPraise(tasks, weekStart, weekEnd)).toBe(false)
    })

    it('is true when ghost incomplete does not overlap week (주간 도넛에 잡히지 않음)', () => {
      const tasks = [
        baseTask({
          id: 'done',
          deadline: '2026-06-10T12:00:00.000Z',
          completed: true,
        }),
        baseTask({ id: 'old', deadline: '1999-01-01T00:00:00.000Z' }),
      ]
      expect(shouldShowWeeklyPraise(tasks, weekStart, weekEnd)).toBe(true)
    })

    it('is false when incomplete overlaps week', () => {
      const tasks = [
        baseTask({
          id: 'done',
          deadline: '2026-06-10T12:00:00.000Z',
          completed: true,
        }),
        baseTask({
          id: 'span',
          startDate: '2026-06-01T12:00:00.000Z',
          deadline: '2026-06-20T12:00:00.000Z',
          completed: false,
        }),
      ]
      expect(shouldShowWeeklyPraise(tasks, weekStart, weekEnd)).toBe(false)
    })
  })

  describe('praise message pool', () => {
    it('pickDailyPraiseMessage returns stable string for same key', () => {
      expect(pickDailyPraiseMessage('2026-06-15')).toBe(pickDailyPraiseMessage('2026-06-15'))
    })

    it('pickWeeklyPraiseMessage returns stable string for same range', () => {
      expect(pickWeeklyPraiseMessage('2026-06-08', '2026-06-14')).toBe(
        pickWeeklyPraiseMessage('2026-06-08', '2026-06-14')
      )
    })

    it('pickDailyAllClearMessage returns stable string for same key', () => {
      expect(pickDailyAllClearMessage('2026-06-15')).toBe(pickDailyAllClearMessage('2026-06-15'))
    })

    it('pickWeeklyAllClearMessage returns stable string for same range', () => {
      expect(pickWeeklyAllClearMessage('2026-06-08', '2026-06-14')).toBe(
        pickWeeklyAllClearMessage('2026-06-08', '2026-06-14')
      )
    })
  })

  describe('getTasksWithDeadlineOnDate', () => {
    it('includes completed and incomplete', () => {
      const iso = '2026-06-15T12:00:00.000Z'
      const dk = isoToLocalDateKey(iso)!
      const tasks = [
        baseTask({ id: 'a', deadline: iso, completed: false }),
        baseTask({ id: 'b', deadline: iso, completed: true }),
      ]
      expect(getTasksWithDeadlineOnDate(tasks, dk)).toHaveLength(2)
    })
  })

  describe('countCompletedOnSelectedDay', () => {
    it('counts only completed tasks that match selected day', () => {
      const iso = '2026-06-15T12:00:00.000Z'
      const dk = isoToLocalDateKey(iso)!
      const tasks = [
        baseTask({ id: 'a', deadline: iso, completed: true }),
        baseTask({ id: 'b', deadline: iso, completed: false }),
        baseTask({ id: 'c', deadline: '2026-06-16T12:00:00.000Z', completed: true }),
      ]
      expect(countCompletedOnSelectedDay(tasks, dk)).toBe(1)
    })
  })

  describe('countCompletedOverlappingWeek', () => {
    const weekStart = '2026-06-08'
    const weekEnd = '2026-06-14'

    it('counts completed tasks overlapping the week span', () => {
      const tasks = [
        baseTask({
          id: 'span',
          startDate: '2026-06-10T12:00:00.000Z',
          deadline: '2026-06-20T12:00:00.000Z',
          completed: true,
        }),
        baseTask({ id: 'out', deadline: '2026-07-01T12:00:00.000Z', completed: true }),
      ]
      expect(countCompletedOverlappingWeek(tasks, weekStart, weekEnd)).toBe(1)
    })
  })
})
