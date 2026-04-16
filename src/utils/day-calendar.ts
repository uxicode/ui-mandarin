import type { Task } from '@/types/task'
import {
  isoToLocalDateKey,
  parseLocalDateKey,
  taskHasDateOnCalendar,
  resolveTaskCalendarDateKey,
} from '@/utils/task-calendar'

export const DEFAULT_SLOT_MINUTES = 30
export const DEFAULT_NEW_TASK_DURATION_MS = 60 * 60 * 1000

export function startOfLocalDay(dateKey: string): Date {
  const d = parseLocalDateKey(dateKey)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfLocalDay(dateKey: string): Date {
  const d = startOfLocalDay(dateKey)
  d.setDate(d.getDate() + 1)
  return d
}

/**
 * Y offset inside the day column (px) -> minutes from local midnight (0..1440).
 */
export function minutesFromDayStartFromY(
  offsetY: number,
  contentHeight: number,
  totalMinutes: number
): number {
  if (contentHeight <= 0) return 0
  const clamped = Math.max(0, Math.min(offsetY, contentHeight))
  return Math.floor((clamped / contentHeight) * totalMinutes)
}

export function snapMinutesToSlot(minutesFromMidnight: number, slotMinutes: number): number {
  if (slotMinutes <= 0) return minutesFromMidnight
  const snapped = Math.floor(minutesFromMidnight / slotMinutes) * slotMinutes
  return Math.min(Math.max(0, snapped), 24 * 60 - slotMinutes)
}

export function localDayMinutesToIso(dateKey: string, minutesFromMidnight: number): string {
  const d = startOfLocalDay(dateKey)
  d.setMinutes(d.getMinutes() + minutesFromMidnight)
  return d.toISOString()
}

export function addMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString()
}

export interface DayBlockLayout {
  topPx: number
  heightPx: number
}

export function layoutTaskBlockForDay(
  task: Task,
  dateKey: string,
  contentHeight: number,
  totalMinutes: number
): DayBlockLayout | null {
  if (!taskHasDateOnCalendar(task, dateKey)) return null

  const day0 = startOfLocalDay(dateKey).getTime()
  const day1 = endOfLocalDay(dateKey).getTime()

  let startMs: number | null = task.startDate ? new Date(task.startDate).getTime() : null
  let endMs: number | null = task.deadline ? new Date(task.deadline).getTime() : null

  if (startMs !== null && Number.isNaN(startMs)) startMs = null
  if (endMs !== null && Number.isNaN(endMs)) endMs = null

  if (startMs === null && endMs === null) return null

  if (startMs === null && endMs !== null) {
    startMs = endMs - DEFAULT_NEW_TASK_DURATION_MS
  }

  if (endMs === null && startMs !== null) {
    endMs = startMs + DEFAULT_NEW_TASK_DURATION_MS
  }

  const visStart = Math.max(startMs!, day0)
  const visEnd = Math.min(endMs!, day1)
  if (visEnd <= visStart) return null

  const topMin = (visStart - day0) / 60000
  const durMin = (visEnd - visStart) / 60000
  const topPx = (topMin / totalMinutes) * contentHeight
  const heightPx = Math.max((durMin / totalMinutes) * contentHeight, 4)
  return { topPx, heightPx }
}

/**
 * 시작·종료가 dateKey 로컬일 [00:00, 다음날 00:00] 구간에 모두 있을 때만
 * 자정 기준 분(startMin, endMin)으로 일간 그리드에서 수직 이동·저장할 수 있다.
 */
export function getTaskMinutesIfFullyOnLocalDay(
  task: Task,
  dateKey: string
): { startMin: number; endMin: number } | null {
  if (!taskHasDateOnCalendar(task, dateKey)) return null

  const day0 = startOfLocalDay(dateKey).getTime()
  const day1 = endOfLocalDay(dateKey).getTime()

  let startMs: number | null = task.startDate ? new Date(task.startDate).getTime() : null
  let endMs: number | null = task.deadline ? new Date(task.deadline).getTime() : null

  if (startMs !== null && Number.isNaN(startMs)) startMs = null
  if (endMs !== null && Number.isNaN(endMs)) endMs = null

  if (startMs === null && endMs === null) return null

  if (startMs === null && endMs !== null) {
    startMs = endMs - DEFAULT_NEW_TASK_DURATION_MS
  }

  if (endMs === null && startMs !== null) {
    endMs = startMs + DEFAULT_NEW_TASK_DURATION_MS
  }

  if (!(startMs! >= day0 && endMs! <= day1)) return null

  return {
    startMin: (startMs! - day0) / 60000,
    endMin: (endMs! - day0) / 60000,
  }
}

export function taskShowsOnDayGrid(task: Task, dateKey: string): boolean {
  if (taskHasDateOnCalendar(task, dateKey)) {
    return !!(task.startDate || task.deadline)
  }
  const hasSchedule = !!(task.startDate || task.deadline)
  if (hasSchedule) return false
  return resolveTaskCalendarDateKey(task) === dateKey
}

export function formatTimeLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export function formatTimeRangeLabel(startIso: string, endIso: string): string {
  return `${formatTimeLabel(startIso)} – ${formatTimeLabel(endIso)}`
}

/** `startMin` / `endMin` = minutes from local midnight; `endMin` is exclusive end (start of minute after block). */
export function layoutFromMinuteRange(
  startMin: number,
  endMin: number,
  contentHeight: number,
  totalMinutes: number,
  minDurationMinutes = 1
): DayBlockLayout {
  const dur = Math.max(endMin - startMin, minDurationMinutes)
  const topPx = (startMin / totalMinutes) * contentHeight
  const heightPx = Math.max((dur / totalMinutes) * contentHeight, 8)
  return { topPx, heightPx }
}

export function formatDayNavLabel(dateKey: string): string {
  const d = parseLocalDateKey(dateKey)
  const w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()}(${w})`
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = parseLocalDateKey(dateKey)
  d.setDate(d.getDate() + deltaDays)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

export function isSameLocalDateKey(iso: string | undefined, dateKey: string): boolean {
  if (!iso) return false
  return isoToLocalDateKey(iso) === dateKey
}
