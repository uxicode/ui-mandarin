import type { Task } from '@/types/task'
import { isoToLocalDateKey, getTodayLocalDateKey, parseLocalDateKey } from '@/utils/task-calendar'

export interface MonthlyStatPoint {
  month: number   // 1~12
  label: string   // '1월' ~ '12월'
  completed: number
  overdue: number
  incomplete: number
}

export interface AnnualReportResult {
  monthlyStats: MonthlyStatPoint[]
  completedTasks: Task[]
  overdueTasks: Task[]
  incompleteTasks: Task[]
  totalCount: number
  /** (기한초과 + 미완료) / 전체. totalCount === 0 이면 0 */
  problemRate: number
}

/** 연간 집계용 대표 날짜: deadline → startDate → createdAt 순 */
function getTaskDateKey(task: Task): string | null {
  if (task.deadline) return isoToLocalDateKey(task.deadline)
  if (task.startDate) return isoToLocalDateKey(task.startDate)
  if (task.createdAt) return isoToLocalDateKey(task.createdAt)
  return null
}

function taskBelongsToYear(task: Task, year: number): boolean {
  const key = getTaskDateKey(task)
  if (!key) return false
  return parseLocalDateKey(key).getFullYear() === year
}

function taskBelongsToMonth(task: Task, year: number, month: number): boolean {
  const key = getTaskDateKey(task)
  if (!key) return false
  const d = parseLocalDateKey(key)
  return d.getFullYear() === year && d.getMonth() === month
}

function isOverdue(task: Task, todayKey: string): boolean {
  if (task.completed) return false
  if (!task.deadline) return false
  const dk = isoToLocalDateKey(task.deadline)
  return dk !== null && dk < todayKey
}

function isIncomplete(task: Task, todayKey: string): boolean {
  if (task.completed) return false
  if (!task.deadline) return true
  const dk = isoToLocalDateKey(task.deadline)
  return dk === null || dk >= todayKey
}

export function computeAnnualReport(
  tasks: Task[],
  year: number,
  todayKey: string = getTodayLocalDateKey()
): AnnualReportResult {
  const yearTasks = tasks.filter((t) => taskBelongsToYear(t, year))

  const completedTasks = yearTasks.filter((t) => t.completed)
  const overdueTasks = yearTasks.filter((t) => isOverdue(t, todayKey))
  const incompleteTasks = yearTasks.filter((t) => isIncomplete(t, todayKey))

  const totalCount = yearTasks.length
  const problemRate =
    totalCount > 0 ? (overdueTasks.length + incompleteTasks.length) / totalCount : 0

  const monthlyStats: MonthlyStatPoint[] = Array.from({ length: 12 }, (_, i) => {
    const monthTasks = yearTasks.filter((t) => taskBelongsToMonth(t, year, i))
    return {
      month: i + 1,
      label: `${i + 1}월`,
      completed: monthTasks.filter((t) => t.completed).length,
      overdue: monthTasks.filter((t) => isOverdue(t, todayKey)).length,
      incomplete: monthTasks.filter((t) => isIncomplete(t, todayKey)).length,
    }
  })

  return { monthlyStats, completedTasks, overdueTasks, incompleteTasks, totalCount, problemRate }
}
