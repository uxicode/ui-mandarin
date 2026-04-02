import type { Task } from '@/types/task'
import {
  getTaskSpanDateKeys,
  isoToLocalDateKey,
  resolveTaskCalendarDateKey,
  taskHasDateOnCalendar,
} from '@/utils/task-calendar'

/** TaskList와 동일 기준 — 선택일에 보이는 미완료만 */
export interface DailyFeedbackResult {
  incompleteOnDay: Task[]
}

/** 캘린더상 해당 주(월~일)와 일정이 겹치는 미완료만 — 일정이 주에 걸치지 않으면 주간 건수에 넣지 않음 */
export interface WeeklyFeedbackResult {
  incompleteInWeek: Task[]
}

const DAILY_PRAISE_POOL = [
  '오늘 마감인 업무를 모두 처리했어요. 잘 지키고 있어요!',
  '마감 일정을 지켰어요. 꾸준함이 멋져요!',
  '오늘도 약속한 일을 끝냈어요. 훌륭해요!',
  '계획대로 진행 중이에요. 이대로 가요!',
] as const

const WEEKLY_PRAISE_POOL = [
  '이번 주 마감 일정을 모두 맞췄어요. 훌륭해요!',
  '한 주 동안 일정을 잘 지켰어요. 대단해요!',
  '금주 마감을 모두 처리했어요. 리듬이 좋아요!',
  '우선순위를 잘 지키고 있어요. 칭찬 릴레이 이어가요!',
] as const

/** 당일 기준 미완료 0건(경고·기타 없음)일 때 — 마감 일정 칭찬과 구분 */
const DAILY_ALL_CLEAR_POOL = [
  '선택일 기준 미완료가 없어요. 참 잘했어요!',
  '처리할 미완료가 없어요. 훌륭해요!',
  '오늘도 빈틈 없이 정리됐어요. 잘하고 있어요!',
  '밀린 일 없이 가볍게 지나가요. 멋져요!',
] as const

const WEEKLY_ALL_CLEAR_POOL = [
  '금주 기준 미완료가 없어요. 참 잘했어요!',
  '이번 주도 빈틈 없이 정리됐어요. 대단해요!',
  '주간 일정이 깔끔해요. 계속 이어가요!',
  '밀림 없이 한 주를 마무리했어요. 훌륭해요!',
] as const

function hashPick(key: string, length: number): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return length > 0 ? h % length : 0
}

export function pickDailyPraiseMessage(dateKey: string): string {
  return DAILY_PRAISE_POOL[hashPick(`${dateKey}:daily`, DAILY_PRAISE_POOL.length)]!
}

export function pickWeeklyPraiseMessage(weekStartKey: string, weekEndKey: string): string {
  const k = `${weekStartKey}:${weekEndKey}:weekly`
  return WEEKLY_PRAISE_POOL[hashPick(k, WEEKLY_PRAISE_POOL.length)]!
}

export function pickDailyAllClearMessage(dateKey: string): string {
  return DAILY_ALL_CLEAR_POOL[hashPick(`${dateKey}:daily-all-clear`, DAILY_ALL_CLEAR_POOL.length)]!
}

export function pickWeeklyAllClearMessage(weekStartKey: string, weekEndKey: string): string {
  const k = `${weekStartKey}:${weekEndKey}:weekly-all-clear`
  return WEEKLY_ALL_CLEAR_POOL[hashPick(k, WEEKLY_ALL_CLEAR_POOL.length)]!
}

/** 마감일(로컬)이 해당 날짜인 업무 */
export function getTasksWithDeadlineOnDate(tasks: Task[], dateKey: string): Task[] {
  return tasks.filter((t) => {
    if (!t.deadline) return false
    return isoToLocalDateKey(t.deadline) === dateKey
  })
}

/** TaskList `taskMatchesDayFilter`와 동일한 기준(선택일이 있을 때) */
export function taskMatchesSelectedDay(task: Task, dateKey: string): boolean {
  if (taskHasDateOnCalendar(task, dateKey)) return true
  if (getTaskSpanDateKeys(task).length === 0) {
    return resolveTaskCalendarDateKey(task) === dateKey
  }
  return false
}

export function taskOverlapsWeek(task: Task, weekStartKey: string, weekEndKey: string): boolean {
  const keys = getTaskSpanDateKeys(task)
  if (keys.length === 0) {
    const r = resolveTaskCalendarDateKey(task)
    return r >= weekStartKey && r <= weekEndKey
  }
  return keys.some((k) => k >= weekStartKey && k <= weekEndKey)
}

/** 선택일 필터에 해당하는 완료 업무 수 */
export function countCompletedOnSelectedDay(tasks: Task[], dateKey: string): number {
  return tasks.filter((t) => t.completed && taskMatchesSelectedDay(t, dateKey)).length
}

/** 금주와 일정이 겹치는 완료 업무 수 */
export function countCompletedOverlappingWeek(
  tasks: Task[],
  weekStartKey: string,
  weekEndKey: string
): number {
  return tasks.filter((t) => t.completed && taskOverlapsWeek(t, weekStartKey, weekEndKey)).length
}

export function computeDailyFeedback(tasks: Task[], dateKey: string): DailyFeedbackResult {
  const incompleteOnDay = tasks.filter((t) => !t.completed && taskMatchesSelectedDay(t, dateKey))
  return { incompleteOnDay }
}

/** 일간 칭찬: 해당일 마감인 업무가 하나라도 있고 모두 완료이며, 그날 보이는 미완료 없음 */
export function shouldShowDailyPraise(tasks: Task[], dateKey: string): boolean {
  const withDeadlineOnDate = getTasksWithDeadlineOnDate(tasks, dateKey)
  if (withDeadlineOnDate.length === 0) return false
  if (!withDeadlineOnDate.every((t) => t.completed)) return false
  const { incompleteOnDay } = computeDailyFeedback(tasks, dateKey)
  return incompleteOnDay.length === 0
}

export function computeWeeklyFeedback(
  tasks: Task[],
  weekStartKey: string,
  weekEndKey: string
): WeeklyFeedbackResult {
  const incompleteInWeek = tasks.filter(
    (t) => !t.completed && taskOverlapsWeek(t, weekStartKey, weekEndKey)
  )
  return { incompleteInWeek }
}

/** 주간 칭찬: 금주에 마감이 있는 업무가 있고, 금주 미완료가 없음 */
export function shouldShowWeeklyPraise(
  tasks: Task[],
  weekStartKey: string,
  weekEndKey: string
): boolean {
  const hadDeadlineInWeek = tasks.some((t) => {
    if (!t.deadline) return false
    const k = isoToLocalDateKey(t.deadline)
    return k !== null && k >= weekStartKey && k <= weekEndKey
  })
  if (!hadDeadlineInWeek) return false
  const { incompleteInWeek } = computeWeeklyFeedback(tasks, weekStartKey, weekEndKey)
  return incompleteInWeek.length === 0
}
