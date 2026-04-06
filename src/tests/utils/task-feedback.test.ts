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
  /**
   * computeDailyFeedback 분류 기준:
   * - inProgressOnDay: 선택일에 보이고, 미완료이고, deadline >= today
   * - overdueOnDay:    선택일에 보이고, 미완료이고, deadline < today
   * - completedOnDay:  선택일에 보이고, 완료
   *
   * "overdue" 기준이 today 인 이유:
   *   taskMatchesSelectedDay 는 스팬(startDate~deadline) 안의 날만 매칭하므로
   *   selectedDay <= deadline 이 항상 성립한다.
   *   따라서 deadline < selectedDay 는 구조적으로 불가능하고,
   *   대신 deadline < today 로 판단해야 실제 초과 업무가 분류된다.
   *
   * todayKey 파라미터를 명시하면 결정적인 단위 테스트가 가능하다.
   */
  describe('computeDailyFeedback', () => {
    it('deadline = 선택일 = today → inProgressOnDay', () => {
      const dk = '2026-06-15'
      const tasks = [baseTask({ id: 'a', deadline: '2026-06-15T12:00:00.000Z' })]
      // todayKey 를 같은 날로 고정: deadline(2026-06-15) >= today(2026-06-15) → 진행중
      const r = computeDailyFeedback(tasks, dk, '2026-06-15')
      expect(r.inProgressOnDay).toHaveLength(1)
      expect(r.inProgressOnDay[0].id).toBe('a')
      expect(r.overdueOnDay).toHaveLength(0)
      expect(r.completedOnDay).toHaveLength(0)
    })

    it('deadline < today → overdueOnDay (단일 마감일 태스크, 선택일=마감일)', () => {
      // deadline=2026-03-15, 선택일=2026-03-15(마감일), today=2026-04-03
      const tasks = [baseTask({ id: 'ov', deadline: '2026-03-15T12:00:00.000Z' })]
      const r = computeDailyFeedback(tasks, '2026-03-15', '2026-04-03')
      expect(r.overdueOnDay).toHaveLength(1)
      expect(r.overdueOnDay[0].id).toBe('ov')
      expect(r.inProgressOnDay).toHaveLength(0)
    })

    it('스팬 업무 — 선택일이 스팬 안에 있고 deadline < today → overdueOnDay', () => {
      // startDate=2026-03-01, deadline=2026-03-15, 선택일=2026-03-10 (스팬 안), today=2026-04-03
      const tasks = [
        baseTask({
          id: 'span-ov',
          startDate: '2026-03-01T12:00:00.000Z',
          deadline: '2026-03-15T12:00:00.000Z',
          completed: false,
        }),
      ]
      const r = computeDailyFeedback(tasks, '2026-03-10', '2026-04-03')
      expect(r.overdueOnDay).toHaveLength(1)
      expect(r.overdueOnDay[0].id).toBe('span-ov')
    })

    it('deadline이 없는 미완료 → inProgressOnDay (startDate만 있는 케이스)', () => {
      // deadline 없으면 overdue 분류 불가 → 항상 진행중
      // startDate 만 있는 태스크: span = [startDate], 선택일 = startDate 로 매칭
      const dk = '2026-06-15'
      const tasks = [baseTask({ id: 'nodl', startDate: '2026-06-15T12:00:00.000Z' })]
      const r = computeDailyFeedback(tasks, dk, '2026-06-15')
      expect(r.inProgressOnDay).toHaveLength(1)
      expect(r.overdueOnDay).toHaveLength(0)
    })

    it('완료 업무 → completedOnDay', () => {
      const dk = '2026-06-15'
      const tasks = [baseTask({ id: 'done', deadline: '2026-06-15T12:00:00.000Z', completed: true })]
      const r = computeDailyFeedback(tasks, dk, '2026-06-15')
      expect(r.completedOnDay).toHaveLength(1)
      expect(r.completedOnDay[0].id).toBe('done')
      expect(r.inProgressOnDay).toHaveLength(0)
      expect(r.overdueOnDay).toHaveLength(0)
    })

    it('선택일이 업무 스팬 밖이면 모든 배열이 비어있음', () => {
      const tasks = [baseTask({ id: 'out', deadline: '2020-01-01T12:00:00.000Z' })]
      const r = computeDailyFeedback(tasks, '2099-06-15', '2026-04-03')
      expect(r.inProgressOnDay).toHaveLength(0)
      expect(r.overdueOnDay).toHaveLength(0)
      expect(r.completedOnDay).toHaveLength(0)
    })

    it('스팬 업무 — 선택일이 스팬 안에 있고 deadline >= today → inProgressOnDay', () => {
      const tasks = [
        baseTask({
          id: 'span-ip',
          startDate: '2026-06-10T12:00:00.000Z',
          deadline: '2026-06-20T12:00:00.000Z',
          completed: false,
        }),
      ]
      // today=2026-06-15, deadline(2026-06-20) >= today → 진행중
      const r = computeDailyFeedback(tasks, '2026-06-12', '2026-06-15')
      expect(r.inProgressOnDay).toHaveLength(1)
      expect(r.inProgressOnDay[0].id).toBe('span-ip')
    })

    it('스팬 밖 날짜(deadline 이후)는 어느 분류에도 포함되지 않음', () => {
      const tasks = [
        baseTask({
          id: 'past-span',
          startDate: '2020-06-01T12:00:00.000Z',
          deadline: '2020-06-05T12:00:00.000Z',
          completed: false,
        }),
      ]
      const r = computeDailyFeedback(tasks, '2020-06-10', '2026-04-03')
      expect(r.overdueOnDay).toHaveLength(0)
      expect(r.inProgressOnDay).toHaveLength(0)
    })

    it('3분류가 동시에 존재하는 경우 각각 올바르게 분류', () => {
      const today = '2026-04-03'
      const dk = '2026-03-15'
      const tasks = [
        // inProgressOnDay: deadline >= today (미래 마감)
        baseTask({
          id: 'ip',
          startDate: '2026-03-10T12:00:00.000Z',
          deadline: '2026-06-30T12:00:00.000Z',
          completed: false,
        }),
        // overdueOnDay: 선택일=마감일, deadline < today
        baseTask({ id: 'ov', deadline: '2026-03-15T12:00:00.000Z', completed: false }),
        // completedOnDay: 완료
        baseTask({ id: 'done', deadline: '2026-03-15T12:00:00.000Z', completed: true }),
      ]
      const r = computeDailyFeedback(tasks, dk, today)
      expect(r.inProgressOnDay.map((t) => t.id)).toContain('ip')
      expect(r.overdueOnDay.map((t) => t.id)).toContain('ov')
      expect(r.completedOnDay.map((t) => t.id)).toContain('done')
    })
  })

  describe('shouldShowDailyPraise', () => {
    it('해당일 마감 업무가 모두 완료이고 미완료가 없으면 true', () => {
      const iso = '2026-06-15T12:00:00.000Z'
      const dk = isoToLocalDateKey(iso)!
      const tasks = [
        baseTask({ id: 'a', deadline: iso, completed: true }),
        baseTask({ id: 'b', deadline: iso, completed: true }),
      ]
      expect(shouldShowDailyPraise(tasks, dk)).toBe(true)
    })

    it('해당일 마감 업무가 없으면 false', () => {
      const tasks = [baseTask({ id: 'a', deadline: '2026-07-01T12:00:00.000Z' })]
      const dk = isoToLocalDateKey('2026-06-15T12:00:00.000Z')!
      expect(shouldShowDailyPraise(tasks, dk)).toBe(false)
    })

    it('해당일 마감 업무 중 미완료가 있으면 false', () => {
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

    it('주에 마감일이 있는 미완료 → incompleteInWeek', () => {
      const tasks = [baseTask({ id: 'w', deadline: '2026-06-10T12:00:00.000Z' })]
      const r = computeWeeklyFeedback(tasks, weekStart, weekEnd)
      expect(r.incompleteInWeek).toHaveLength(1)
      expect(r.incompleteInWeek[0].id).toBe('w')
      expect(r.completedInWeek).toHaveLength(0)
    })

    it('주에 마감일이 있는 완료 → completedInWeek', () => {
      const tasks = [
        baseTask({ id: 'done', deadline: '2026-06-10T12:00:00.000Z', completed: true }),
      ]
      const r = computeWeeklyFeedback(tasks, weekStart, weekEnd)
      expect(r.completedInWeek).toHaveLength(1)
      expect(r.completedInWeek[0].id).toBe('done')
      expect(r.incompleteInWeek).toHaveLength(0)
    })

    it('주와 겹치지 않는 과거 마감 → 두 배열 모두 비어있음', () => {
      const tasks = [baseTask({ id: 'c', deadline: '1999-01-01T00:00:00.000Z' })]
      const r = computeWeeklyFeedback(tasks, weekStart, weekEnd)
      expect(r.incompleteInWeek).toHaveLength(0)
      expect(r.completedInWeek).toHaveLength(0)
    })

    it('스팬이 주에 걸치면 포함, 중복 없음', () => {
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

    it('완료와 미완료 혼재', () => {
      const tasks = [
        baseTask({ id: 'done', deadline: '2026-06-10T12:00:00.000Z', completed: true }),
        baseTask({ id: 'todo', deadline: '2026-06-12T12:00:00.000Z', completed: false }),
      ]
      const r = computeWeeklyFeedback(tasks, weekStart, weekEnd)
      expect(r.completedInWeek).toHaveLength(1)
      expect(r.incompleteInWeek).toHaveLength(1)
    })
  })

  describe('shouldShowWeeklyPraise', () => {
    const weekStart = '2026-06-08'
    const weekEnd = '2026-06-14'

    it('금주 마감 업무가 모두 완료이면 true', () => {
      const tasks = [
        baseTask({ id: 'a', deadline: '2026-06-10T12:00:00.000Z', completed: true }),
      ]
      expect(shouldShowWeeklyPraise(tasks, weekStart, weekEnd)).toBe(true)
    })

    it('금주 마감 업무가 없으면 false', () => {
      const tasks = [baseTask({ id: 'a', deadline: '2026-08-01T12:00:00.000Z' })]
      expect(shouldShowWeeklyPraise(tasks, weekStart, weekEnd)).toBe(false)
    })

    it('금주 미완료가 있으면 false', () => {
      const tasks = [baseTask({ id: 'a', deadline: '2026-06-10T12:00:00.000Z' })]
      expect(shouldShowWeeklyPraise(tasks, weekStart, weekEnd)).toBe(false)
    })

    it('주에 겹치지 않는 미완료는 무시 → true', () => {
      const tasks = [
        baseTask({ id: 'done', deadline: '2026-06-10T12:00:00.000Z', completed: true }),
        baseTask({ id: 'old', deadline: '1999-01-01T00:00:00.000Z' }),
      ]
      expect(shouldShowWeeklyPraise(tasks, weekStart, weekEnd)).toBe(true)
    })

    it('주에 겹치는 미완료 스팬이 있으면 false', () => {
      const tasks = [
        baseTask({ id: 'done', deadline: '2026-06-10T12:00:00.000Z', completed: true }),
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
    it('pickDailyPraiseMessage — 같은 키에 대해 안정적인 문자열 반환', () => {
      expect(pickDailyPraiseMessage('2026-06-15')).toBe(pickDailyPraiseMessage('2026-06-15'))
    })

    it('pickWeeklyPraiseMessage — 같은 범위에 대해 안정적인 문자열 반환', () => {
      expect(pickWeeklyPraiseMessage('2026-06-08', '2026-06-14')).toBe(
        pickWeeklyPraiseMessage('2026-06-08', '2026-06-14')
      )
    })

    it('pickDailyAllClearMessage — 같은 키에 대해 안정적인 문자열 반환', () => {
      expect(pickDailyAllClearMessage('2026-06-15')).toBe(pickDailyAllClearMessage('2026-06-15'))
    })

    it('pickWeeklyAllClearMessage — 같은 범위에 대해 안정적인 문자열 반환', () => {
      expect(pickWeeklyAllClearMessage('2026-06-08', '2026-06-14')).toBe(
        pickWeeklyAllClearMessage('2026-06-08', '2026-06-14')
      )
    })
  })

  describe('getTasksWithDeadlineOnDate', () => {
    it('완료·미완료 모두 포함', () => {
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
    it('선택일에 보이는 완료 업무만 카운트', () => {
      const iso = '2026-06-15T12:00:00.000Z'
      const dk = isoToLocalDateKey(iso)!
      const tasks = [
        baseTask({ id: 'a', deadline: iso, completed: true }),
        baseTask({ id: 'b', deadline: iso, completed: false }),
        baseTask({ id: 'c', deadline: '2026-06-16T12:00:00.000Z', completed: true }),
      ]
      expect(countCompletedOnSelectedDay(tasks, dk)).toBe(1)
    })

    it('computeDailyFeedback.completedOnDay.length와 일치', () => {
      const iso = '2026-06-15T12:00:00.000Z'
      const dk = isoToLocalDateKey(iso)!
      const tasks = [
        baseTask({ id: 'a', deadline: iso, completed: true }),
        baseTask({ id: 'b', deadline: iso, completed: true }),
      ]
      const r = computeDailyFeedback(tasks, dk)
      expect(countCompletedOnSelectedDay(tasks, dk)).toBe(r.completedOnDay.length)
    })
  })

  describe('countCompletedOverlappingWeek', () => {
    const weekStart = '2026-06-08'
    const weekEnd = '2026-06-14'

    it('주와 겹치는 완료 업무만 카운트', () => {
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

    it('computeWeeklyFeedback.completedInWeek.length와 일치', () => {
      const tasks = [
        baseTask({ id: 'a', deadline: '2026-06-10T12:00:00.000Z', completed: true }),
        baseTask({ id: 'b', deadline: '2026-06-12T12:00:00.000Z', completed: true }),
      ]
      const r = computeWeeklyFeedback(tasks, weekStart, weekEnd)
      expect(countCompletedOverlappingWeek(tasks, weekStart, weekEnd)).toBe(r.completedInWeek.length)
    })
  })
})
