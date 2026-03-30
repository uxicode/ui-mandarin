import { describe, it, expect } from 'vitest'
import {
  isoToLocalDateKey,
  enumerateDaysInclusive,
  getTaskSpanDateKeys,
  taskHasDateOnCalendar,
  startOfWeekMonday,
  getWeekDaysMonSun,
  countTasksOnDate,
  dotCountForDay,
  getMonthGrid,
} from '@/utils/task-calendar'
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

describe('task-calendar', () => {
  describe('isoToLocalDateKey', () => {
    it('parses ISO to local YYYY-MM-DD', () => {
      const k = isoToLocalDateKey('2026-03-15T12:00:00.000Z')
      expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
    it('returns null for invalid', () => {
      expect(isoToLocalDateKey(undefined)).toBeNull()
      expect(isoToLocalDateKey('')).toBeNull()
    })
  })

  describe('enumerateDaysInclusive', () => {
    it('returns single day when same', () => {
      expect(enumerateDaysInclusive('2026-03-10', '2026-03-10')).toEqual(['2026-03-10'])
    })
    it('returns range inclusive', () => {
      expect(enumerateDaysInclusive('2026-03-10', '2026-03-12')).toEqual([
        '2026-03-10',
        '2026-03-11',
        '2026-03-12',
      ])
    })
    it('swaps when start after end', () => {
      expect(enumerateDaysInclusive('2026-03-12', '2026-03-10')).toEqual([
        '2026-03-10',
        '2026-03-11',
        '2026-03-12',
      ])
    })
  })

  describe('getTaskSpanDateKeys', () => {
    it('empty when no dates', () => {
      expect(getTaskSpanDateKeys(baseTask())).toEqual([])
    })
    it('start only', () => {
      const t = baseTask({ startDate: '2026-06-01T09:00:00' })
      expect(getTaskSpanDateKeys(t).length).toBe(1)
    })
    it('deadline only', () => {
      const t = baseTask({ deadline: '2026-06-05T18:00:00' })
      expect(getTaskSpanDateKeys(t).length).toBe(1)
    })
    it('both: inclusive span', () => {
      const t = baseTask({
        startDate: '2026-06-01T09:00:00',
        deadline: '2026-06-03T18:00:00',
      })
      const keys = getTaskSpanDateKeys(t)
      expect(keys.length).toBe(3)
      expect(keys[0] <= keys[keys.length - 1]).toBe(true)
    })
  })

  describe('taskHasDateOnCalendar', () => {
    it('true when date in span', () => {
      const t = baseTask({
        startDate: '2026-06-01T09:00:00',
        deadline: '2026-06-03T18:00:00',
      })
      const keys = getTaskSpanDateKeys(t)
      expect(taskHasDateOnCalendar(t, keys[1])).toBe(true)
    })
    it('false when not in span', () => {
      const t = baseTask({
        startDate: '2026-06-01T09:00:00',
        deadline: '2026-06-02T18:00:00',
      })
      expect(taskHasDateOnCalendar(t, '2099-01-01')).toBe(false)
    })
  })

  describe('startOfWeekMonday', () => {
    it('Monday 2026-03-30 when anchor is Monday same week', () => {
      const mon = new Date(2026, 2, 30)
      const s = startOfWeekMonday(mon)
      expect(s.getDay()).toBe(1)
    })
    it('Monday when anchor is Sunday', () => {
      const sun = new Date(2026, 2, 29)
      expect(sun.getDay()).toBe(0)
      const s = startOfWeekMonday(sun)
      expect(s.getDay()).toBe(1)
      expect(s.getDate()).toBe(23)
    })
  })

  describe('getWeekDaysMonSun', () => {
    it('returns 7 days', () => {
      const cells = getWeekDaysMonSun(new Date(2026, 2, 25))
      expect(cells).toHaveLength(7)
      expect(cells[0].weekdayLabel).toBe('월')
      expect(cells[6].weekdayLabel).toBe('일')
    })
  })

  describe('getMonthGrid', () => {
    it('returns 42 cells', () => {
      const g = getMonthGrid(2026, 2)
      expect(g).toHaveLength(42)
    })
    it('marks inMonth for March days', () => {
      const g = getMonthGrid(2026, 2)
      const inMonthCount = g.filter((c) => c.inMonth).length
      expect(inMonthCount).toBe(31)
    })
  })

  describe('countTasksOnDate / dotCountForDay', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'a',
        startDate: '2026-06-10T00:00:00',
        deadline: '2026-06-10T23:59:59',
      }),
      baseTask({
        id: 'b',
        startDate: '2026-06-10T00:00:00',
        deadline: '2026-06-11T00:00:00',
      }),
    ]

    it('counts tasks covering date', () => {
      const k = isoToLocalDateKey('2026-06-10T12:00:00')!
      expect(countTasksOnDate(tasks, k)).toBe(2)
    })

    it('dot cap', () => {
      expect(dotCountForDay(0)).toBe(0)
      expect(dotCountForDay(1)).toBe(1)
      expect(dotCountForDay(2)).toBe(2)
      expect(dotCountForDay(99)).toBe(2)
    })
  })
})
