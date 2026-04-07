import type { Task } from '@/types/task'
import { isoToLocalDateKey, getTodayLocalDateKey, parseLocalDateKey } from '@/utils/task-calendar'

export interface DailyStatPoint {
  dateKey: string
  day: number
  completed: number
  overdue: number
  incomplete: number
}

export interface MonthlyReportResult {
  dailyStats: DailyStatPoint[]
  completedTasks: Task[]
  overdueTasks: Task[]
  incompleteTasks: Task[]
  totalCount: number
  /** (기한초과 + 미완료) / 전체. totalCount === 0 이면 0 */
  problemRate: number
}

/** 월 집계용 대표 날짜: deadline → startDate → createdAt 순 */
function getTaskMonthDateKey(task: Task): string | null {
  if (task.deadline) return isoToLocalDateKey(task.deadline)
  if (task.startDate) return isoToLocalDateKey(task.startDate)
  if (task.createdAt) return isoToLocalDateKey(task.createdAt)
  return null
}

function taskBelongsToMonth(task: Task, year: number, month: number): boolean {
  const key = getTaskMonthDateKey(task)
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

export function computeMonthlyReport(
  tasks: Task[],
  year: number,
  month: number,
  todayKey: string = getTodayLocalDateKey()
): MonthlyReportResult {
  const monthTasks = tasks.filter((t) => taskBelongsToMonth(t, year, month))

  const completedTasks = monthTasks.filter((t) => t.completed)
  const overdueTasks = monthTasks.filter((t) => isOverdue(t, todayKey))
  const incompleteTasks = monthTasks.filter((t) => isIncomplete(t, todayKey))

  const totalCount = monthTasks.length
  const problemRate =
    totalCount > 0 ? (overdueTasks.length + incompleteTasks.length) / totalCount : 0

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dailyStats: DailyStatPoint[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    const dateKey = `${year}-${m}-${d}`

    const dayTasks = monthTasks.filter((t) => getTaskMonthDateKey(t) === dateKey)

    dailyStats.push({
      dateKey,
      day,
      completed: dayTasks.filter((t) => t.completed).length,
      overdue: dayTasks.filter((t) => isOverdue(t, todayKey)).length,
      incomplete: dayTasks.filter((t) => isIncomplete(t, todayKey)).length,
    })
  }

  return { dailyStats, completedTasks, overdueTasks, incompleteTasks, totalCount, problemRate }
}
